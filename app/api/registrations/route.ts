import { NextRequest, NextResponse } from 'next/server'
import { fetchWithAuth, applyCookies, unauthorizedResponse } from '@/lib/fetchWithAuth'

/**
 * GET /api/registrations
 * Proxy to backend — paginated list of registrations.
 * Forwards query params: page, limit, search, competitionId, status
 */
export async function GET(req: NextRequest) {
    try {
        // Forward all query params to the backend
        const qs = req.nextUrl.searchParams.toString()
        const path = qs ? `/registrations?${qs}` : '/registrations'

        const { data, status, setCookieHeaders } = await fetchWithAuth(req, path)

        if (status === 401) return unauthorizedResponse()

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
