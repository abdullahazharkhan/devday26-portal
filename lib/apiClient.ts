'use client'

const REQUEST_TIMEOUT_MS = 20_000
const GET_CACHE_TTL_MS = 20_000
const MAX_CACHE_ENTRIES = 50

type CachedResponse = {
    response: Response
    expiresAt: number
}

const responseCache = new Map<string, CachedResponse>()
const inFlightRequests = new Map<string, Promise<Response>>()

function requestMethod(input: RequestInfo | URL, init?: RequestInit): string {
    return (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()
}

function requestKey(input: RequestInfo | URL): string {
    if (typeof input === 'string') return input
    if (input instanceof URL) return input.toString()
    return input.url
}

function pruneResponseCache(): void {
    const now = Date.now()
    for (const [key, entry] of responseCache) {
        if (entry.expiresAt <= now) responseCache.delete(key)
    }

    while (responseCache.size >= MAX_CACHE_ENTRIES) {
        const oldestKey = responseCache.keys().next().value as string | undefined
        if (!oldestKey) break
        responseCache.delete(oldestKey)
    }
}

export function invalidateApiCache(pathPrefix?: string): void {
    if (!pathPrefix) {
        responseCache.clear()
        return
    }

    for (const key of responseCache.keys()) {
        if (key.startsWith(pathPrefix)) responseCache.delete(key)
    }
}

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    const signal = init?.signal
        ? AbortSignal.any([init.signal, timeoutSignal])
        : timeoutSignal

    const res = await fetch(input, {
        ...init,
        cache: 'no-store',
        signal,
    })

    if (res.status === 401 && window.location.pathname !== '/login') {
        window.location.assign('/login')
    }

    return res
}

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
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const method = requestMethod(input, init)

    if (method !== 'GET') {
        const response = await fetchWithTimeout(input, init)
        if (response.ok) invalidateApiCache()
        return response
    }

    const key = requestKey(input)
    const cached = responseCache.get(key)
    if (cached && cached.expiresAt > Date.now()) return cached.response.clone()
    if (cached) responseCache.delete(key)

    // Requests with a caller-owned signal must remain independently abortable.
    const canShareRequest = !init?.signal
    if (canShareRequest) {
        const pending = inFlightRequests.get(key)
        if (pending) return (await pending).clone()
    }

    const request: Promise<Response> = fetchWithTimeout(input, init)
        .then((response) => {
            if (response.ok) {
                pruneResponseCache()
                responseCache.set(key, {
                    response: response.clone(),
                    expiresAt: Date.now() + GET_CACHE_TTL_MS,
                })
            }
            return response
        })
        .finally(() => {
            if (inFlightRequests.get(key) === request) inFlightRequests.delete(key)
        })

    if (canShareRequest) inFlightRequests.set(key, request)
    return (await request).clone()
}
