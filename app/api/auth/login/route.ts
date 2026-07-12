import { NextRequest, NextResponse } from 'next/server'
import { fetchBackend } from '@/lib/backendFetch'

/**
 * POST /api/auth/login
 *
 * Proxies credentials to the Express backend, which authenticates via Supabase.
 * On success:
 *   — Sets access_token  in an httpOnly cookie (short-lived, ~1 h)
 *   — Sets refresh_token in an httpOnly cookie (long-lived)
 *   — Returns the user profile as JSON so the client can hydrate its Zustand store
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json()

        const backendRes = await fetchBackend('/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        })

        const data = await backendRes.json()

        if (!backendRes.ok) {
            return NextResponse.json(data, { status: backendRes.status })
        }

        const { accessToken, refreshToken, expiresIn, user } = data.data as {
            accessToken:  string
            refreshToken: string
            expiresIn:    number
            user:         Record<string, unknown>
        }

        const response = NextResponse.json(
            { success: true, message: data.message, data: { user } },
            { status: 200 }
        )

        const isProduction = process.env.NODE_ENV === 'production'

        // access_token: expires when Supabase says (default 3600 s)
        response.cookies.set('access_token', accessToken, {
            httpOnly: true,
            secure:   isProduction,
            sameSite: 'lax',
            path:     '/',
            maxAge:   expiresIn ?? 3600,
        })

        // refresh_token: long-lived (30 days)
        response.cookies.set('refresh_token', refreshToken, {
            httpOnly: true,
            secure:   isProduction,
            sameSite: 'lax',
            path:     '/',
            maxAge:   60 * 60 * 24 * 30,
        })

        return response
    } catch {
        return NextResponse.json(
            { success: false, message: 'Could not reach the server. Please try again.' },
            { status: 503 }
        )
    }
}
