import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
    id:         string
    email:      string
    type:       string           // 'STAFF' | 'PARTICIPANT' | ...
    nuId:       string | null
    fullName:   string | null
    staffRole:  string | null    // 'EXCOM' | 'PR' | 'GR' | 'FOOD' | 'COMPETITIONS' | 'SUPERADMIN'
    isApproved: boolean | null
    actions:    string[]         // kebab-case action IDs the user is authorised to perform
}

interface AuthState {
    user: AuthUser | null
    /** Unix-ms timestamp of the last successful setUser / refreshUser call */
    lastFetchedAt: number | null

    /** Call after a successful login response to hydrate the store */
    setUser: (user: AuthUser) => void

    /** Call on logout to wipe the stored profile */
    clearUser: () => void

    /** Convenience selector — true when a user is stored */
    isLoggedIn: () => boolean

    /** True when the cached profile is older than `maxAgeMs` (default 5 min) */
    isStale: (maxAgeMs?: number) => boolean
}

// ─── Store ────────────────────────────────────────────────────────────────────

const DEFAULT_STALE_MS = 5 * 60 * 1000 // 5 minutes

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            lastFetchedAt: null,

            setUser: (user) => set({ user, lastFetchedAt: Date.now() }),

            clearUser: () => set({ user: null, lastFetchedAt: null }),

            isLoggedIn: () => get().user !== null,

            isStale: (maxAgeMs = DEFAULT_STALE_MS) => {
                const ts = get().lastFetchedAt
                if (!ts) return true
                return Date.now() - ts > maxAgeMs
            },
        }),
        {
            name:    'devday-auth',           // localStorage key
            storage: createJSONStorage(() => localStorage),
            // Only persist the user object + timestamp
            partialize: (state) => ({ user: state.user, lastFetchedAt: state.lastFetchedAt }),
        }
    )
)
