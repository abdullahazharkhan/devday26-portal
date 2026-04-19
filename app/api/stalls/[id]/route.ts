import { NextRequest, NextResponse } from 'next/server'
import { fetchWithAuth, applyCookies, unauthorizedResponse } from '@/lib/fetchWithAuth'

type RouteContext = { params: Promise<{ id: string }> }

/**
 * GET /api/stalls/[id]
 * Proxy — get single stall details.
 */
export async function GET(req: NextRequest, ctx: RouteContext) {
    const { id } = await ctx.params
    try {
        const { data, status, setCookieHeaders } = await fetchWithAuth(req, `/stalls/${id}`)

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

/**
 * PATCH /api/stalls/[id]
 * Proxy — update a stall.
 */
export async function PATCH(req: NextRequest, ctx: RouteContext) {
    const { id } = await ctx.params
    try {
        const body = await req.json()

        const { data, status, setCookieHeaders } = await fetchWithAuth(req, `/stalls/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
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

/**
 * DELETE /api/stalls/[id]
 * Proxy — delete a stall.
 */
export async function DELETE(req: NextRequest, ctx: RouteContext) {
    const { id } = await ctx.params
    try {
        const { data, status, setCookieHeaders } = await fetchWithAuth(req, `/stalls/${id}`, {
            method: 'DELETE',
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
