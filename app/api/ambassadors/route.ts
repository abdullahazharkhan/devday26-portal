import { NextRequest, NextResponse } from 'next/server'
import { fetchWithAuth, applyCookies, unauthorizedResponse } from '@/lib/fetchWithAuth'

/** GET /api/ambassadors — list all brand ambassadors */
export async function GET(req: NextRequest) {
    try {
        const { data, status, setCookieHeaders } = await fetchWithAuth(req, '/ambassadors')
        if (status === 401) return unauthorizedResponse()
        const response = NextResponse.json(data, { status })
        applyCookies(response, setCookieHeaders)
        return response
    } catch {
        return NextResponse.json({ success: false, message: 'Could not reach the server.' }, { status: 503 })
    }
}

/** POST /api/ambassadors — create a new brand ambassador */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { data, status, setCookieHeaders } = await fetchWithAuth(req, '/ambassadors', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(body),
        })
        if (status === 401) return unauthorizedResponse()
        const response = NextResponse.json(data, { status })
        applyCookies(response, setCookieHeaders)
        return response
    } catch {
        return NextResponse.json({ success: false, message: 'Could not reach the server.' }, { status: 503 })
    }
}
