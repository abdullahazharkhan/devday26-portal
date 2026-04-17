import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { fetchWithAuth, applyCookies, unauthorizedResponse } from '@/lib/fetchWithAuth'
import { getCachedDetail, runDetailSingleflight, setCachedDetail } from '@/lib/registrationDetailCache'

type RouteContext = { params: Promise<{ id: string }> }
type UpstreamResponse = Awaited<ReturnType<typeof fetchWithAuth>>

export const runtime = 'nodejs'
export const preferredRegion = 'home'

const DETAIL_RESPONSE_CACHE_CONTROL =
    'private, max-age=15, stale-while-revalidate=45, stale-if-error=60'

function withCacheHeaders(response: NextResponse, state: 'HIT_FRESH' | 'HIT_STALE' | 'MISS' | 'BYPASS'): NextResponse {
    response.headers.set('Cache-Control', DETAIL_RESPONSE_CACHE_CONTROL)
    response.headers.set('x-reg-detail-cache', state)
    return response
}

function buildScopedDetailCacheKey(req: NextRequest, registrationId: string): string | null {
    const accessToken = req.cookies.get('access_token')?.value
    if (!accessToken) return null

    const tokenHash = createHash('sha256').update(accessToken).digest('hex').slice(0, 24)
    return `${registrationId}::${tokenHash}`
}

function isCacheableSuccess(status: number, data: unknown): boolean {
    if (status !== 200) return false
    if (!data || typeof data !== 'object') return false
    return (data as { success?: boolean }).success === true
}

async function fetchRegistrationDetail(req: NextRequest, registrationId: string): Promise<UpstreamResponse> {
    return fetchWithAuth(req, `/registrations/${registrationId}`)
}

/**
 * GET /api/registrations/[id]
 * Proxy to backend — full registration details including team members.
 * Uses a short fresh window and serves stale data while refreshing in background.
 */
export async function GET(req: NextRequest, ctx: RouteContext) {
    const { id } = await ctx.params
    const scopedCacheKey = buildScopedDetailCacheKey(req, id)

    if (scopedCacheKey) {
        const cached = getCachedDetail(scopedCacheKey)
        if (cached.state === 'fresh') {
            return withCacheHeaders(NextResponse.json(cached.data, { status: 200 }), 'HIT_FRESH')
        }

        if (cached.state === 'stale') {
            void runDetailSingleflight(scopedCacheKey, async () => {
                const refreshed = await fetchRegistrationDetail(req, id)
                if (isCacheableSuccess(refreshed.status, refreshed.data)) {
                    setCachedDetail(scopedCacheKey, refreshed.data)
                }
                return refreshed
            }).catch(() => undefined)

            return withCacheHeaders(NextResponse.json(cached.data, { status: 200 }), 'HIT_STALE')
        }
    }

    try {
        const upstream = scopedCacheKey
            ? await runDetailSingleflight(scopedCacheKey, () => fetchRegistrationDetail(req, id))
            : await fetchRegistrationDetail(req, id)

        const { data, status, setCookieHeaders } = upstream

        if (status === 401) return unauthorizedResponse()

        if (scopedCacheKey && isCacheableSuccess(status, data)) {
            setCachedDetail(scopedCacheKey, data)
        }

        const response = NextResponse.json(data, { status })
        applyCookies(response, setCookieHeaders)
        return withCacheHeaders(response, scopedCacheKey ? 'MISS' : 'BYPASS')
    } catch {
        return NextResponse.json(
            { success: false, message: 'Could not reach the server.' },
            { status: 503 }
        )
    }
}
