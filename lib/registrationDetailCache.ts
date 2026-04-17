/**
 * Short-lived in-memory cache for registration detail responses.
 * Shared between the GET /api/registrations/[id] proxy and the
 * POST /api/registrations/[id]/payment-status handler so that a
 * payment-status update immediately busts the cached detail.
 */

const DETAIL_FRESH_TTL_MS = 15_000 // fast path freshness window
const DETAIL_STALE_TTL_MS = 60_000 // serve stale while background refresh runs
const DETAIL_CACHE_MAX_ENTRIES = 500

export type CacheLookupResult =
    | { state: 'fresh'; data: unknown }
    | { state: 'stale'; data: unknown }
    | { state: 'miss' }

interface CachedDetail {
    data: unknown
    cachedAt: number
    freshUntil: number
    staleUntil: number
}

const detailCache = new Map<string, CachedDetail>()
const inFlightRefreshes = new Map<string, Promise<unknown>>()

function touchAsMostRecentlyUsed(key: string, entry: CachedDetail): void {
    detailCache.delete(key)
    detailCache.set(key, entry)
}

function evictIfNeeded(): void {
    while (detailCache.size > DETAIL_CACHE_MAX_ENTRIES) {
        const oldestKey = detailCache.keys().next().value
        if (!oldestKey) break
        detailCache.delete(oldestKey)
    }
}

export function getCachedDetail(key: string): CacheLookupResult {
    const entry = detailCache.get(key)
    if (!entry) return { state: 'miss' }

    const now = Date.now()
    if (now > entry.staleUntil) {
        detailCache.delete(key)
        return { state: 'miss' }
    }

    // Keep hot keys near the tail to approximate LRU behavior.
    touchAsMostRecentlyUsed(key, entry)

    if (now <= entry.freshUntil) {
        return { state: 'fresh', data: entry.data }
    }

    return { state: 'stale', data: entry.data }
}

export function setCachedDetail(key: string, data: unknown): void {
    const now = Date.now()
    detailCache.set(key, {
        data,
        cachedAt: now,
        freshUntil: now + DETAIL_FRESH_TTL_MS,
        staleUntil: now + DETAIL_STALE_TTL_MS,
    })
    evictIfNeeded()
}

export function invalidateDetailCache(id: string): void {
    const idPrefix = `${id}::`
    for (const key of detailCache.keys()) {
        if (key === id || key.startsWith(idPrefix)) {
            detailCache.delete(key)
        }
    }
}

export function runDetailSingleflight<T>(cacheKey: string, runner: () => Promise<T>): Promise<T> {
    const existing = inFlightRefreshes.get(cacheKey)
    if (existing) return existing as Promise<T>

    const inFlight = runner().finally(() => {
        inFlightRefreshes.delete(cacheKey)
    })

    inFlightRefreshes.set(cacheKey, inFlight as Promise<unknown>)
    return inFlight
}
