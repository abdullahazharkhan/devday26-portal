import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:5000'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FetchWithAuthResult {
    /** The backend JSON response (already parsed) */
    data: unknown
    /** HTTP status returned by the backend */
    status: number
    /**
     * Set-Cookie strings that should be forwarded to the browser.
     * Populated only when a token refresh happened.
     */
    setCookieHeaders: string[]
}

// ─── Internal: call /auth/refresh with the current refresh_token ──────────────

async function attemptRefresh(req: NextRequest): Promise<{
    newAccessToken: string | null
    setCookieHeaders: string[]
}> {
    const refreshToken = req.cookies.get('refresh_token')?.value
    if (!refreshToken) return { newAccessToken: null, setCookieHeaders: [] }

    try {
        const res = await fetch(`${BACKEND_URL}/auth/refresh`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ refreshToken }),
        })

        if (!res.ok) return { newAccessToken: null, setCookieHeaders: [] }

        const json = (await res.json()) as {
            success:      boolean
            accessToken:  string
            refreshToken: string
            expiresIn:    number
        }

        if (!json.success) return { newAccessToken: null, setCookieHeaders: [] }

        const isProduction = process.env.NODE_ENV === 'production'
        const secure = isProduction ? '; Secure' : ''

        const accessCookie   = `access_token=${json.accessToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${json.expiresIn ?? 3600}${secure}`
        const refreshCookie  = `refresh_token=${json.refreshToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}${secure}`

        return {
            newAccessToken:   json.accessToken,
            setCookieHeaders: [accessCookie, refreshCookie],
        }
    } catch {
        return { newAccessToken: null, setCookieHeaders: [] }
    }
}

// ─── Public helper ────────────────────────────────────────────────────────────

/**
 * Fetches a backend URL with the user's access_token as a Bearer header.
 *
 * If the backend returns 401, the helper automatically:
 *   1. Calls POST /auth/refresh with the refresh_token cookie
 *   2. Retries the original request with the new access_token
 *   3. Returns `setCookieHeaders` so the caller can forward the new cookies to
 *      the browser via `response.headers.append('Set-Cookie', …)`
 *
 * If the refresh also fails, returns the 401 so the caller can redirect to /login.
 */
export async function fetchWithAuth(
    req: NextRequest,
    backendPath: string,
    init: RequestInit = {}
): Promise<FetchWithAuthResult> {
    let accessToken = req.cookies.get('access_token')?.value
    let prefetchCookies: string[] = []

    // ── No access_token: try to refresh before giving up ──────────────────────
    if (!accessToken) {
        const { newAccessToken, setCookieHeaders } = await attemptRefresh(req)
        if (!newAccessToken) {
            // Refresh also failed — session is completely dead
            return { data: { success: false, message: 'Not authenticated.' }, status: 401, setCookieHeaders: [] }
        }
        accessToken    = newAccessToken
        prefetchCookies = setCookieHeaders
    }

    const headers = new Headers((init.headers as HeadersInit | undefined) ?? {})
    headers.set('Authorization', `Bearer ${accessToken}`)

    // ── First attempt ─────────────────────────────────────────────────────────
    let res = await fetch(`${BACKEND_URL}${backendPath}`, { ...init, headers })
    let data = await res.json()

    if (res.status !== 401) {
        return { data, status: res.status, setCookieHeaders: prefetchCookies }
    }

    // ── 401: try to refresh (access_token became stale mid-session) ───────────
    const { newAccessToken, setCookieHeaders } = await attemptRefresh(req)

    if (!newAccessToken) {
        // Refresh failed entirely — session is dead
        return { data, status: 401, setCookieHeaders: [] }
    }

    // ── Retry with fresh token ────────────────────────────────────────────────
    headers.set('Authorization', `Bearer ${newAccessToken}`)
    res  = await fetch(`${BACKEND_URL}${backendPath}`, { ...init, headers })
    data = await res.json()

    return { data, status: res.status, setCookieHeaders }
}

// ─── Helper: apply Set-Cookie headers to a NextResponse ──────────────────────

export function applyCookies(response: NextResponse, setCookieHeaders: string[]): void {
    for (const cookie of setCookieHeaders) {
        response.headers.append('Set-Cookie', cookie)
    }
}

// ─── Helper: build a 401 redirect-to-login response ─────────────────────────

export function unauthorizedResponse(): NextResponse {
    return NextResponse.json(
        { success: false, message: 'Session expired. Please log in again.' },
        { status: 401 }
    )
}
