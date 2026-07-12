import 'server-only'

const DEFAULT_TIMEOUT_MS = 15_000
const SLOW_REQUEST_MS = 1_000

function backendUrl(path: string): string {
    const baseUrl = (process.env.BACKEND_URL ?? 'http://localhost:5000').replace(/\/+$/, '')
    return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`
}

/**
 * Fetch the Express API with a bounded wait and no framework response caching.
 * Node's fetch connection pool still reuses warm TCP/TLS connections.
 */
export async function fetchBackend(
    path: string,
    init: RequestInit = {},
    timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<Response> {
    const url = backendUrl(path)
    const timeoutSignal = AbortSignal.timeout(timeoutMs)
    const signal = init.signal
        ? AbortSignal.any([init.signal, timeoutSignal])
        : timeoutSignal
    const startedAt = performance.now()

    try {
        const response = await fetch(url, {
            ...init,
            cache: 'no-store',
            signal,
        })
        const durationMs = performance.now() - startedAt

        if (durationMs >= SLOW_REQUEST_MS) {
            console.warn(
                `[upstream] ${init.method ?? 'GET'} ${new URL(url).pathname} ${response.status} ${Math.round(durationMs)}ms`
            )
        }

        return response
    } catch (error) {
        const durationMs = performance.now() - startedAt
        console.error(
            `[upstream] ${init.method ?? 'GET'} ${new URL(url).pathname} failed after ${Math.round(durationMs)}ms`,
            error instanceof Error ? error.message : 'Unknown error'
        )
        throw error
    }
}
