import { NextRequest, NextResponse } from 'next/server'
import { fetchWithAuth, applyCookies, unauthorizedResponse } from '@/lib/fetchWithAuth'
import { getCachedList, setCachedList } from '@/lib/registrationListCache'

/**
 * GET /api/registrations
 * Proxy to backend — paginated list of registrations.
 * Forwards query params: page, limit, search, competitionId, status
 * Responses are cached for 10 s to cut redundant round-trips.
 */
export async function GET(req: NextRequest) {
    try {
        // Forward all query params to the backend
        const qs = req.nextUrl.searchParams.toString()
        const path = qs ? `/registrations?${qs}` : '/registrations'

        // Check cache first
        const cached = getCachedList(path)
        if (cached) return NextResponse.json(cached, { status: 200 })

        const { data, status, setCookieHeaders } = await fetchWithAuth(req, path)

        if (status === 401) return unauthorizedResponse()

        // Cache successful responses
        if (status === 200 && (data as { success?: boolean }).success) {
            setCachedList(path, data)
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
