import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:5000'

/**
 * POST /api/auth/refresh
 *
 * Reads the httpOnly refresh_token cookie, exchanges it with the backend for a
 * fresh access_token (+ rotated refresh_token), and updates both cookies.
 *
 * Returns:
 *   200  { success: true }                     — cookies updated silently
 *   401  { success: false, message: '...' }    — refresh token invalid/expired → force login
 *   503  service unreachable
 */
export async function POST(req: NextRequest) {
    const refreshToken = req.cookies.get('refresh_token')?.value

    if (!refreshToken) {
        return NextResponse.json(
            { success: false, message: 'No refresh token.' },
            { status: 401 }
        )
    }

    try {
        const backendRes = await fetch(`${BACKEND_URL}/auth/refresh`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ refreshToken }),
        })

        const data = await backendRes.json()

        if (!backendRes.ok) {
            // Refresh token is invalid/expired — tell client to go back to login
            return NextResponse.json(
                { success: false, message: data.message ?? 'Session expired. Please log in again.' },
                { status: 401 }
            )
        }

        const { accessToken, refreshToken: newRefreshToken, expiresIn } = data as {
            accessToken:  string
            refreshToken: string
            expiresIn:    number
        }

        const isProduction = process.env.NODE_ENV === 'production'
        const response = NextResponse.json({ success: true }, { status: 200 })

        response.cookies.set('access_token', accessToken, {
            httpOnly: true,
            secure:   isProduction,
            sameSite: 'lax',
            path:     '/',
            maxAge:   expiresIn ?? 3600,
        })

        // Supabase rotates the refresh token on every use; persist the new one
        response.cookies.set('refresh_token', newRefreshToken, {
            httpOnly: true,
            secure:   isProduction,
            sameSite: 'lax',
            path:     '/',
            maxAge:   60 * 60 * 24 * 30,
        })

        return response
    } catch {
        return NextResponse.json(
            { success: false, message: 'Could not reach the server.' },
            { status: 503 }
        )
    }
}
