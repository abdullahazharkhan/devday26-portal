import { NextRequest, NextResponse } from 'next/server'
import { fetchWithAuth, applyCookies, unauthorizedResponse } from '@/lib/fetchWithAuth'
import { getCachedDetail, setCachedDetail } from '@/lib/registrationDetailCache'

type RouteContext = { params: Promise<{ id: string }> }

/**
 * GET /api/registrations/[id]
 * Proxy to backend — full registration details including team members.
 * Results are cached for 30 s so prev/next navigation is instant.
 */
export async function GET(req: NextRequest, ctx: RouteContext) {
    const { id } = await ctx.params
    const accessToken = req.cookies.get('access_token')?.value

    const cached = getCachedDetail(id, accessToken)
    if (cached) return NextResponse.json(cached, { status: 200 })

    try {
        const { data, status, setCookieHeaders } = await fetchWithAuth(
            req,
            `/registrations/${id}`
        )

        if (status === 401) return unauthorizedResponse()

        if (status === 200 && (data as { success?: boolean }).success) {
            setCachedDetail(id, accessToken, data)
        }

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
