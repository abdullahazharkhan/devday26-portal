export interface ExtractedPaymentProof {
    amount: string | null
    referenceNumber: string | null
    paymentDate: string | null
    confidence: number
    summary: string
    rawText: string
}

type OcrWorker = {
    recognize: (image: string) => Promise<{
        data?: {
            text?: string
            confidence?: number
        }
    }>
}

const MONTH_PATTERN = '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)'

let workerPromise: Promise<OcrWorker> | null = null

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max)
}

/**
 * Preprocess an image for better OCR accuracy on mobile payment screenshots.
 *
 * Steps:
 *  1. Upscale so the long edge is ≥ 1 400 px (gives Tesseract sharper glyphs).
 *  2. Convert to grayscale with luminance weights.
 *  3. Stretch contrast via 2 %–98 % percentile mapping.
 *  4. Sample the image border; if the background is dark (e.g. JazzCash pink,
 *     EasyPaisa green) invert so text becomes dark-on-light before OCR.
 *
 * Falls back to the original URL on any error or in non-browser environments.
 */
async function preprocessImage(imageSource: string): Promise<string> {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return imageSource
    }
    return new Promise<string>((resolve) => {
        const img = new window.Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
            try {
                const nw = img.naturalWidth  || img.width
                const nh = img.naturalHeight || img.height
                if (!nw || !nh) { resolve(imageSource); return }

                // 1 ─ Upscale small images
                const MIN_LONG_EDGE = 1400
                const longEdge = Math.max(nw, nh)
                const scale    = longEdge < MIN_LONG_EDGE ? MIN_LONG_EDGE / longEdge : 1
                const w = Math.round(nw * scale)
                const h = Math.round(nh * scale)

                const canvas = document.createElement('canvas')
                canvas.width  = w
                canvas.height = h
                const ctx = canvas.getContext('2d')
                if (!ctx) { resolve(imageSource); return }

                ctx.imageSmoothingEnabled = true
                ctx.imageSmoothingQuality = 'high'
                ctx.drawImage(img, 0, 0, w, h)

                const imgData = ctx.getImageData(0, 0, w, h)
                const d       = imgData.data
                const pixels  = w * h

                // 2 ─ Grayscale (luminance)
                const lum = new Uint8Array(pixels)
                for (let i = 0; i < pixels; i++) {
                    const p = i * 4
                    lum[i] = Math.round(0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2])
                }

                // 3 ─ Contrast stretching (2 %–98 % percentile)
                const hist = new Uint32Array(256)
                for (let i = 0; i < pixels; i++) hist[lum[i]]++
                let lo = 0, hi = 255, cum = 0
                const p2 = pixels * 0.02, p98 = pixels * 0.98
                for (let v = 0; v < 256; v++) {
                    cum += hist[v]
                    if (cum <= p2)  lo = v
                    if (cum <= p98) hi = v
                }
                const range = Math.max(1, hi - lo)

                // 4 ─ Auto-invert detection: sample a thin border strip
                const BORDER = Math.max(2, Math.round(Math.min(w, h) * 0.04))
                let borderSum = 0, borderCount = 0
                for (let x = 0; x < w; x++) {
                    for (let y = 0; y < BORDER; y++)         { borderSum += lum[y * w + x]; borderCount++ }
                    for (let y = h - BORDER; y < h; y++)     { borderSum += lum[y * w + x]; borderCount++ }
                }
                for (let y = BORDER; y < h - BORDER; y++) {
                    for (let x = 0; x < BORDER; x++)         { borderSum += lum[y * w + x]; borderCount++ }
                    for (let x = w - BORDER; x < w; x++)     { borderSum += lum[y * w + x]; borderCount++ }
                }
                const avgBorder   = borderSum / borderCount
                const shouldInvert = avgBorder < 110  // dark border ⟹ light-on-dark screenshot

                // 5 ─ Write normalised + (optionally inverted) grayscale pixels
                for (let i = 0; i < pixels; i++) {
                    let v = Math.round(((lum[i] - lo) / range) * 255)
                    v = Math.max(0, Math.min(255, v))
                    if (shouldInvert) v = 255 - v
                    const p = i * 4
                    d[p] = d[p + 1] = d[p + 2] = v
                    // alpha unchanged
                }

                ctx.putImageData(imgData, 0, 0)
                resolve(canvas.toDataURL('image/png'))
            } catch {
                resolve(imageSource)   // graceful fallback
            }
        }
        img.onerror = () => resolve(imageSource)
        img.src = imageSource
    })
}

async function getWorker(): Promise<OcrWorker> {
    if (!workerPromise) {
        workerPromise = (async () => {
            const { createWorker } = await import('tesseract.js')
            const worker = await createWorker('eng')
            // preserve_interword_spaces helps Tesseract keep word spacing that
            // separates amounts / references from surrounding text.
            try {
                await (worker as any).setParameters?.({ preserve_interword_spaces: '1' }) // eslint-disable-line @typescript-eslint/no-explicit-any
            } catch { /* older Tesseract versions may not support this */ }
            return worker as OcrWorker
        })()
    }
    return workerPromise
}

function normalizeRawText(text: string): string {
    return text
        .replace(/\r/g, '\n')
        .replace(/[\t\f\v]+/g, ' ')
        .replace(/ +/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
}

function parseAmountToken(input: string): string | null {
    const cleaned = input.replace(/[^\d.,]/g, '').replace(/,/g, '')
    if (!cleaned) return null

    const amount = Number(cleaned)
    if (!Number.isFinite(amount) || amount <= 0) return null

    const hasDecimal = cleaned.includes('.')
    return amount.toLocaleString('en-PK', {
        minimumFractionDigits: hasDecimal ? 2 : 0,
        maximumFractionDigits: 2,
    })
}

function extractAmount(text: string, lines: string[]): string | null {
    const candidates: { value: string; score: number }[] = []

    const pushCandidate = (value: string | null, score: number) => {
        if (!value) return
        candidates.push({ value, score })
    }

    const amountPatterns: Array<{ regex: RegExp; score: number }> = [
        // Keyword + amount: "Amount: Rs. 1,500", "Total Amount 1500.00", "You sent Rs 500"
        {
            regex: /(?:amount\s*(?:sent|paid|transferred)?|total\s*(?:amount|bill)?|you\s*(?:sent|paid|transferred)|transfer(?:red)?(?:\s*of)?|bill\s*amount)\s*[:\-]?\s*(?:rs\.?|pkr)?\s*([0-9]{1,3}(?:[,\s][0-9]{3})*(?:\.\d{1,2})?)/gi,
            score: 1,
        },
        // Currency prefix: "Rs. 1,500", "Rs1500", "PKR 1,500"
        {
            regex: /(?:rs\.?|pkr)\s*[:\-]?\s*([0-9]{1,3}(?:[,\s][0-9]{3})*(?:\.\d{1,2})?)/gi,
            score: 0.9,
        },
        // Currency suffix: "1,500 Rs", "1500 PKR"
        {
            regex: /([0-9]{1,3}(?:[,\s][0-9]{3})*(?:\.\d{1,2})?)\s*(?:rs\.?|pkr)/gi,
            score: 0.8,
        },
        // Comma-grouped numbers (e.g. "1,500" or "10,000") near lines with amount/total keywords — lower priority
        {
            regex: /\b([1-9][0-9]{2,3}(?:,[0-9]{3})+(?:\.[0-9]{1,2})?)\b/g,
            score: 0.45,
        },
    ]

    for (const { regex, score } of amountPatterns) {
        for (const match of text.matchAll(regex)) {
            pushCandidate(parseAmountToken(match[1] ?? ''), score)
        }
    }

    for (const line of lines) {
        const lower = line.toLowerCase()
        if (!/(amount|total|rs|pkr)/.test(lower)) continue

        const near = line.match(/([0-9]{1,3}(?:[\s,][0-9]{3})*(?:\.\d{1,2})?)/)
        pushCandidate(parseAmountToken(near?.[1] ?? ''), 0.7)
    }

    if (candidates.length === 0) return null

    candidates.sort((a, b) => b.score - a.score)
    return candidates[0].value
}

function cleanReferenceToken(token: string): string | null {
    const value = token
        .trim()
        .replace(/^[:#\-\s]+/, '')
        .replace(/[.,;]+$/, '')

    if (value.length < 4) return null

    if (!/[a-z0-9]/i.test(value)) return null
    return value
}

function extractReference(text: string, lines: string[]): string | null {
    const explicitPatterns = [
        // Standard reference/transaction labels (covers JazzCash TID, bank TRN/RRN)
        /(?:reference\s*(?:number|no\.?|#|id)?|transaction\s*(?:id|number|no\.?|#)?|tid|trn|rrn|stan|traceno|trace\s*no)\s*[:#\-\s]?\s*([a-z0-9][a-z0-9\-_]{3,50})/i,
        // Raast transaction IDs (SadaPay, bank Raast transfers)
        /(?:raast(?:\s*(?:id|transaction\s*id|payment\s*id))?|raast\s*ref)\s*[:#\-\s]?\s*([a-z0-9][a-z0-9\-_]{3,50})/i,
        // Order / Payment ID (some apps use these labels)
        /(?:order\s*(?:id|#|number)|payment\s*(?:ref(?:erence)?|id))\s*[:#\-\s]?\s*([a-z0-9][a-z0-9\-_]{4,50})/i,
        // Long hex-style IDs (SHA-like transaction hashes)
        /\b([a-f0-9]{16,64})\b/i,
        // Long numeric transaction IDs (10-20 digits, common in IBFT / JazzCash)
        /\b([0-9]{10,20})\b/,
    ]

    for (const pattern of explicitPatterns) {
        const match = text.match(pattern)
        const value = cleanReferenceToken(match?.[1] ?? '')
        if (value) return value
    }

    for (let i = 0; i < lines.length; i++) {
        const lower = lines[i].toLowerCase()
        if (!/(reference|transaction|tid)/.test(lower)) continue

        const sameLine = cleanReferenceToken(
            lines[i].replace(/.*(?:reference|transaction|tid)[^a-z0-9]*/i, '')
        )
        if (sameLine) return sameLine

        const nextLine = cleanReferenceToken(lines[i + 1] ?? '')
        if (nextLine) return nextLine
    }

    return null
}

function parseDateString(input: string): Date | null {
    const cleaned = input
        .replace(/\|/g, ', ')
        .replace(/\s+/g, ' ')
        .trim()

    const direct = new Date(cleaned)
    if (!Number.isNaN(direct.getTime())) return direct

    const numeric = cleaned.match(
        /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})(?:[ ,]+(\d{1,2}):(\d{2})\s*(am|pm)?)?$/i
    )

    if (!numeric) return null

    let day = Number(numeric[1])
    let month = Number(numeric[2])
    let year = Number(numeric[3])

    if (year < 100) {
        year += 2000
    }

    let hour = Number(numeric[4] ?? '0')
    const minute = Number(numeric[5] ?? '0')
    const meridian = (numeric[6] ?? '').toLowerCase()

    if (meridian === 'pm' && hour < 12) hour += 12
    if (meridian === 'am' && hour === 12) hour = 0

    if (month > 12 && day <= 12) {
        const swap = month
        month = day
        day = swap
    }

    const parsed = new Date(year, month - 1, day, hour, minute)
    if (Number.isNaN(parsed.getTime())) return null

    return parsed
}

function formatDateForUi(date: Date): string {
    return date.toLocaleString('en-PK', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    })
}

function extractDate(text: string, lines: string[]): string | null {
    const datePatterns = [
        new RegExp(`\\b\\d{1,2}\\s+${MONTH_PATTERN}\\s+\\d{4}(?:[,\\s|]+\\d{1,2}:\\d{2}\\s*(?:am|pm)?)?`, 'ig'),
        new RegExp(`\\b${MONTH_PATTERN}\\s+\\d{1,2},?\\s+\\d{4}(?:[,\\s|]+\\d{1,2}:\\d{2}\\s*(?:am|pm)?)?`, 'ig'),
        /\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}(?:[,\s|]+\d{1,2}:\d{2}\s*(?:am|pm)?)?/ig,
    ]

    for (const regex of datePatterns) {
        for (const match of text.matchAll(regex)) {
            const parsed = parseDateString(match[0])
            if (parsed) return formatDateForUi(parsed)
        }
    }

    for (let i = 0; i < lines.length; i++) {
        const lower = lines[i].toLowerCase()
        if (!/(date|time|timestamp)/.test(lower)) continue

        const candidate = `${lines[i]} ${lines[i + 1] ?? ''}`.trim()
        const parsed = parseDateString(candidate)
        if (parsed) return formatDateForUi(parsed)

        const nextParsed = parseDateString(lines[i + 1] ?? '')
        if (nextParsed) return formatDateForUi(nextParsed)
    }

    return null
}

function createSummary(amount: string | null, referenceNumber: string | null, paymentDate: string | null): string {
    const parts: string[] = []

    if (amount) parts.push(`amount Rs. ${amount}`)
    if (referenceNumber) parts.push(`reference ${referenceNumber}`)
    if (paymentDate) parts.push(`date ${paymentDate}`)

    if (parts.length === 0) {
        return 'No reliable payment details were detected from this screenshot.'
    }

    return `Detected ${parts.join(', ')}.`
}

export function extractPaymentProofFromText(rawText: string, ocrConfidence = 0): ExtractedPaymentProof {
    const normalized = normalizeRawText(rawText)
    const lines = normalized
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)

    const amount = extractAmount(normalized, lines)
    const referenceNumber = extractReference(normalized, lines)
    const paymentDate = extractDate(normalized, lines)

    const fieldsFound = [amount, referenceNumber, paymentDate].filter(Boolean).length
    const parserConfidence = (fieldsFound / 3) * 100
    const confidence = Math.round(clamp((ocrConfidence * 0.65) + (parserConfidence * 0.35), 0, 100))

    return {
        amount,
        referenceNumber,
        paymentDate,
        confidence,
        summary: createSummary(amount, referenceNumber, paymentDate),
        rawText: normalized,
    }
}

export async function extractPaymentProofDetails(imageSource: string): Promise<ExtractedPaymentProof> {
    const worker      = await getWorker()
    // Run preprocessing first — improves OCR on coloured mobile screenshots
    const processed   = await preprocessImage(imageSource)
    const result      = await worker.recognize(processed)
    const text        = result.data?.text ?? ''
    const confidence  = result.data?.confidence ?? 0

    return extractPaymentProofFromText(text, confidence)
}
