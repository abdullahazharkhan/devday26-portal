import { NextRequest, NextResponse } from 'next/server'
import { fetchWithAuth, applyCookies, unauthorizedResponse } from '@/lib/fetchWithAuth'

type RouteContext = { params: Promise<{ id: string }> }

/**
 * PATCH /api/companies/[id]/assign-booth
 * Proxy — assign or update company booth allocation.
 */
export async function PATCH(req: NextRequest, ctx: RouteContext) {
    const { id } = await ctx.params
    try {
        const body = await req.json()

        const { data, status, setCookieHeaders } = await fetchWithAuth(
            req,
            `/companies/${id}/assign-booth`,
            {
                method: 'PATCH',
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
