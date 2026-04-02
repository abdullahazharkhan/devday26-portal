import { NextRequest, NextResponse } from 'next/server'
import { fetchWithAuth, applyCookies, unauthorizedResponse } from '@/lib/fetchWithAuth'

// ── Server-side stats cache (60 s) ─────────────────────────────────────────────
// Stats don't change faster than a registration is created, so a 60s cache
// removes the backend round-trip on every dashboard visit.
interface CachedStats { data: unknown; cachedAt: number }
let statsCache: CachedStats | null = null
const STATS_TTL_MS = 60_000

/**
 * GET /api/dashboard/stats
 * Proxy to backend — dashboard statistics.
 */
export async function GET(req: NextRequest) {
    if (statsCache && Date.now() - statsCache.cachedAt < STATS_TTL_MS) {
        return NextResponse.json(statsCache.data, { status: 200 })
    }

    try {
        const { data, status, setCookieHeaders } = await fetchWithAuth(req, '/registrations/dashboard-stats')

        if (status === 401) return unauthorizedResponse()

        if (status === 200 && (data as { success?: boolean }).success) {
            statsCache = { data, cachedAt: Date.now() }
        }

        const response = NextResponse.json(data, { status })
        applyCookies(response, setCookieHeaders)
        return response
    } catch {
        return NextResponse.json(
            { success: false, message: 'Could not reach the server.' },
            { status: 503 }
        )
    }
}