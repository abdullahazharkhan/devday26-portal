import { NextRequest, NextResponse } from 'next/server'
import { fetchWithAuth, applyCookies, unauthorizedResponse } from '@/lib/fetchWithAuth'
import { invalidateDetailCache } from '@/lib/registrationDetailCache'
import { invalidateStatsCache } from '@/lib/dashboardStatsCache'

type Params = Promise<{ id: string }>

/**
 * POST /api/registrations/[id]/payment-status
 * Proxy to backend — update payment status and add a note.
 */
export async function POST(req: NextRequest, segmentPromise: { params: Params }) {
    try {
        const { id } = await segmentPromise.params
        const body = await req.json()
        const { data, status, setCookieHeaders } = await fetchWithAuth(
            req,
            `/registrations/${id}/payment-status`,
            {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            }
        )

        if (status === 401) return unauthorizedResponse()

        // Bust the detail cache so the next load reflects the new status
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
