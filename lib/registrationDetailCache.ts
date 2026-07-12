import 'server-only'
import { createHash } from 'node:crypto'

/**
 * Short-lived in-memory cache for registration detail responses.
 * Shared between the GET /api/registrations/[id] proxy and the
 * POST /api/registrations/[id]/payment-status handler so that a
 * payment-status update immediately busts the cached detail.
 */

const DETAIL_CACHE_TTL_MS = 30_000 // 30 seconds
const MAX_DETAIL_CACHE_ENTRIES = 100

interface CachedDetail {
    registrationId: string
    data: unknown
    cachedAt: number
}

const detailCache = new Map<string, CachedDetail>()

function scopedKey(id: string, accessToken: string): string {
    const sessionScope = createHash('sha256').update(accessToken).digest('base64url')
    return `${sessionScope}:${id}`
}

function pruneCache(): void {
    const now = Date.now()
    for (const [key, entry] of detailCache) {
        if (now - entry.cachedAt > DETAIL_CACHE_TTL_MS) detailCache.delete(key)
    }

    while (detailCache.size >= MAX_DETAIL_CACHE_ENTRIES) {
        const oldestKey = detailCache.keys().next().value as string | undefined
        if (!oldestKey) break
        detailCache.delete(oldestKey)
    }
}

export function getCachedDetail(id: string, accessToken: string | undefined): unknown | null {
    if (!accessToken) return null
    const key = scopedKey(id, accessToken)
    const entry = detailCache.get(key)
    if (!entry) return null
    if (Date.now() - entry.cachedAt > DETAIL_CACHE_TTL_MS) {
        detailCache.delete(key)
        return null
    }
    return entry.data
}

export function setCachedDetail(id: string, accessToken: string | undefined, data: unknown): void {
    if (!accessToken) return
    pruneCache()
    detailCache.set(scopedKey(id, accessToken), { registrationId: id, data, cachedAt: Date.now() })
}

export function invalidateDetailCache(id: string): void {
    for (const [key, entry] of detailCache) {
        if (entry.registrationId === id) detailCache.delete(key)
    }
}

export function invalidateAllDetailCache(): void {
    detailCache.clear()
}
