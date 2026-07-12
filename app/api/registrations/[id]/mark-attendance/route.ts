import { NextRequest, NextResponse } from 'next/server'
import { fetchWithAuth, applyCookies, unauthorizedResponse } from '@/lib/fetchWithAuth'
import { invalidateDetailCache } from '@/lib/registrationDetailCache'
import { invalidateStatsCache } from '@/lib/dashboardStatsCache'

type Params = Promise<{ id: string }>

/**
 * POST /api/registrations/[id]/mark-attendance
 * Proxy to backend — mark attendance for all members of a team.
 */
export async function POST(req: NextRequest, segmentPromise: { params: Params }) {
    try {
        const { id } = await segmentPromise.params
        const body = await req.json()

        const { data, status, setCookieHeaders } = await fetchWithAuth(
            req,
            `/registrations/${id}/mark-attendance`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            }
        )

        if (status === 401) return unauthorizedResponse()
        if (status === 200) {
            invalidateDetailCache(id)
            invalidateStatsCache()
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
