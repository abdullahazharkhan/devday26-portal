import { NextRequest, NextResponse } from 'next/server'
import { fetchBackend } from '@/lib/backendFetch'

/**
 * POST /api/auth/logout
 *
 * 1. Reads the httpOnly access_token cookie (invisible to client JS)
 * 2. Forwards it to Express POST /auth/logout → supabaseAdmin.auth.admin.signOut(jwt)
 *    This revokes the session in Supabase so the token can never be reused
 * 3. Clears both auth cookies from the browser regardless of backend result
 */
export async function POST(req: NextRequest) {
    const accessToken = req.cookies.get('access_token')?.value

    // Best-effort revocation — fire and don't block on failure
    if (accessToken) {
        try {
            await fetchBackend('/auth/logout', {
                method:  'POST',
                headers: { Authorization: `Bearer ${accessToken}` },
            }, 3_000)
        } catch {
            // Network error — still clear cookies below
        }
    }

    const isProduction = process.env.NODE_ENV === 'production'
    const response = NextResponse.json({ success: true, message: 'Logged out.' })

    response.cookies.set('access_token', '', {
        httpOnly: true,
        secure:   isProduction,
        sameSite: 'lax',
        path:     '/',
        maxAge:   0,
    })

    response.cookies.set('refresh_token', '', {
        httpOnly: true,
        secure:   isProduction,
        sameSite: 'lax',
        path:     '/',
        maxAge:   0,
    })

    return response
}
