import { NextRequest, NextResponse } from 'next/server'
import { fetchWithAuth, applyCookies, unauthorizedResponse } from '@/lib/fetchWithAuth'

/**
 * GET /api/registrations/competitions
 * Proxy to backend — list all competitions for the filter dropdown.
 */
export async function GET(req: NextRequest) {
    try {
        const { data, status, setCookieHeaders } = await fetchWithAuth(
            req,
            '/registrations/competitions'
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
