import { NextRequest, NextResponse } from 'next/server'
import { fetchWithAuth, applyCookies, unauthorizedResponse } from '@/lib/fetchWithAuth'
import { getCachedStats, setCachedStats } from '@/lib/dashboardStatsCache'

// ── Server-side stats cache (60 s) ─────────────────────────────────────────────
// Stats don't change faster than a registration is created, so a 60s cache
// removes the backend round-trip on every dashboard visit.
/**
 * GET /api/dashboard/stats
 * Proxy to backend — dashboard statistics.
 */
export async function GET(req: NextRequest) {
    const accessToken = req.cookies.get('access_token')?.value
    const cachedStats = getCachedStats(accessToken)
    if (cachedStats) return NextResponse.json(cachedStats, { status: 200 })

    try {
        const { data, status, setCookieHeaders } = await fetchWithAuth(req, '/registrations/dashboard-stats')

        if (status === 401) return unauthorizedResponse()

        if (status === 200 && (data as { success?: boolean }).success) {
            setCachedStats(accessToken, data)
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
