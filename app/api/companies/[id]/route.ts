import { NextRequest, NextResponse } from 'next/server'
import { fetchWithAuth, applyCookies, unauthorizedResponse } from '@/lib/fetchWithAuth'

type RouteContext = { params: Promise<{ id: string }> }

/**
 * GET /api/companies/[id]
 * Proxy — get single company details.
 */
export async function GET(req: NextRequest, ctx: RouteContext) {
    const { id } = await ctx.params
    try {
        const { data, status, setCookieHeaders } = await fetchWithAuth(req, `/companies/${id}`)

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
 * PATCH /api/companies/[id]
 * Proxy — update company profile.
 */
export async function PATCH(req: NextRequest, ctx: RouteContext) {
    const { id } = await ctx.params
    try {
        const body = await req.json()

        const { data, status, setCookieHeaders } = await fetchWithAuth(req, `/companies/${id}`, {
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
 * DELETE /api/companies/[id]
 * Proxy — delete company.
 */
export async function DELETE(req: NextRequest, ctx: RouteContext) {
    const { id } = await ctx.params
    try {
        const { data, status, setCookieHeaders } = await fetchWithAuth(req, `/companies/${id}`, {
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
