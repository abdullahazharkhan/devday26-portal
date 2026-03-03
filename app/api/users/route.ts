import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:5000'

/**
 * GET /api/users
 * Proxy to backend — lists all staff users.
 * Forwards the access_token cookie as a Bearer token.
 */
export async function GET(req: NextRequest) {
    const token = req.cookies.get('access_token')?.value

    if (!token) {
        return NextResponse.json(
            { success: false, message: 'Not authenticated.' },
            { status: 401 }
        )
    }

    try {
        const backendRes = await fetch(`${BACKEND_URL}/users`, {
            headers: { Authorization: `Bearer ${token}` },
        })

        const data = await backendRes.json()
        return NextResponse.json(data, { status: backendRes.status })
    } catch {
        return NextResponse.json(
            { success: false, message: 'Could not reach the server.' },
            { status: 503 }
        )
    }
}
