import 'server-only'
import { createHash } from 'node:crypto'

const STATS_TTL_MS = 60_000
const MAX_STATS_CACHE_ENTRIES = 100

type CachedStats = {
    data: unknown
    cachedAt: number
}

const statsCache = new Map<string, CachedStats>()

function sessionKey(accessToken: string): string {
    return createHash('sha256').update(accessToken).digest('base64url')
}

export function getCachedStats(accessToken: string | undefined): unknown | null {
    if (!accessToken) return null

    const key = sessionKey(accessToken)
    const entry = statsCache.get(key)
    if (!entry) return null

    if (Date.now() - entry.cachedAt > STATS_TTL_MS) {
        statsCache.delete(key)
        return null
    }

    return entry.data
}

export function setCachedStats(accessToken: string | undefined, data: unknown): void {
    if (!accessToken) return

    while (statsCache.size >= MAX_STATS_CACHE_ENTRIES) {
        const oldestKey = statsCache.keys().next().value as string | undefined
        if (!oldestKey) break
        statsCache.delete(oldestKey)
    }

    statsCache.set(sessionKey(accessToken), { data, cachedAt: Date.now() })
}

export function invalidateStatsCache(): void {
    statsCache.clear()
}
