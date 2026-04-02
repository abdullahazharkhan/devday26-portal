/**
 * Short-lived in-memory cache for registration detail responses.
 * Shared between the GET /api/registrations/[id] proxy and the
 * POST /api/registrations/[id]/payment-status handler so that a
 * payment-status update immediately busts the cached detail.
 */

const DETAIL_CACHE_TTL_MS = 30_000 // 30 seconds

interface CachedDetail {
    data: unknown
    cachedAt: number
}

const detailCache = new Map<string, CachedDetail>()

export function getCachedDetail(id: string): unknown | null {
    const entry = detailCache.get(id)
    if (!entry) return null
    if (Date.now() - entry.cachedAt > DETAIL_CACHE_TTL_MS) {
        detailCache.delete(id)
        return null
    }
    return entry.data
}

export function setCachedDetail(id: string, data: unknown): void {
    detailCache.set(id, { data, cachedAt: Date.now() })
}

export function invalidateDetailCache(id: string): void {
    detailCache.delete(id)
}
