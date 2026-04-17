/**
 * Short-lived in-memory cache for registration list responses.
 * Prevents redundant round-trips when navigating the same page
 * or switching back to the registrations tab.
 */

const LIST_CACHE_TTL_MS = 10_000 // 10 seconds

interface CachedList {
    data: unknown
    cachedAt: number
}

const listCache = new Map<string, CachedList>()

export function getCachedList(key: string): unknown | null {
    const entry = listCache.get(key)
    if (!entry) return null
    if (Date.now() - entry.cachedAt > LIST_CACHE_TTL_MS) {
        listCache.delete(key)
        return null
    }
    return entry.data
}

export function setCachedList(key: string, data: unknown): void {
    listCache.set(key, { data, cachedAt: Date.now() })
    // Prune old entries to avoid unbounded growth
    if (listCache.size > 200) {
        const now = Date.now()
        for (const [k, v] of listCache) {
            if (now - v.cachedAt > LIST_CACHE_TTL_MS) listCache.delete(k)
        }
    }
}

export function invalidateListCache(): void {
    listCache.clear()
}
