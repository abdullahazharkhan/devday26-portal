import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:5000'

type RouteContext = { params: Promise<{ id: string }> }

/**
 * GET /api/users/[id]/actions
 * Proxy — fetch a single user's action breakdown.
 */
export async function GET(req: NextRequest, ctx: RouteContext) {
    const { id } = await ctx.params
    const token = req.cookies.get('access_token')?.value

    if (!token) {
        return NextResponse.json(
            { success: false, message: 'Not authenticated.' },
            { status: 401 }
        )
    }

    try {
        const backendRes = await fetch(`${BACKEND_URL}/users/${id}/actions`, {
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

/**
 * PUT /api/users/[id]/actions
 * Proxy — update a user's extra actions.
 */
export async function PUT(req: NextRequest, ctx: RouteContext) {
    const { id } = await ctx.params
    const token = req.cookies.get('access_token')?.value

    if (!token) {
        return NextResponse.json(
            { success: false, message: 'Not authenticated.' },
            { status: 401 }
        )
    }

    try {
        const body = await req.json()

        const backendRes = await fetch(`${BACKEND_URL}/users/${id}/actions`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
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
