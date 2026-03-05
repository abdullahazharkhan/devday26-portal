import { NextRequest, NextResponse } from 'next/server'
import { fetchWithAuth, applyCookies, unauthorizedResponse } from '@/lib/fetchWithAuth'

/**
 * GET /api/participants/by-email?email=...
 * Proxy to backend — fetch a participant profile with their team registrations.
 */
export async function GET(req: NextRequest) {
    try {
        const email = req.nextUrl.searchParams.get('email') || ''

        const { data, status, setCookieHeaders } = await fetchWithAuth(
            req,
            `/participants/by-email?email=${encodeURIComponent(email)}`,
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
