'use client'

/**
 * Client-side fetch wrapper.
 *
 * Mirrors `fetchWithAuth` on the server but from the browser:
 *   - calls the Next.js API route (which handles the actual BE call + cookie refresh server-side)
 *   - if the API route returns 401 (session fully dead), redirects to /login automatically
 *
 * Usage:
 *   const res  = await apiFetch('/api/users')
 *   const json = await res.json()
 */
export async function apiFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
    const res = await fetch(input, init)

    if (res.status === 401) {
        // Session is completely dead (refresh also failed server-side)
        // Redirect to login without polluting the console
        window.location.href = '/login'
        // Return the response anyway so callers don't crash before navigation completes
        return res
    }

    return res
}
