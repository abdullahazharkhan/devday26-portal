import { NextRequest, NextResponse } from 'next/server'
import { fetchWithAuth, applyCookies, unauthorizedResponse } from '@/lib/fetchWithAuth'

type RouteContext = { params: Promise<{ id: string }> }

/**
 * GET /api/registrations/[id]
 * Proxy to backend — full registration details including team members.
 */
export async function GET(req: NextRequest, ctx: RouteContext) {
    const { id } = await ctx.params
    try {
        const { data, status, setCookieHeaders } = await fetchWithAuth(
            req,
            `/registrations/${id}`
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
