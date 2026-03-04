import { NextRequest, NextResponse } from 'next/server'
import { fetchWithAuth, applyCookies, unauthorizedResponse } from '@/lib/fetchWithAuth'

/**
 * POST /api/registrations/check-clashes
 * Proxy to backend — check timing clashes for team members by CNIC.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { data, status, setCookieHeaders } = await fetchWithAuth(
            req,
            '/registrations/check-clashes',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            }
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
