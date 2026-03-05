import { NextRequest, NextResponse } from 'next/server'
import { fetchWithAuth, applyCookies, unauthorizedResponse } from '@/lib/fetchWithAuth'

/**
 * GET /api/auth/me
 *
 * Returns the currently authenticated user's profile with freshly-computed
 * actions from the database. Used by DashboardNav to keep the Zustand store
 * up-to-date when a super-admin grants new permissions without requiring a
 * full logout / re-login.
 */
export async function GET(req: NextRequest) {
    try {
        const { data, status, setCookieHeaders } = await fetchWithAuth(req, '/auth/me', {
            method: 'GET',
        })

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
