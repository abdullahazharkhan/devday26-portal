import { NextRequest, NextResponse } from 'next/server'
import { fetchWithAuth, applyCookies, unauthorizedResponse } from '@/lib/fetchWithAuth'

type Params = Promise<{ id: string }>

/**
 * PATCH /api/participants/[id]
 * Proxy to backend — update participant profile fields.
 */
export async function PATCH(req: NextRequest, segmentPromise: { params: Params }) {
    try {
        const { id } = await segmentPromise.params
        const body = await req.json()

        const { data, status, setCookieHeaders } = await fetchWithAuth(
            req,
            `/participants/${id}`,
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
