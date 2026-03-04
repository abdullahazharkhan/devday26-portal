import { NextRequest, NextResponse } from 'next/server'
import { fetchWithAuth, applyCookies, unauthorizedResponse } from '@/lib/fetchWithAuth'

/**
 * GET /api/registrations/search?q=<query>
 * Proxy to backend — search teams by team ID, name, or leader name.
 */
export async function GET(req: NextRequest) {
    try {
        const searchParams = req.nextUrl.searchParams
        const query = searchParams.get('q') || ''

        const { data, status, setCookieHeaders } = await fetchWithAuth(
            req,
            `/registrations/search?q=${encodeURIComponent(query)}`,
            { method: 'GET' }
        )

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
