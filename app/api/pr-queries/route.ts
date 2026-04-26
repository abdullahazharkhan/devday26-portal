import { NextRequest, NextResponse } from 'next/server'
import { fetchWithAuth, applyCookies, unauthorizedResponse } from '@/lib/fetchWithAuth'

/**
 * GET /api/pr-queries
 * Proxy → GET /pr-queries on the backend.
 * Supports ?status=PENDING|APPROVED|REJECTED  ?page=  ?limit=
 */
export async function GET(req: NextRequest) {
    try {
        const { search } = new URL(req.url)
        const { data, status, setCookieHeaders } = await fetchWithAuth(
            req,
            `/pr-queries${search}`
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

/**
 * POST /api/pr-queries
 * Proxy → POST /pr-queries on the backend.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { data, status, setCookieHeaders } = await fetchWithAuth(
            req,
            '/pr-queries',
            {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(body),
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
