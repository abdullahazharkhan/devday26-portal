'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { ALL_ACTIONS, ROLE_DEFAULT_ACTIONS, teamConfig } from '../components/tabsConfig'
import { apiFetch } from '@/lib/apiClient'

// ─── Types ────────────────────────────────────────────────────────────────────

interface StaffUser {
    id: string
    email: string
    fullName: string | null
    nuId: string | null
    staffRole: string | null
    isApproved: boolean | null
    extraActions: string[]
    effectiveActions: string[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 6

const ROLE_OPTIONS = ['ALL', 'SUPERADMIN', 'EXCOM', 'PR', 'GR', 'FOOD', 'COMPETITIONS']

const ACTION_GROUPS = Object.entries(teamConfig).map(([slug, cfg]) => ({
    slug,
    label: cfg.label,
    actions: cfg.tabs.map((t) => t.action),
}))
const groupedActionsSet = new Set(ACTION_GROUPS.flatMap((g) => g.actions))
const ungrouped = Object.keys(ALL_ACTIONS).filter((a) => !groupedActionsSet.has(a))
if (ungrouped.length > 0) {
    ACTION_GROUPS.push({ slug: 'other', label: 'OTHER', actions: ungrouped })
}
const UNIQUE_ACTIONS = [...new Set(ACTION_GROUPS.flatMap((g) => g.actions))]

// ─── Skeleton helpers ─────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
    return <div className={`animate-pulse bg-[#3a2525] rounded-sm ${className ?? ''}`} />
}

function UserCardSkeleton() {
    return (
        <div className="border border-primaryred-muted bg-[#191111] p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-2 flex-1">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-52" />
                </div>
                <Skeleton className="h-5 w-16 shrink-0" />
            </div>
            <div className="flex items-center gap-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-8 w-full mt-1" />
        </div>
    )
}

// ─── User card ────────────────────────────────────────────────────────────────

function UserCard({ user, onSelect }: { user: StaffUser; onSelect: () => void }) {
    const extraCount = user.extraActions.length

    return (
        <div className="border border-primaryred-muted bg-[#191111] p-4 flex flex-col gap-3 hover:border-primaryred transition-colors duration-200">
            <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-0.5 min-w-0">
                    <p className="text-white text-sm font-semibold tracking-wide truncate">
                        {user.fullName ?? '—'}
                    </p>
                    <p className="text-[#C4C4C4] text-xs tracking-wide truncate">{user.email}</p>
                </div>
                <span className={`shrink-0 text-[10px] tracking-widest border px-2 py-0.5 ${
                    user.isApproved
                        ? 'text-green-400 border-green-600'
                        : 'text-yellow-400 border-yellow-600'
                }`}>
                    {user.isApproved ? 'ACTIVE' : 'PENDING'}
                </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="text-[10px] tracking-widest text-primaryred border border-primaryred px-2 py-0.5">
                    {user.staffRole ?? 'NO_ROLE'}
                </span>
                {user.nuId && (
                    <span className="text-[10px] tracking-widest text-[#C4C4C4]">
                        {user.nuId}
                    </span>
                )}
                {extraCount > 0 && (
                    <span className="text-[10px] tracking-widest text-[#C4C4C4]">
                        +{extraCount} extra action{extraCount !== 1 ? 's' : ''}
                    </span>
                )}
            </div>

            <button
                onClick={onSelect}
                className="w-full text-xs tracking-widest text-primaryred border border-primaryred px-4 py-2 hover:bg-primaryred hover:text-white transition-colors duration-200 mt-1"
            >
                MANAGE_ACTIONS
            </button>
        </div>
    )
}

// ─── Action panel ─────────────────────────────────────────────────────────────

function ActionPanel({
    user,
    onBack,
    onSaved,
}: {
    user: StaffUser
    onBack: () => void
    onSaved: (updated: Pick<StaffUser, 'id' | 'extraActions' | 'effectiveActions'>) => void
}) {
    const roleDefaults = useMemo(
        () => new Set(ROLE_DEFAULT_ACTIONS[user.staffRole ?? ''] ?? []),
        [user.staffRole]
    )
    const [checkedActions, setCheckedActions] = useState<Set<string>>(
        () => new Set(user.effectiveActions)
    )
    const [isSaving, setIsSaving] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    const toggleAction = (action: string) => {
        if (roleDefaults.has(action)) return
        setCheckedActions((prev) => {
            const next = new Set(prev)
            if (next.has(action)) next.delete(action)
            else next.add(action)
            return next
        })
        setMessage(null)
    }

    const handleSave = async () => {
        setIsSaving(true)
        setMessage(null)
        try {
            const res = await apiFetch(`/api/users/${user.id}/actions`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ actions: Array.from(checkedActions) }),
            })
            const json = await res.json()
            if (res.ok) {
                setMessage({ type: 'success', text: 'Actions saved successfully.' })
                onSaved({
                    id: user.id,
                    extraActions: json.data.extraActions,
                    effectiveActions: json.data.effectiveActions,
                })
            } else {
                setMessage({ type: 'error', text: json.message ?? 'Failed to save.' })
            }
        } catch {
            setMessage({ type: 'error', text: 'Could not reach the server.' })
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={onBack}
                    className="text-xs tracking-widest text-primaryred border border-primaryred px-4 py-2 hover:bg-primaryred hover:text-white transition-colors duration-200 shrink-0"
                >
                    ← BACK
                </button>
                <div className="min-w-0">
                    <h2 className="text-white font-bold tracking-widest text-sm truncate">
                        {(user.fullName ?? user.email).toUpperCase()}
                    </h2>
                    <p className="text-[#C4C4C4] text-xs tracking-wider mt-0.5">
                        Role: <span className="text-primaryred">{user.staffRole ?? 'NONE'}</span>
                        {' '}— <span className="opacity-70">Role-default actions are locked.</span>
                    </p>
                </div>
            </div>

            {/* Action groups */}
            <div className="border border-primaryred-muted bg-[#271C1C] p-5 sm:p-8 flex flex-col gap-6">
                {ACTION_GROUPS.map((group) => {
                    const shownActions = group.actions.filter((a) => UNIQUE_ACTIONS.includes(a))
                    if (shownActions.length === 0) return null

                    return (
                        <div key={group.slug}>
                            <h3 className="text-primaryred text-xs tracking-[0.2em] font-bold mb-3">
                                {group.label}
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {shownActions.map((action) => {
                                    const isDefault = roleDefaults.has(action)
                                    const isChecked = checkedActions.has(action)
                                    const label = ALL_ACTIONS[action]?.label ?? action

                                    return (
                                        <label
                                            key={`${group.slug}-${action}`}
                                            className={`flex items-center gap-3 px-4 py-2.5 border transition-colors duration-200 select-none ${
                                                isDefault
                                                    ? 'border-primaryred-muted opacity-60 cursor-not-allowed'
                                                    : isChecked
                                                    ? 'border-primaryred bg-primaryred/10 cursor-pointer'
                                                    : 'border-primaryred-muted hover:border-primaryred/50 cursor-pointer'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                disabled={isDefault}
                                                onChange={() => toggleAction(action)}
                                                className="accent-primaryred w-4 h-4 shrink-0"
                                            />
                                            <span className="text-white text-xs tracking-wider flex-1">
                                                {label.toUpperCase()}
                                            </span>
                                            {isDefault && (
                                                <span className="text-[9px] tracking-widest text-primaryred border border-primaryred px-1.5 py-0.5">
                                                    ROLE
                                                </span>
                                            )}
                                        </label>
                                    )
                                })}
                            </div>
                        </div>
                    )
                })}

                {message && (
                    <p className={`text-xs tracking-wide border px-4 py-2 ${
                        message.type === 'success'
                            ? 'text-green-400 border-green-500 bg-green-500/10'
                            : 'text-red-500 border-red-500 bg-red-500/10'
                    }`}>
                        {message.text}
                    </p>
                )}

                <div>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-primaryred text-white text-sm py-3 px-8 tracking-widest hover:bg-primaryred-muted transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? 'SAVING...' : 'SAVE_ACTIONS'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AssignActionsForm() {
    const [users, setUsers] = useState<StaffUser[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [selectedUser, setSelectedUser] = useState<StaffUser | null>(null)

    // Search / filter
    const [search, setSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState('ALL')

    // Pagination
    const [page, setPage] = useState(1)

    // ── Fetch ────────────────────────────────────────────────────────────────

    const fetchUsers = useCallback(async () => {
        setIsLoading(true)
        try {
            const res = await apiFetch('/api/users')
            const json = await res.json()
            if (json.success) setUsers(json.data)
        } catch {
            // silent
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => { fetchUsers() }, [fetchUsers])

    // ── Filter + search ──────────────────────────────────────────────────────

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        return users.filter((u) => {
            const matchRole = roleFilter === 'ALL' || u.staffRole === roleFilter
            const matchSearch =
                !q ||
                (u.fullName?.toLowerCase().includes(q) ?? false) ||
                u.email.toLowerCase().includes(q) ||
                (u.nuId?.toLowerCase().includes(q) ?? false)
            return matchRole && matchSearch
        })
    }, [users, search, roleFilter])

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const safePage = Math.min(page, totalPages)
    const pageUsers = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

    // Reset to page 1 on filter/search change
    useEffect(() => { setPage(1) }, [search, roleFilter])

    // ── Handlers ─────────────────────────────────────────────────────────────

    const handleSaved = (updated: Pick<StaffUser, 'id' | 'extraActions' | 'effectiveActions'>) => {
        setUsers((prev) =>
            prev.map((u) =>
                u.id === updated.id
                    ? { ...u, extraActions: updated.extraActions, effectiveActions: updated.effectiveActions }
                    : u
            )
        )
        setSelectedUser((prev) =>
            prev?.id === updated.id
                ? { ...prev, extraActions: updated.extraActions, effectiveActions: updated.effectiveActions }
                : prev
        )
    }

    // ── Render: action panel ─────────────────────────────────────────────────

    if (selectedUser) {
        return (
            <ActionPanel
                user={selectedUser}
                onBack={() => setSelectedUser(null)}
                onSaved={handleSaved}
            />
        )
    }

    // ── Render: user list ────────────────────────────────────────────────────

    return (
        <div className="flex flex-col gap-5">

            {/* Search + filter bar */}
            <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative flex-1">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name, email, or NU ID..."
                        className="bg-[#191111] border border-primaryred-muted focus:border-primaryred focus:ring-primaryred p-3 pl-9 text-white text-xs tracking-wider placeholder-[#555] transition-all duration-200 focus:outline-none focus:ring-2 w-full"
                    />
                    <svg
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primaryred pointer-events-none"
                        xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0Z" />
                    </svg>
                    {search && (
                        <button
                            onClick={() => setSearch('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#C4C4C4] hover:text-white text-xs"
                        >
                            ✕
                        </button>
                    )}
                </div>

                {/* Role filter */}
                <div className="relative sm:w-52">
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="bg-[#191111] border border-primaryred-muted focus:border-primaryred focus:ring-primaryred p-3 pr-9 text-white text-xs tracking-widest transition-all duration-200 focus:outline-none focus:ring-2 w-full appearance-none"
                    >
                        {ROLE_OPTIONS.map((r) => (
                            <option key={r} value={r}>{r === 'ALL' ? 'ALL ROLES' : r}</option>
                        ))}
                    </select>
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-primaryred">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.24 4.5a.75.75 0 0 1-1.08 0l-4.24-4.5a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" />
                        </svg>
                    </span>
                </div>
            </div>

            {/* Result count */}
            {!isLoading && (
                <p className="text-[#C4C4C4] text-[11px] tracking-widest -mt-2">
                    {filtered.length === 0
                        ? '// NO_USERS_FOUND'
                        : `// SHOWING ${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filtered.length)} OF ${filtered.length} USER${filtered.length !== 1 ? 'S' : ''}`}
                </p>
            )}

            {/* User grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {isLoading
                    ? Array.from({ length: PAGE_SIZE }).map((_, i) => <UserCardSkeleton key={i} />)
                    : pageUsers.map((u) => (
                        <UserCard
                            key={u.id}
                            user={u}
                            onSelect={() => setSelectedUser(u)}
                        />
                    ))
                }
            </div>

            {/* Empty state */}
            {!isLoading && filtered.length === 0 && (
                <div className="border border-primaryred-muted bg-[#271C1C] p-10 flex items-center justify-center">
                    <p className="text-[#C4C4C4] text-xs tracking-widest">// NO_USERS_MATCH_FILTERS</p>
                </div>
            )}

            {/* Pagination */}
            {!isLoading && totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-primaryred-muted pt-4 mt-1">
                    <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={safePage <= 1}
                        className="text-xs tracking-widest text-primaryred border border-primaryred px-4 py-2 hover:bg-primaryred hover:text-white transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        ← PREV
                    </button>

                    <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                            <button
                                key={p}
                                onClick={() => setPage(p)}
                                className={`w-8 h-8 text-xs font-bold tracking-wider border transition-colors duration-200 ${
                                    p === safePage
                                        ? 'bg-primaryred text-white border-primaryred'
                                        : 'text-[#C4C4C4] border-primaryred-muted hover:border-primaryred hover:text-white'
                                }`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={safePage >= totalPages}
                        className="text-xs tracking-widest text-primaryred border border-primaryred px-4 py-2 hover:bg-primaryred hover:text-white transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        NEXT →
                    </button>
                </div>
            )}
        </div>
    )
}