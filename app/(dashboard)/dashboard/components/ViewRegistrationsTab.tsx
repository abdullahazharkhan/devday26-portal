'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import DataTable, { Column } from './DataTable'
import { extractPaymentProofDetails, type ExtractedPaymentProof } from '@/lib/paymentProofOcr'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────────

type PaymentStatus = 'PENDING_PAYMENT' | 'VERIFIED' | 'ONHOLD' | 'REJECTED'

interface Competition {
    id: string
    name: string
    compDay: string
    fee?: string
    minTeamSize?: number
    maxTeamSize?: number
}

interface SearchParticipant {
    id: string
    fullName: string
    email: string
    cnic: string
}

interface SearchCompetition {
    id: string
    name: string
}

interface SearchResult {
    participant: SearchParticipant
    competitions: SearchCompetition[]
}

interface RegistrationRow {
    id: string
    name: string
    referenceId: string
    paymentStatus: PaymentStatus
    paymentMethod: string | null
    competition: { id: string; name: string; compDay: string; fee: string }
    memberCount: number
    createdAt: string
}

interface RegistrationMember {
    id: string
    isLeader: boolean
    cardIssued: boolean
    cardIssuedAt: string | null
    joinedAt: string
    attendance: { status: boolean; method: string; markedAt: string } | null
    participant: {
        id: string
        fullName: string
        email: string
        cnic: string
        phone: string | null
        institution: string | null
    }
}

interface RegistrationDetail {
    id: string
    name: string
    referenceId: string
    paymentStatus: PaymentStatus
    paymentMethod: string | null
    paymentDate: string | null
    declaredTID: string | null
    amountPaid: string | null
    paymentProofUrl: string | null
    createdAt: string
    updatedAt: string
    competition: Competition
    note: string
    members: RegistrationMember[]
}

interface PaginationMeta {
    total: number
    page: number
    limit: number
    totalPages: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-PK', {
        day: '2-digit', month: 'short', year: 'numeric',
    })
}

function fmtDateTime(iso: string) {
    return new Date(iso).toLocaleString('en-PK', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    })
}

const STATUS_STYLES: Record<string, string> = {
    PENDING_PAYMENT: 'text-yellow-400 border-yellow-600 bg-yellow-500/10',
    VERIFIED:        'text-green-400  border-green-600  bg-green-500/10',
    REJECTED:        'text-red-400    border-red-600    bg-red-500/10',
}

const NOTE_PRESETS: Record<'ONHOLD' | 'REJECTED', string[]> = {
    ONHOLD: [
        'Payment amount is missing — no payment received.',
        'Amount paid is less than the required registration fee.',
        'Partial payment received — please pay the remaining balance.',
        'No payment proof submitted.',
    ],
    REJECTED: [
        'CNIC or contact details do not match the submitted proof.',
        'Invalid or unverifiable contact information provided.',
        'Team name is inappropriate or violates naming guidelines.',
        'Registration details contain incorrect or false information.',
    ],
}

function StatusBadge({ status }: { status: string }) {
    const cls = STATUS_STYLES[status] ?? 'text-[#C4C4C4] border-primaryred-muted'
    return (
        <span className={`text-[10px] tracking-widest border px-2 py-0.5 whitespace-nowrap ${cls}`}>
            {status.replace('_', ' ')}
        </span>
    )
}

function Skeleton({ className }: { className?: string }) {
    return <div className={`animate-pulse bg-[#3a2525] rounded-sm ${className ?? ''}`} />
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-[10px] tracking-widest text-primaryred">{label}</span>
            <span className="text-white text-xs tracking-wide">{value ?? '—'}</span>
        </div>
    )
}

// ─── Detail skeleton ──────────────────────────────────────────────────────────

function DetailSkeleton() {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
                <Skeleton className="h-9 w-24" />
                <div className="flex flex-col gap-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-3 w-32" />
                </div>
            </div>
            <div className="border border-primaryred-muted bg-[#271C1C] p-5 sm:p-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex flex-col gap-1.5">
                        <Skeleton className="h-2.5 w-20" />
                        <Skeleton className="h-4 w-36" />
                    </div>
                ))}
            </div>
            <div className="border border-primaryred-muted bg-[#271C1C] p-5 sm:p-8">
                <Skeleton className="h-4 w-28 mb-4" />
                <Skeleton className="h-32 w-full" />
            </div>
        </div>
    )
}
// ─── Registration detail panel ────────────────────────────────────────────────

function RegistrationDetailPanel({
    registrationId,
    onBack,
    onPrev,
    onNext,
}: {
    registrationId: string
    onBack: () => void
    /** Navigate to previous registration. undefined = at start of list. */
    onPrev: (() => void) | undefined
    /** Navigate to next registration. undefined = at end of list. */
    onNext: (() => void) | undefined
}) {
    const [detail, setDetail]     = useState<RegistrationDetail | null>(null)
    const [isLoading, setLoading] = useState(true)
    const [error, setError]       = useState<string | null>(null)

    const [isEditingPayment, setIsEditingPayment] = useState(false)
    const [paymentUpdateStatus, setPaymentUpdateStatus] = useState<PaymentStatus>('PENDING_PAYMENT')
    const [paymentUpdateNote, setPaymentUpdateNote] = useState('')
    const [isUpdatingPayment, setIsUpdatingPayment] = useState(false)
    const [isProofOpen, setIsProofOpen] = useState(false)
    const [imageLoaded, setImageLoaded] = useState(false)
    const [ocrResult, setOcrResult] = useState<ExtractedPaymentProof | null>(null)
    const [isRunningOcr, setIsRunningOcr] = useState(false)
    const [ocrError, setOcrError] = useState<string | null>(null)
    const [showRawOcrModal, setShowRawOcrModal] = useState(false)

    const runProofOcr = useCallback(async (paymentProofUrl: string) => {
        setIsRunningOcr(true)
        setOcrError(null)
        try {
            const result = await extractPaymentProofDetails(paymentProofUrl)
            setOcrResult(result)
        } catch (err) {
            console.error('[portal-payment-ocr] OCR failed:', err)
            setOcrError('OCR could not read this screenshot clearly. Please retry or review manually.')
        } finally {
            setIsRunningOcr(false)
        }
    }, [])

    useEffect(() => {
        setLoading(true)
        setError(null)
        setIsEditingPayment(false)
        setImageLoaded(false)
        setOcrResult(null)
        setIsRunningOcr(false)
        setOcrError(null)
        setShowRawOcrModal(false)
        fetch(`/api/registrations/${registrationId}`)
            .then((r) => r.json())
            .then((json) => {
                if (json.success) setDetail(json.data)
                else setError(json.message === 'Registration not found.' ? 'This registration no longer exists. It may have been deleted.' : json.message ?? 'Failed to load registration.')
            })
            .catch(() => setError('Could not reach the server.'))
            .finally(() => setLoading(false))
    }, [registrationId])

    useEffect(() => {
        if (!isProofOpen) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsProofOpen(false)
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [isProofOpen])

    useEffect(() => {
        if (!detail?.paymentProofUrl) return
        runProofOcr(detail.paymentProofUrl)
    }, [detail?.id, detail?.paymentProofUrl, runProofOcr])

    const memberColumns: Column<RegistrationMember>[] = [
        {
            key: 'participant.fullName',
            header: 'NAME',
            render: (m) => (
                <span className="flex items-center gap-2">
                    {m.participant.fullName}
                    {m.isLeader && (
                        <span className="text-[9px] tracking-widest text-primaryred border border-primaryred px-1.5 py-0.5">
                            LEADER
                        </span>
                    )}
                </span>
            ),
            minWidth: '10rem',
        },
        {
            key: 'participant.email',
            header: 'EMAIL',
            render: (m) => <span className="text-[#C4C4C4]">{m.participant.email}</span>,
            minWidth: '12rem',
        },
        {
            key: 'participant.cnic',
            header: 'CNIC',
            render: (m) => <span className="text-[#C4C4C4] tracking-widest">{m.participant.cnic}</span>,
            minWidth: '9rem',
        },
        {
            key: 'participant.phone',
            header: 'PHONE',
            render: (m) => <span className="text-[#C4C4C4]">{m.participant.phone ?? '—'}</span>,
            minWidth: '8rem',
        },
        {
            key: 'participant.institution',
            header: 'INSTITUTION',
            render: (m) => (
                <span className="text-[#C4C4C4] truncate max-w-40 block">
                    {m.participant.institution ?? '—'}
                </span>
            ),
            minWidth: '9rem',
        },
        {
            key: 'cardIssued',
            header: 'CARD',
            render: (m) => (
                <span className={`text-[10px] tracking-widest border px-2 py-0.5 ${
                    m.cardIssued
                        ? 'text-green-400 border-green-600 bg-green-500/10'
                        : 'text-[#C4C4C4] border-primaryred-muted'
                }`}>
                    {m.cardIssued ? 'ISSUED' : 'PENDING'}
                </span>
            ),
            minWidth: '6rem',
        },
        {
            key: 'attendance',
            header: 'ATTENDANCE',
            render: (m) => {
                if (!m.attendance) {
                    return (
                        <span className="text-[10px] tracking-widest border px-2 py-0.5 text-[#C4C4C4] border-primaryred-muted">
                            NOT_MARKED
                        </span>
                    )
                }
                return (
                    <span className={`text-[10px] tracking-widest border px-2 py-0.5 ${
                        m.attendance.status
                            ? 'text-green-400 border-green-600 bg-green-500/10'
                            : 'text-red-400 border-red-600 bg-red-500/10'
                    }`}>
                        {m.attendance.status ? 'PRESENT' : 'ABSENT'}
                    </span>
                )
            },
            minWidth: '7rem',
        },
    ]

    if (isLoading) return <DetailSkeleton />

    if (error) {
        return (
            <div className="flex flex-col gap-4">
                <button
                    onClick={onBack}
                    className="self-start text-xs tracking-widest text-primaryred border border-primaryred px-4 py-2 hover:bg-primaryred hover:text-white transition-colors duration-200"
                >
                    ← BACK
                </button>
                <div className="border border-red-500/40 bg-red-500/10 p-5 text-red-400 text-xs tracking-wide">
                    {error}
                </div>
            </div>
        )
    }

    if (!detail) return null

    return (
        <div className="flex flex-col gap-6">
            {/* Header with navigation */}
            <div className="flex flex-wrap items-center gap-3">
                <button
                    onClick={onBack}
                    className="text-xs tracking-widest text-primaryred border border-primaryred px-4 py-2 hover:bg-primaryred hover:text-white transition-colors duration-200 shrink-0"
                >
                    ← BACK
                </button>

                {/* Prev / Next navigation */}
                <div className="flex items-center gap-1.5 shrink-0">
                    <button
                        onClick={onPrev}
                        disabled={!onPrev}
                        className="text-xs tracking-widest text-primaryred border border-primaryred w-9 h-9 flex items-center justify-center hover:bg-primaryred hover:text-white transition-colors duration-200 disabled:opacity-25 disabled:cursor-not-allowed"
                        title="Previous registration"
                    >
                        ◀
                    </button>
                    <button
                        onClick={onNext}
                        disabled={!onNext}
                        className="text-xs tracking-widest text-primaryred border border-primaryred w-9 h-9 flex items-center justify-center hover:bg-primaryred hover:text-white transition-colors duration-200 disabled:opacity-25 disabled:cursor-not-allowed"
                        title="Next registration"
                    >
                        ▶
                    </button>
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-white font-bold tracking-widest text-base sm:text-lg">
                            {detail.name.toUpperCase()}
                        </h2>
                        <StatusBadge status={detail.paymentStatus} />
                    </div>
                    <p className="text-[#C4C4C4] text-xs tracking-widest mt-0.5">
                        REF: <span className="text-primaryred">{detail.referenceId}</span>
                        {' · '}{detail.competition.name}
                    </p>
                </div>
            </div>

            {/* ── LEFT: competition + payment + OCR  |  RIGHT: proof image only ── */}
            <div className="flex gap-6 xl:gap-8 items-start">

                {/* LEFT column */}
                <div className="flex flex-col gap-4 flex-1 min-w-0">

                    {/* Competition info — compact */}
                    <div className="border border-primaryred-muted bg-[#271C1C] p-4 sm:p-5 flex flex-col gap-3">
                        <h3 className="text-primaryred text-xs tracking-[0.2em] font-bold">COMPETITION</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-3">
                            <InfoRow label="NAME"      value={detail.competition.name} />
                            <InfoRow label="FEE"       value={detail.competition.fee ? `PKR ${detail.competition.fee}` : '—'} />
                            <InfoRow label="DATE"      value={detail.competition.compDay ? fmtDate(detail.competition.compDay) : '—'} />
                            <InfoRow label="TEAM_SIZE" value={
                                detail.competition.minTeamSize != null && detail.competition.maxTeamSize != null
                                    ? `${detail.competition.minTeamSize}–${detail.competition.maxTeamSize}`
                                    : `${detail.members.length} members`
                            } />
                            <InfoRow label="REGISTERED" value={fmtDateTime(detail.createdAt)} />
                        </div>
                        {/* Attendance summary */}
                        {(() => {
                            const marked  = detail.members.filter((m) => m.attendance !== null)
                            const present = detail.members.filter((m) => m.attendance?.status === true)
                            const total   = detail.members.length
                            if (marked.length === 0) {
                                return (
                                    <div className="flex items-center gap-2 pt-0.5">
                                        <span className="text-[10px] tracking-[0.2em] text-[#C4C4C4]">ATTENDANCE:</span>
                                        <span className="text-[10px] tracking-widest text-[#C4C4C4] border border-primaryred-muted px-2 py-0.5">
                                            NOT_MARKED
                                        </span>
                                    </div>
                                )
                            }
                            return (
                                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                                    <span className="text-[10px] tracking-[0.2em] text-[#C4C4C4]">ATTENDANCE:</span>
                                    <span className={`text-[10px] tracking-widest border px-2 py-0.5 ${
                                        present.length === total
                                            ? 'text-green-400 border-green-600 bg-green-500/10'
                                            : present.length === 0
                                                ? 'text-red-400 border-red-600 bg-red-500/10'
                                                : 'text-yellow-400 border-yellow-600 bg-yellow-500/10'
                                    }`}>
                                        {present.length}/{total} PRESENT
                                    </span>
                                </div>
                            )
                        })()}
                    </div>

                    {/* Payment info */}
                    <div className="border border-primaryred-muted bg-[#271C1C] p-4 sm:p-5 flex flex-col gap-4">
                        <h3 className="text-primaryred text-xs tracking-[0.2em] font-bold">PAYMENT</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-3">
                            <InfoRow label="STATUS"  value={<StatusBadge status={detail.paymentStatus} />} />
                            <InfoRow label="METHOD"  value={detail.paymentMethod ?? '—'} />
                            <InfoRow label="AMOUNT"  value={detail.amountPaid ? `PKR ${detail.amountPaid}` : '—'} />
                            <InfoRow label="TID"     value={detail.declaredTID ?? '—'} />
                            <InfoRow label="DATE"    value={detail.paymentDate ? fmtDate(detail.paymentDate) : '—'} />
                            <InfoRow label="UPDATED" value={fmtDateTime(detail.updatedAt)} />
                        </div>

                        {/* Payment update controls */}
                        <div className="flex gap-4 items-start pt-1">
                            {/* Button + floating status menu */}
                            <div className="relative shrink-0 flex flex-col gap-2">
                                {isEditingPayment && (
                                    <div className="absolute bottom-full left-0 mb-1 z-10 flex flex-col border border-primaryred bg-[#1a0f0f] min-w-[170px] shadow-lg">
                                        {(['PENDING_PAYMENT', 'VERIFIED', 'ONHOLD', 'REJECTED'] as PaymentStatus[]).map((s) => (
                                            <button
                                                key={s}
                                                type="button"
                                                onClick={() => setPaymentUpdateStatus(s)}
                                                className={`text-left px-4 py-2 text-xs tracking-widest transition-colors duration-150 ${
                                                    paymentUpdateStatus === s
                                                        ? 'bg-primaryred text-white'
                                                        : 'text-[#C4C4C4] hover:bg-primaryred/20 hover:text-white'
                                                }`}
                                            >
                                                {s === 'PENDING_PAYMENT' ? 'PENDING PAYMENT'
                                                    : s === 'ONHOLD' ? 'ON HOLD'
                                                    : s}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <button
                                    onClick={() => {
                                        if (!isEditingPayment) {
                                            setIsEditingPayment(true)
                                            setPaymentUpdateStatus(detail.paymentStatus)
                                            setPaymentUpdateNote(detail.note ?? '')
                                        } else {
                                            setIsEditingPayment(false)
                                        }
                                    }}
                                    className={`text-xs tracking-widest border px-4 py-2 transition-colors duration-200 ${
                                        isEditingPayment
                                            ? 'bg-primaryred text-white border-primaryred'
                                            : 'text-primaryred border-primaryred hover:bg-primaryred hover:text-white'
                                    }`}
                                >
                                    UPDATE PAYMENT STATUS
                                </button>
                                {isEditingPayment && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={async () => {
                                                if (!detail) return
                                                setIsUpdatingPayment(true)
                                                try {
                                                    const res = await fetch(
                                                        `/api/registrations/${detail.id}/payment-status`,
                                                        {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({
                                                                status: paymentUpdateStatus,
                                                                note: paymentUpdateNote,
                                                            }),
                                                        }
                                                    )
                                                    const json = await res.json()
                                                    if (!json.success) throw new Error(json.message ?? 'Failed.')
                                                    if (json.data) {
                                                        setDetail((prev) => {
                                                            if (!prev || typeof json.data !== 'object') return json.data
                                                            return { ...prev, ...json.data }
                                                        })
                                                    }
                                                    toast.success('Payment status updated.')
                                                    setIsEditingPayment(false)
                                                } catch (err) {
                                                    toast.error((err as Error).message ?? 'Failed.')
                                                } finally {
                                                    setIsUpdatingPayment(false)
                                                }
                                            }}
                                            disabled={isUpdatingPayment}
                                            className="text-xs tracking-widest text-primaryred border border-primaryred px-4 py-2 hover:bg-primaryred hover:text-white transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            {isUpdatingPayment ? 'UPDATING…' : 'SAVE'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsEditingPayment(false)}
                                            disabled={isUpdatingPayment}
                                            className="text-xs tracking-widest text-[#C4C4C4] border border-primaryred-muted px-4 py-2 hover:border-primaryred hover:text-white transition-colors duration-200"
                                        >
                                            CANCEL
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Note textarea — only for ONHOLD / REJECTED */}
                            {isEditingPayment && (paymentUpdateStatus === 'ONHOLD' || paymentUpdateStatus === 'REJECTED') && (
                                <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="text-[10px] tracking-widest text-primaryred shrink-0">NOTE</span>
                                        {NOTE_PRESETS[paymentUpdateStatus].map((msg) => (
                                            <button
                                                key={msg}
                                                type="button"
                                                onClick={() => setPaymentUpdateNote(msg)}
                                                className="text-[9px] tracking-widest text-[#C4C4C4] border border-primaryred-muted px-2 py-0.5 hover:border-primaryred hover:text-white transition-colors duration-200"
                                            >
                                                {msg}
                                            </button>
                                        ))}
                                    </div>
                                    <textarea
                                        value={paymentUpdateNote}
                                        onChange={(e) => setPaymentUpdateNote(e.target.value)}
                                        rows={2}
                                        className="bg-[#271C1C] border border-primaryred-muted focus:border-primaryred focus:ring-1 focus:ring-primaryred p-2.5 text-white text-xs tracking-widest focus:outline-none w-full transition-colors duration-200 resize-none"
                                        placeholder="Message to send to user about payment status update..."
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* OCR Scan — only if proof exists */}
                    {detail.paymentProofUrl && (
                        <div className="border border-primaryred-muted bg-[#1c1010] p-4 sm:p-5 flex flex-col gap-4">
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] tracking-[0.2em] text-primaryred font-bold">AUTO_OCR_SCAN</span>
                                    {isRunningOcr && (
                                        <span className="flex items-center gap-1.5 text-[10px] tracking-widest text-[#C4C4C4]">
                                            <span className="inline-block w-2.5 h-2.5 border border-[#C4C4C4] border-t-transparent rounded-full animate-spin" />
                                            SCANNING...
                                        </span>
                                    )}
                                </div>
                                {ocrResult && !isRunningOcr && (
                                    <div className="flex items-center gap-2 shrink-0">
                                        <div className="w-20 h-1.5 bg-[#2a1a1a] rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-700 ${
                                                    ocrResult.confidence >= 65 ? 'bg-green-500' :
                                                    ocrResult.confidence >= 35 ? 'bg-yellow-500' : 'bg-red-500'
                                                }`}
                                                style={{ width: `${ocrResult.confidence}%` }}
                                            />
                                        </div>
                                        <span className={`text-[10px] font-bold tracking-widest tabular-nums ${
                                            ocrResult.confidence >= 65 ? 'text-green-400' :
                                            ocrResult.confidence >= 35 ? 'text-yellow-400' : 'text-red-400'
                                        }`}>{ocrResult.confidence}%</span>
                                    </div>
                                )}
                            </div>

                            {isRunningOcr && (
                                <div className="flex flex-col gap-2.5">
                                    <Skeleton className="h-3 w-full" />
                                    <Skeleton className="h-3 w-4/5" />
                                    <Skeleton className="h-3 w-3/5" />
                                </div>
                            )}

                            {ocrError && !isRunningOcr && (
                                <p className="text-[11px] tracking-wide text-red-400 border border-red-500/30 bg-red-500/5 px-3 py-2 leading-relaxed">
                                    {ocrError}
                                </p>
                            )}

                            {ocrResult && !isRunningOcr && (
                                <>
                                    <div className="grid grid-cols-3 gap-x-4 gap-y-3 border-t border-primaryred-muted/40 pt-4">
                                        <div className="flex flex-col gap-1 col-span-1">
                                            <span className="text-[9px] tracking-[0.18em] text-primaryred/70 uppercase">Amount</span>
                                            <span className={`text-[11px] font-mono font-semibold tracking-wide leading-snug ${ocrResult.amount ? 'text-white' : 'text-[#444]'}`}>
                                                {ocrResult.amount ? `PKR ${ocrResult.amount}` : '—'}
                                            </span>
                                        </div>
                                        <div className="flex flex-col gap-1 col-span-2">
                                            <span className="text-[9px] tracking-[0.18em] text-primaryred/70 uppercase">Date</span>
                                            <span className={`text-[11px] tracking-wide leading-snug ${ocrResult.paymentDate ? 'text-white' : 'text-[#444]'}`}>
                                                {ocrResult.paymentDate ?? '—'}
                                            </span>
                                        </div>
                                        <div className="flex flex-col gap-1 col-span-3 border-t border-primaryred-muted/20 pt-3">
                                            <span className="text-[9px] tracking-[0.18em] text-primaryred/70 uppercase">Reference / TID</span>
                                            <span className={`text-[12px] font-mono font-bold tracking-wide break-all leading-snug ${ocrResult.referenceNumber ? 'text-white' : 'text-[#444]'}`}>
                                                {ocrResult.referenceNumber ?? '—'}
                                            </span>
                                        </div>
                                    </div>
                                </>
                            )}

                            <div className="flex gap-2 pt-0.5">
                                <button
                                    type="button"
                                    onClick={() => runProofOcr(detail.paymentProofUrl!)}
                                    disabled={isRunningOcr}
                                    className="text-[10px] tracking-widest text-primaryred border border-primaryred px-3 py-1.5 hover:bg-primaryred hover:text-white transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    {isRunningOcr ? 'SCANNING...' : 'RETRY OCR'}
                                </button>
                                {ocrResult && !isRunningOcr && (
                                    <button
                                        type="button"
                                        onClick={() => setShowRawOcrModal(true)}
                                        className="text-[10px] tracking-widest text-[#C4C4C4] border border-primaryred-muted px-3 py-1.5 hover:border-primaryred hover:text-white transition-colors duration-200"
                                    >
                                        RAW TEXT
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT column — proof image only, sticky */}
                {detail.paymentProofUrl && (
                    <div className="w-[340px] xl:w-[400px] shrink-0 sticky top-4">
                        <div className="border border-primaryred-muted bg-[#271C1C] p-4 flex flex-col gap-3">
                            <h3 className="text-primaryred text-xs tracking-[0.2em] font-bold">PAYMENT_PROOF</h3>
                            <button
                                onClick={() => setIsProofOpen(true)}
                                className="w-full flex items-center justify-center overflow-hidden bg-[#0f0b0b] border-0 p-0 cursor-zoom-in relative"
                                style={{ minHeight: '220px' }}
                                aria-label="Open payment proof"
                            >
                                {!imageLoaded && (
                                    <div className="absolute inset-0 animate-pulse bg-[#3a2525]" />
                                )}
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={detail.paymentProofUrl!}
                                    alt="Payment proof screenshot"
                                    className={`w-full object-contain border border-primaryred-muted pointer-events-none transition-opacity duration-300${imageLoaded ? '' : ' opacity-0'}`}
                                    loading="lazy"
                                    onLoad={() => setImageLoaded(true)}
                                    onError={() => setImageLoaded(true)}
                                />
                            </button>
                            <p className="text-[9px] tracking-widest text-[#C4C4C4]/50 text-center">CLICK TO ENLARGE</p>
                        </div>

                        {/* Lightbox */}
                        {isProofOpen && (
                            <div
                                role="dialog"
                                aria-modal="true"
                                className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 cursor-zoom-out"
                                onClick={() => setIsProofOpen(false)}
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={detail.paymentProofUrl!}
                                    alt="Payment proof fullscreen"
                                    className="max-w-[98vw] max-h-[96vh] object-contain"
                                    onClick={() => setIsProofOpen(false)}
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Members */}
            <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                    <h3 className="text-white text-sm font-bold tracking-widest">TEAM_MEMBERS</h3>
                    <span className="text-[10px] tracking-widest text-primaryred border border-primaryred px-2 py-0.5">
                        {detail.members.length} MEMBER{detail.members.length !== 1 ? 'S' : ''}
                    </span>
                </div>
                <DataTable<RegistrationMember>
                    columns={memberColumns}
                    rows={detail.members}
                    keyExtractor={(m) => m.id}
                    emptyMessage="// NO_MEMBERS_FOUND"
                    skeletonRowCount={3}
                />
            </div>

            {/* ── Raw OCR Text Modal ──────────────────────────────────── */}
            <AnimatePresence>
                {showRawOcrModal && ocrResult && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowRawOcrModal(false)}
                    >
                        <motion.div
                            className="bg-[#1a0f0f] border border-primaryred-muted w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
                            initial={{ scale: 0.95, opacity: 0, y: 8 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 8 }}
                            transition={{ duration: 0.15 }}
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        >
                            {/* Modal header */}
                            <div className="flex items-center justify-between px-5 py-3.5 border-b border-primaryred-muted shrink-0">
                                <div className="flex items-center gap-3">
                                    <span className="text-primaryred text-[10px] tracking-[0.2em] font-bold">RAW_OCR_OUTPUT</span>
                                    <span className={`text-[9px] tracking-widest border px-2 py-0.5 ${
                                        ocrResult.confidence >= 65
                                            ? 'text-green-400 border-green-600 bg-green-500/10'
                                            : ocrResult.confidence >= 35
                                                ? 'text-yellow-400 border-yellow-600 bg-yellow-500/10'
                                                : 'text-red-400 border-red-600 bg-red-500/10'
                                    }`}>
                                        {ocrResult.confidence}% CONFIDENCE
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowRawOcrModal(false)}
                                    className="text-[#C4C4C4] hover:text-white text-xl leading-none transition-colors duration-200 w-7 h-7 flex items-center justify-center"
                                    aria-label="Close"
                                >
                                    ×
                                </button>
                            </div>
                            {/* Scrollable raw text */}
                            <div className="overflow-auto p-5 flex-1">
                                {ocrResult.rawText ? (
                                    <pre className="text-[11px] leading-[1.75] whitespace-pre-wrap wrap-break-word text-[#C4C4C4] font-mono">
                                        {ocrResult.rawText}
                                    </pre>
                                ) : (
                                    <p className="text-[#555] text-xs tracking-widest text-center py-8">
                                        {/* No OCR text was extracted from this image. */}
                                        NO_OCR_TEXT_OUTPUT
                                    </p>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

// ─── Pagination control ────────────────────────────────────────────────────────

function Pagination({
    meta,
    onPageChange,
}: {
    meta: PaginationMeta
    onPageChange: (p: number) => void
}) {
    const { page, totalPages } = meta
    if (totalPages <= 1) return null

    // Show pages: always first, last, current ± 1, with ellipsis
    const pages: (number | '…')[] = []
    const add = new Set<number>()

    for (const p of [1, page - 1, page, page + 1, totalPages]) {
        if (p >= 1 && p <= totalPages) add.add(p)
    }

    const sorted = Array.from(add).sort((a, b) => a - b)
    for (let i = 0; i < sorted.length; i++) {
        if (i > 0 && sorted[i] - sorted[i - 1] > 1) pages.push('…')
        pages.push(sorted[i])
    }

    return (
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-primaryred-muted pt-4">
            <p className="text-[11px] tracking-widest text-[#C4C4C4]">
                {`// PAGE ${page} OF ${totalPages} · ${meta.total} TOTAL`}
            </p>
            <div className="flex items-center gap-1 flex-wrap">
                <button
                    onClick={() => onPageChange(page - 1)}
                    disabled={page <= 1}
                    className="text-xs tracking-widest text-primaryred border border-primaryred px-3 py-1.5 hover:bg-primaryred hover:text-white transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    ← PREV
                </button>

                {pages.map((p, i) =>
                    p === '…' ? (
                        <span key={`e-${i}`} className="text-[#C4C4C4] text-xs px-1">…</span>
                    ) : (
                        <button
                            key={p}
                            onClick={() => onPageChange(p as number)}
                            className={`w-8 h-8 text-xs font-bold border transition-colors duration-200 ${
                                p === page
                                    ? 'bg-primaryred text-white border-primaryred'
                                    : 'text-[#C4C4C4] border-primaryred-muted hover:border-primaryred hover:text-white'
                            }`}
                        >
                            {p}
                        </button>
                    )
                )}

                <button
                    onClick={() => onPageChange(page + 1)}
                    disabled={page >= totalPages}
                    className="text-xs tracking-widest text-primaryred border border-primaryred px-3 py-1.5 hover:bg-primaryred hover:text-white transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    NEXT →
                </button>
            </div>
        </div>
    )
}

// ─── Per-competition table (also used for "ALL") ─────────────────────────────

/** Columns shown when a specific competition is selected. */
const COMP_COLUMNS: Column<RegistrationRow>[] = [
    {
        key: '_idx',
        header: '#',
        render: (_, i) => <span className="text-[#C4C4C4]">{i + 1}</span>,
        minWidth: '3rem',
    },
    {
        key: 'name',
        header: 'TEAM',
        render: (row) => <span className="font-semibold text-white">{row.name}</span>,
        minWidth: '10rem',
    },
    {
        key: 'referenceId',
        header: 'REF_ID',
        render: (row) => (
            <span className="font-mono text-primaryred tracking-widest">{row.referenceId}</span>
        ),
        minWidth: '8rem',
    },
    {
        key: 'paymentStatus',
        header: 'STATUS',
        render: (row) => <StatusBadge status={row.paymentStatus} />,
        minWidth: '8rem',
    },
    {
        key: 'memberCount',
        header: 'MEMBERS',
        render: (row) => <span className="text-[#C4C4C4]">{row.memberCount}</span>,
        minWidth: '5rem',
    },
    {
        key: 'createdAt',
        header: 'REGISTERED',
        render: (row) => <span className="text-[#C4C4C4]">{fmtDate(row.createdAt)}</span>,
        minWidth: '8rem',
    },
    {
        key: '_action',
        header: '',
        render: () => (
            <span className="text-primaryred text-[10px] tracking-widest opacity-60">VIEW →</span>
        ),
        minWidth: '4rem',
    },
]

/** Columns for the "ALL" view include a competition name column. */
const ALL_COLUMNS: Column<RegistrationRow>[] = [
    COMP_COLUMNS[0], // #
    COMP_COLUMNS[1], // TEAM
    {
        key: 'competition.name',
        header: 'COMPETITION',
        render: (row) => <span className="text-[#C4C4C4]">{row.competition.name}</span>,
        minWidth: '10rem',
    },
    COMP_COLUMNS[2], // REF_ID
    COMP_COLUMNS[3], // STATUS
    COMP_COLUMNS[4], // MEMBERS
    COMP_COLUMNS[5], // REGISTERED
    COMP_COLUMNS[6], // VIEW →
]

// ─── Competitions loading skeleton ────────────────────────────────────────────

function TabsSkeleton() {
    return (
        <div className="flex gap-2 border-b border-primaryred-muted pb-0 overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
                <div
                    key={i}
                    className="h-10 animate-pulse bg-[#3a2525] rounded-sm shrink-0"
                    style={{ width: `${80 + i * 20}px` }}
                />
            ))}
        </div>
    )
}

// ─── Horizontal competition tabs ──────────────────────────────────────────────

function CompetitionTabs({
    competitions,
    activeId,
    onSelect,
    onSearchClick,
}: {
    competitions: Competition[]
    /** 'all' for the virtual "ALL" tab, or a competition id */
    activeId: string
    onSelect: (id: string) => void
    onSearchClick: () => void
}) {
    return (
        <div className="relative">
            {/* Scrollable tab strip */}
            <div className="flex overflow-x-auto border-b border-primaryred-muted [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {/* Virtual "ALL" tab */}
                <button
                    onClick={() => onSelect('all')}
                    className={`relative shrink-0 px-4 sm:px-5 py-3 text-xs tracking-widest font-semibold transition-colors duration-150 whitespace-nowrap ${
                        activeId === 'all'
                            ? 'text-white bg-[#271C1C]'
                            : 'text-[#C4C4C4] hover:text-white hover:bg-[#1e1515]'
                    }`}
                >
                    ALL
                    {activeId === 'all' && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primaryred" />
                    )}
                </button>
                {competitions.map((comp) => {
                    const active = comp.id === activeId
                    return (
                        <button
                            key={comp.id}
                            onClick={() => onSelect(comp.id)}
                            className={`relative shrink-0 px-4 sm:px-5 py-3 text-xs tracking-widest font-semibold transition-colors duration-150 whitespace-nowrap ${
                                active
                                    ? 'text-white bg-[#271C1C]'
                                    : 'text-[#C4C4C4] hover:text-white hover:bg-[#1e1515]'
                            }`}
                        >
                            {comp.name.toUpperCase()}
                            {active && (
                                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primaryred" />
                            )}
                        </button>
                    )
                })}
                {/* Search icon */}
                <button
                    onClick={onSearchClick}
                    className="relative shrink-0 px-4 py-3 text-[#C4C4C4] hover:text-white transition-colors duration-150 ml-auto"
                    title="Search team members"
                >
                    🔍
                </button>
            </div>
        </div>
    )
}

// ─── Per-competition table ────────────────────────────────────────────────────

function CompetitionTable({
    competition,
    onRowClick,
    onRowsLoaded,
    page,
    onPageChange,
    searchInput,
    onSearchInputChange,
    search,
    statusFilter,
    onStatusFilterChange,
}: {
    /** Pass null for the "ALL" view (no competition filter). */
    competition: Competition | null
    onRowClick: (id: string) => void
    /** Called whenever rows update — parent uses this for prev/next navigation. */
    onRowsLoaded?: (ids: string[], meta: PaginationMeta) => void
    page: number
    onPageChange: (p: number) => void
    searchInput: string
    onSearchInputChange: (s: string) => void
    search: string
    statusFilter: string
    onStatusFilterChange: (s: string) => void
}) {
    const [rows,      setRows]      = useState<RegistrationRow[]>([])
    const [meta,      setMeta]      = useState<PaginationMeta>({ total: 0, page: 1, limit: 15, totalPages: 0 })
    const [isLoading, setIsLoading] = useState(true)

    const isAll = competition === null

    const fetchRows = useCallback(async () => {
        setIsLoading(true)
        try {
            const params = new URLSearchParams()
            params.set('page',          String(page))
            params.set('limit',         '15')
            if (competition) params.set('competitionId', competition.id)
            if (search)       params.set('search', search)
            if (statusFilter) params.set('status', statusFilter)

            const res  = await fetch(`/api/registrations?${params}`)
            const json = await res.json()
            if (json.success) {
                setRows(json.data)
                setMeta(json.meta)
                onRowsLoaded?.(json.data.map((r: RegistrationRow) => r.id), json.meta)
            }
        } catch {
            // silent
        } finally {
            setIsLoading(false)
        }
    }, [competition, page, search, statusFilter, onRowsLoaded])

    useEffect(() => { fetchRows() }, [fetchRows])

    return (
        <div className="flex flex-col gap-0 border border-t-0 border-primaryred-muted">
            {/* Competition meta bar (hidden for ALL view) */}
            {competition && (
                <div className="flex flex-wrap items-center gap-3 px-4 sm:px-5 py-3 bg-[#271C1C] border-b border-primaryred-muted">
                    {competition.compDay && (
                        <span className="text-[10px] tracking-widest text-[#C4C4C4] border border-primaryred-muted px-2 py-0.5">
                            {fmtDate(competition.compDay)}
                        </span>
                    )}
                    <span className="text-[10px] tracking-widest text-primaryred border border-primaryred px-2 py-0.5">
                        {isLoading ? '...' : `${meta.total} TEAM${meta.total !== 1 ? 'S' : ''}`}
                    </span>
                </div>
            )}

            {/* ALL view header */}
            {isAll && (
                <div className="flex flex-wrap items-center gap-3 px-4 sm:px-5 py-3 bg-[#271C1C] border-b border-primaryred-muted">
                    <span className="text-[10px] tracking-widest text-primaryred border border-primaryred px-2 py-0.5">
                        {isLoading ? '...' : `${meta.total} TOTAL REGISTRATION${meta.total !== 1 ? 'S' : ''}`}
                    </span>
                </div>
            )}

            {/* Search + status filter */}
            <div className="flex flex-col sm:flex-row gap-3 px-4 py-3 border-b border-primaryred-muted bg-[#191111]">
                {/* Search */}
                <div className="relative flex-1">
                    <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => onSearchInputChange(e.target.value)}
                        placeholder="Search by team name or ref ID..."
                        className="bg-[#271C1C] border border-primaryred-muted focus:border-primaryred focus:ring-1 focus:ring-primaryred p-2.5 pl-8 text-white text-xs tracking-wider placeholder-[#555] focus:outline-none w-full transition-colors duration-200"
                    />
                    <svg
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primaryred pointer-events-none"
                        xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0Z" />
                    </svg>
                    {searchInput && (
                        <button
                            onClick={() => onSearchInputChange('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#C4C4C4] hover:text-white text-xs"
                        >
                            ✕
                        </button>
                    )}
                </div>

                {/* Status filter */}
                <div className="relative sm:w-44">
                    <select
                        value={statusFilter}
                        onChange={(e) => onStatusFilterChange(e.target.value)}
                        className="bg-[#271C1C] border border-primaryred-muted focus:border-primaryred focus:ring-1 focus:ring-primaryred p-2.5 pr-8 text-white text-xs tracking-widest focus:outline-none w-full appearance-none transition-colors duration-200"
                    >
                        <option value="">ALL STATUSES</option>
                        <option value="PENDING_PAYMENT">PENDING PAYMENT</option>
                        <option value="VERIFIED">VERIFIED</option>
                        <option value="REJECTED">REJECTED</option>
                    </select>
                    <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-primaryred">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.24 4.5a.75.75 0 0 1-1.08 0l-4.24-4.5a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" />
                        </svg>
                    </span>
                </div>
            </div>

            <DataTable<RegistrationRow>
                columns={isAll ? ALL_COLUMNS : COMP_COLUMNS}
                rows={rows}
                keyExtractor={(r) => r.id}
                loading={isLoading}
                skeletonRowCount={5}
                emptyMessage="// NO_REGISTRATIONS_FOUND"
                onRowClick={(row) => onRowClick(row.id)}
            />

            {/* Pagination */}
            {!isLoading && meta.totalPages > 1 && (
                <div className="px-4 py-3 border-t border-primaryred-muted bg-[#191111]">
                    <Pagination meta={meta} onPageChange={onPageChange} />
                </div>
            )}
        </div>
    )
}

// ─── Main: View Registrations Tab ─────────────────────────────────────────────

export default function ViewRegistrationsTab() {
    const [competitions,  setCompetitions]  = useState<Competition[]>([])
    const [compsLoading,  setCompsLoading]  = useState(true)
    const [activeCompId,  setActiveCompId]  = useState<string>('all')

    // Detail panel
    const [selectedId, setSelectedId] = useState<string | null>(null)

    // Navigation — accumulates IDs across ALL pages for cross-page prev/next
    const [allIds,  setAllIds]  = useState<string[]>([])
    const [tblMeta, setTblMeta] = useState<PaginationMeta>({ total: 0, page: 1, limit: 15, totalPages: 0 })

    // Table filter/page state (lifted from CompetitionTable for cross-page nav)
    const [tblPage,         setTblPage]         = useState(1)
    const [tblSearchInput,  setTblSearchInput]  = useState('')
    const [tblSearch,       setTblSearch]       = useState('')
    const [tblStatusFilter, setTblStatusFilter] = useState('')

    // Search modal state
    const [isSearchOpen, setIsSearchOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<SearchResult[]>([])
    const [isSearching, setIsSearching] = useState(false)

    // Debounce tblSearchInput → tblSearch, reset to page 1
    useEffect(() => {
        const t = setTimeout(() => { setTblSearch(tblSearchInput); setTblPage(1) }, 400)
        return () => clearTimeout(t)
    }, [tblSearchInput])

    // Reset page when status filter changes
    useEffect(() => { setTblPage(1) }, [tblStatusFilter])

    // Accumulate IDs: fresh start on page 1, append on subsequent pages
    const handleRowsLoaded = useCallback((ids: string[], meta: PaginationMeta) => {
        setAllIds(prev => meta.page === 1 ? ids : [...prev, ...ids])
        setTblMeta(meta)
    }, [])

    // Search functionality
    const performSearch = useCallback(async (query: string) => {
        if (!query.trim()) {
            setSearchResults([])
            return
        }

        setIsSearching(true)
        try {
            const res = await fetch(`/api/registrations/search-members?query=${encodeURIComponent(query)}`)
            const json = await res.json()
            if (json.success) {
                setSearchResults(json.data)
            } else {
                setSearchResults([])
            }
        } catch {
            setSearchResults([])
        } finally {
            setIsSearching(false)
        }
    }, [])

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            performSearch(searchQuery)
        }, 300)
        return () => clearTimeout(timeoutId)
    }, [searchQuery, performSearch])

    // ── Fetch competitions (once) ──────────────────────────────────────────
    useEffect(() => {
        setCompsLoading(true)
        fetch('/api/registrations/competitions')
            .then((r) => r.json())
            .then((json) => {
                if (json.success) {
                    setCompetitions(json.data)
                    // Start on "ALL" tab (already default)
                }
            })
            .catch(() => {/* silent */})
            .finally(() => setCompsLoading(false))
    }, [])

    // ── Detail panel ───────────────────────────────────────────────────────
    if (selectedId) {
        const idx = allIds.indexOf(selectedId)

        const onPrev = idx > 0
            ? () => setSelectedId(allIds[idx - 1])
            : undefined

        // At the last loaded ID with more pages → fetch next page then navigate
        const onNext: (() => void) | undefined =
            idx >= 0 && idx < allIds.length - 1
                ? () => setSelectedId(allIds[idx + 1])
                : tblMeta.page < tblMeta.totalPages
                    ? async () => {
                        const nextPage = tblMeta.page + 1
                        const params = new URLSearchParams()
                        params.set('page', String(nextPage))
                        params.set('limit', '15')
                        const activeComp = activeCompId === 'all'
                            ? null
                            : (competitions.find((c) => c.id === activeCompId) ?? null)
                        if (activeComp) params.set('competitionId', activeComp.id)
                        if (tblSearch) params.set('search', tblSearch)
                        if (tblStatusFilter) params.set('status', tblStatusFilter)
                        try {
                            const res  = await fetch(`/api/registrations?${params}`)
                            const json = await res.json()
                            if (json.success && json.data.length > 0) {
                                const newIds: string[] = json.data.map((r: RegistrationRow) => r.id)
                                setAllIds(prev => [...prev, ...newIds])
                                setTblMeta(json.meta)
                                setTblPage(nextPage)
                                setSelectedId(newIds[0])
                            }
                        } catch { /* silent */ }
                    }
                    : undefined

        return (
            <RegistrationDetailPanel
                registrationId={selectedId}
                onBack={() => setSelectedId(null)}
                onPrev={onPrev}
                onNext={onNext}
            />
        )
    }

    const activeComp =
        activeCompId === 'all'
            ? null
            : (competitions.find((c) => c.id === activeCompId) ?? null)

    // ── List view ──────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col gap-0">
            {compsLoading ? (
                <TabsSkeleton />
            ) : competitions.length === 0 ? (
                <div className="border border-primaryred-muted bg-[#271C1C] p-10 flex items-center justify-center">
                    <p className="text-[#C4C4C4] text-xs tracking-widest">{/* NO_COMPETITIONS_FOUND */}</p>
                </div>
            ) : (
                <>
                    <CompetitionTabs
                        competitions={competitions}
                        activeId={activeCompId}
                        onSelect={(id) => {
                            setActiveCompId(id)
                            setTblPage(1)
                            setTblSearchInput('')
                            setTblSearch('')
                            setTblStatusFilter('')
                            setAllIds([])
                        }}
                        onSearchClick={() => setIsSearchOpen(true)}
                    />
                    <CompetitionTable
                        competition={activeComp}
                        onRowClick={setSelectedId}
                        onRowsLoaded={handleRowsLoaded}
                        page={tblPage}
                        onPageChange={setTblPage}
                        searchInput={tblSearchInput}
                        onSearchInputChange={setTblSearchInput}
                        search={tblSearch}
                        statusFilter={tblStatusFilter}
                        onStatusFilterChange={setTblStatusFilter}
                    />

                    {/* Search Modal */}
                    <AnimatePresence>
                        {isSearchOpen && (
                            <motion.div
                                className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsSearchOpen(false)}
                            >
                                <motion.div
                                    className="bg-[#271C1C] border border-primaryred-muted p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-auto"
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.9, opacity: 0 }}
                                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-primaryred text-sm tracking-[0.2em] font-bold">SEARCH TEAM MEMBERS</h3>
                                        <button
                                            onClick={() => setIsSearchOpen(false)}
                                            className="text-[#C4C4C4] hover:text-white text-xl"
                                        >
                                            ×
                                        </button>
                                    </div>

                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search by name, email, or CNIC..."
                                        className="w-full bg-[#1a0f0f] border border-primaryred-muted focus:border-primaryred focus:ring-1 focus:ring-primaryred px-4 py-3 text-white text-sm tracking-widest focus:outline-none mb-4"
                                        autoFocus
                                    />

                                    {isSearching && (
                                        <div className="text-center py-8">
                                            <div className="animate-pulse text-[#C4C4C4] text-sm tracking-widest">SEARCHING...</div>
                                        </div>
                                    )}

                                    {!isSearching && searchResults.length > 0 && (
                                        <div className="space-y-3">
                                            {searchResults.map((result) => (
                                                <div key={result.participant.id} className="border border-primaryred-muted bg-[#1a0f0f] p-4">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <h4 className="text-white font-semibold text-sm tracking-widest">
                                                            {result.participant.fullName}
                                                        </h4>
                                                        <span className="text-[10px] tracking-widest text-primaryred border border-primaryred px-2 py-0.5">
                                                            {result.competitions.length} COMPETITION{result.competitions.length !== 1 ? 'S' : ''}
                                                        </span>
                                                    </div>
                                                    <div className="text-[#C4C4C4] text-xs tracking-widest mb-2">
                                                        {result.participant.email} • {result.participant.cnic}
                                                    </div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {result.competitions.map((comp: SearchCompetition) => (
                                                            <span
                                                                key={comp.id}
                                                                className="text-[9px] tracking-widest text-[#C4C4C4] border border-primaryred-muted px-2 py-0.5"
                                                            >
                                                                {comp.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {!isSearching && searchQuery && searchResults.length === 0 && (
                                        <div className="text-center py-8">
                                            <p className="text-[#C4C4C4] text-sm tracking-widest">NO RESULTS FOUND</p>
                                        </div>
                                    )}
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </>
            )}
        </div>
    )
}
