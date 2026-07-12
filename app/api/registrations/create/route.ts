import { NextRequest, NextResponse } from 'next/server'
import { fetchWithAuth, applyCookies, unauthorizedResponse } from '@/lib/fetchWithAuth'
import { invalidateStatsCache } from '@/lib/dashboardStatsCache'

/**
 * POST /api/registrations/create
 * Proxy to backend — create a new team registration.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { data, status, setCookieHeaders } = await fetchWithAuth(
            req,
            '/registrations',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            }
        )

        if (status === 401) return unauthorizedResponse()
        if (status >= 200 && status < 300) invalidateStatsCache()

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
