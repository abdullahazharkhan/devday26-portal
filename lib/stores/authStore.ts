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

    /** Call after a successful login response to hydrate the store */
    setUser: (user: AuthUser) => void

    /** Call on logout to wipe the stored profile */
    clearUser: () => void

    /** Convenience selector — true when a user is stored */
    isLoggedIn: () => boolean
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,

            setUser: (user) => set({ user }),

            clearUser: () => set({ user: null }),

            isLoggedIn: () => get().user !== null,
        }),
        {
            name:    'devday-auth',           // localStorage key
            storage: createJSONStorage(() => localStorage),
            // Only persist the user object — actions are not serialisable
            partialize: (state) => ({ user: state.user }),
        }
    )
)
