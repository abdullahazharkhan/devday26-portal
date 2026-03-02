import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:5000'

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()

        const backendRes = await fetch(`${BACKEND_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        })

        const data = await backendRes.json()

        return NextResponse.json(data, { status: backendRes.status })
    } catch {
        return NextResponse.json(
            { success: false, message: 'Could not reach the server. Please try again.' },
            { status: 503 }
        )
    }
}
