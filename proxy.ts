import { NextRequest, NextResponse } from 'next/server'

// ─── Route → required role mapping ───────────────────────────────────────────
const ROUTE_ROLE: Record<string, string> = {
    'competitions':           'COMPETITIONS',
    'food':                   'FOOD',
    'gr':                     'GR',
    'pr':                     'PR',
    'excom':                  'EXCOM',
    'super-admin':            'SUPERADMIN',
    'ambassador-management':  'AMBASSADOR_MANAGEMENT',
}

// Role → home dashboard (used for wrong-role redirects)
const ROLE_HOME: Record<string, string> = {
    COMPETITIONS:          '/dashboard/competitions',
    FOOD:                  '/dashboard/food',
    GR:                    '/dashboard/gr',
    PR:                    '/dashboard/pr',
    EXCOM:                 '/dashboard/excom',
    SUPERADMIN:            '/dashboard/super-admin',
    AMBASSADOR_MANAGEMENT: '/dashboard/ambassador-management',
}

// ─── JWT decoder (no signature verification — edge-safe, no crypto needed) ───
// Security note: The access_token lives in an httpOnly cookie that client JS
// cannot touch. The real auth enforcement is the Supabase-signed JWT itself;
// any forged cookie would be rejected by the backend on every API call.
// This middleware is a UX guard — it prevents accidental wrong-route access.
function decodeJwtPayload(token: string): Record<string, unknown> | null {
    try {
        const parts = token.split('.')
        if (parts.length !== 3) return null

        // base64url → base64 → decode
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
        const padded  = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=')
        const decoded = atob(padded)
        return JSON.parse(decoded) as Record<string, unknown>
    } catch {
        return null
    }
}

function getRoleFromPayload(payload: Record<string, unknown>): string | null {
    // Supabase puts user-supplied metadata under user_metadata
    // and privileged metadata (set via admin API) under app_metadata
    const appMeta  = payload.app_metadata  as Record<string, unknown> | undefined
    const userMeta = payload.user_metadata as Record<string, unknown> | undefined

    const role =
        (appMeta?.role  as string | undefined) ??
        (userMeta?.role as string | undefined) ??
        null

    return role ? String(role).toUpperCase() : null
}

// ─── Middleware ───────────────────────────────────────────────────────────────
export async function proxy(req: NextRequest) {
    const { pathname } = req.nextUrl

    // redirect bare root to dashboard home
    if (pathname === '/') {
        const redirectUrl = req.nextUrl.clone()
        redirectUrl.pathname = '/dashboard'
        redirectUrl.search   = ''
        return NextResponse.redirect(redirectUrl)
    }

    // if a logged-in user tries to visit auth pages, send them to dashboard
    if (pathname === '/login' || pathname === '/register') {
        const token = req.cookies.get('access_token')?.value
        if (token) {
            const payload = decodeJwtPayload(token)
            const exp = payload?.exp as number | undefined
            if (payload && !(exp && Date.now() / 1000 > exp)) {
                const redirectUrl = req.nextUrl.clone()
                redirectUrl.pathname = '/dashboard'
                redirectUrl.search   = ''
                return NextResponse.redirect(redirectUrl)
            }
        }
        return NextResponse.next()
    }

    // Only guard /dashboard/* routes
    if (!pathname.startsWith('/dashboard')) {
        return NextResponse.next()
    }

    const token = req.cookies.get('access_token')?.value

    // No access_token — attempt a silent refresh before sending to login
    if (!token) {
        const refreshToken = req.cookies.get('refresh_token')?.value

        if (!refreshToken) {
            const loginUrl = req.nextUrl.clone()
            loginUrl.pathname = '/login'
            loginUrl.search   = ''
            return NextResponse.redirect(loginUrl)
        }

        // Attempt token refresh inline (middleware can use fetch)
        try {
            const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:5000'
            const refreshRes = await fetch(`${backendUrl}/auth/refresh`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ refreshToken }),
            })

            if (refreshRes.ok) {
                const json = await refreshRes.json() as {
                    success:      boolean
                    accessToken:  string
                    refreshToken: string
                    expiresIn:    number
                }

                if (json.success) {
                    const isProduction = process.env.NODE_ENV === 'production'
                    const secure = isProduction ? '; Secure' : ''

                    // Allow through and set the refreshed cookies on the response
                    const response = NextResponse.next()
                    response.headers.append('Set-Cookie', `access_token=${json.accessToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${json.expiresIn ?? 3600}${secure}`)
                    response.headers.append('Set-Cookie', `refresh_token=${json.refreshToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}${secure}`)
                    return response
                }
            }
        } catch {
            // Refresh request failed (backend down, network issue) — send to login
        }

        const loginUrl = req.nextUrl.clone()
        loginUrl.pathname = '/login'
        loginUrl.search   = ''
        return NextResponse.redirect(loginUrl)
    }

    const payload = decodeJwtPayload(token)

    // Malformed token → send to login
    if (!payload) {
        const loginUrl = req.nextUrl.clone()
        loginUrl.pathname = '/login'
        loginUrl.search   = ''
        return NextResponse.redirect(loginUrl)
    }

    // Check token expiry (exp is unix seconds)
    const exp = payload.exp as number | undefined
    if (exp && Date.now() / 1000 > exp) {
        const loginUrl = req.nextUrl.clone()
        loginUrl.pathname = '/login'
        loginUrl.search   = ''
        return NextResponse.redirect(loginUrl)
    }

    const role = getRoleFromPayload(payload)

    // No role in token → deny
    if (!role) {
        const loginUrl = req.nextUrl.clone()
        loginUrl.pathname = '/login'
        loginUrl.search   = ''
        return NextResponse.redirect(loginUrl)
    }

    // Extract team slug: /dashboard/<team>/...
    const segments = pathname.split('/').filter(Boolean) // ['dashboard', 'super-admin', ...]
    const teamSlug = segments[1] // may be undefined if just /dashboard

    // /dashboard with no team → redirect to role's home
    if (!teamSlug) {
        const home = ROLE_HOME[role]
        if (home) {
            const homeUrl = req.nextUrl.clone()
            homeUrl.pathname = home
            homeUrl.search   = ''
            return NextResponse.redirect(homeUrl)
        }
        return NextResponse.next()
    }

    const requiredRole = ROUTE_ROLE[teamSlug]

    // Unknown team slug → let Next.js handle (404)
    if (!requiredRole) return NextResponse.next()

    // SUPERADMIN can access any dashboard
    if (role === 'SUPERADMIN') return NextResponse.next()

    // Role matches → allow
    if (role === requiredRole) return NextResponse.next()

    // Wrong role → redirect to the user's own dashboard
    const correctHome = ROLE_HOME[role]
    if (correctHome) {
        const redirectUrl = req.nextUrl.clone()
        redirectUrl.pathname = correctHome
        redirectUrl.search   = ''
        return NextResponse.redirect(redirectUrl)
    }

    // Fallback
    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.search   = ''
    return NextResponse.redirect(loginUrl)
}

export const config = {
    matcher: ['/', '/login', '/register', '/dashboard/:path*'],
}
