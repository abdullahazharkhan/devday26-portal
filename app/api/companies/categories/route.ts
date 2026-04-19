import { NextRequest, NextResponse } from 'next/server'
import { fetchWithAuth, applyCookies, unauthorizedResponse } from '@/lib/fetchWithAuth'

const CATEGORIES = [
    { id: 'cat-software', label: 'SOFTWARE' },
    { id: 'cat-ai', label: 'AI' },
    { id: 'cat-marketing', label: 'MARKETING' },
    { id: 'cat-finance', label: 'FINANCE' },
    { id: 'cat-design', label: 'DESIGN' },
]

export async function GET(req: NextRequest) {
    try {
        const { data, status, setCookieHeaders } = await fetchWithAuth(req, '/companies/categories')

        if (status === 401) return unauthorizedResponse()

        const remoteCategories = Array.isArray(data)
            ? data
            : Array.isArray((data as any)?.data)
            ? (data as any).data
            : null

        if (status === 200 && remoteCategories) {
            const response = NextResponse.json({ success: true, data: remoteCategories }, { status })
            applyCookies(response, setCookieHeaders)
            return response
        }
    } catch {
        // Fall back to local category list when remote category lookup is unavailable.
    }

    return NextResponse.json({ success: true, data: CATEGORIES })
}
