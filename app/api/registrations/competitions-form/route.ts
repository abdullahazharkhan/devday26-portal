import { NextRequest, NextResponse } from 'next/server'
import { fetchWithAuth, applyCookies, unauthorizedResponse } from '@/lib/fetchWithAuth'

/**
 * GET /api/registrations/competitions-form
 * Proxy to backend — competitions with fee + timing for the create-registration form.
 */
export async function GET(req: NextRequest) {
    try {
        const { data, status, setCookieHeaders } = await fetchWithAuth(
            req,
            '/registrations/competitions-form'
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
