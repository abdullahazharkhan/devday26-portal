'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import DataTable, { Column } from '../components/DataTable'
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

const PAGE_SIZE = 12

const ROLE_OPTIONS = ['ALL', 'SUPERADMIN', 'EXCOM', 'PR', 'GR', 'FOOD', 'COMPETITIONS']

// Display-friendly team labels
const ROLE_LABEL: Record<string, string> = {
    SUPERADMIN:   'SUPER_ADMIN',
    EXCOM:        'EXCOM',
    PR:           'PR_TEAM',
    GR:           'GR_TEAM',
    FOOD:         'FOOD_TEAM',
    COMPETITIONS: 'COMPETITIONS_TEAM',
}

// Preferred order when displaying ALL groups
const ROLE_ORDER = ['SUPERADMIN', 'EXCOM', 'PR', 'GR', 'FOOD', 'COMPETITIONS']

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({
    current,
    total,
    onChange,
}: {
    current: number
    total: number
    onChange: (p: number) => void
}) {
    if (total <= 1) return null

    // Build page buttons: always show first, last, current ±1 and ellipses
    const range: (number | '...')[] = []
    for (let i = 1; i <= total; i++) {
        if (i === 1 || i === total || (i >= current - 1 && i <= current + 1)) {
            range.push(i)
        } else if (range[range.length - 1] !== '...') {
            range.push('...')
        }
    }

    return (
        <div className="flex items-center justify-between border-t border-primaryred-muted pt-4 mt-1">
            <button
                onClick={() => onChange(Math.max(1, current - 1))}
                disabled={current <= 1}
                className="text-xs tracking-widest text-primaryred border border-primaryred px-4 py-2 hover:bg-primaryred hover:text-white transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
            >
                ← PREV
            </button>

            <div className="flex items-center gap-1 flex-wrap justify-center">
                {range.map((p, idx) =>
                    p === '...' ? (
                        <span key={`ellipsis-${idx}`} className="w-8 text-center text-[#C4C4C4] text-xs">
                            …
                        </span>
                    ) : (
                        <button
                            key={p}
                            onClick={() => onChange(p)}
                            className={`w-8 h-8 text-xs font-bold tracking-wider border transition-colors duration-200 ${
                                p === current
                                    ? 'bg-primaryred text-white border-primaryred'
                                    : 'text-[#C4C4C4] border-primaryred-muted hover:border-primaryred hover:text-white'
                            }`}
                        >
                            {p}
                        </button>
                    )
                )}
            </div>

            <button
                onClick={() => onChange(Math.min(total, current + 1))}
                disabled={current >= total}
                className="text-xs tracking-widest text-primaryred border border-primaryred px-4 py-2 hover:bg-primaryred hover:text-white transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
            >
                NEXT →
            </button>
        </div>
    )
}

// ─── Group header row ─────────────────────────────────────────────────────────

function GroupHeader({ title, count }: { title: string; count: number }) {
    return (
        <div className="flex items-center gap-3 px-4 py-2 bg-[#271C1C] border-b border-primaryred-muted">
            <span className="text-primaryred text-[11px] tracking-[0.2em] font-bold">{title}</span>
            <span className="text-[#C4C4C4] text-[10px] tracking-widest">
                [{count} {count === 1 ? 'USER' : 'USERS'}]
            </span>
            <div className="flex-1 h-px bg-primaryred-muted" />
        </div>
    )
}

// ─── Column definitions ───────────────────────────────────────────────────────

const COLUMNS: Column<StaffUser>[] = [
    {
        key: 'index',
        header: '#',
        minWidth: '3rem',
        headerClassName: 'w-12',
        className: 'text-[#C4C4C4] font-mono',
        render: (_row, i) => String(i + 1).padStart(2, '0'),
    },
    {
        key: 'fullName',
        header: 'FULL NAME',
        minWidth: '12rem',
        render: (row) => (
            <span className="font-semibold tracking-wide text-white">
                {row.fullName ?? <span className="text-[#C4C4C4]">—</span>}
            </span>
        ),
    },
    {
        key: 'nuId',
        header: 'NU ID',
        minWidth: '8rem',
        className: 'font-mono text-[#C4C4C4]',
        render: (row) => row.nuId ?? <span className="text-[#555]">—</span>,
    },
    {
        key: 'email',
        header: 'EMAIL',
        minWidth: '16rem',
        className: 'text-[#C4C4C4] tracking-wide',
    },
    {
        key: 'staffRole',
        header: 'ROLE',
        minWidth: '10rem',
        render: (row) => (
            <span className="text-[10px] tracking-widest border border-primaryred text-primaryred px-2 py-0.5">
                {ROLE_LABEL[row.staffRole ?? ''] ?? row.staffRole ?? 'NO_ROLE'}
            </span>
        ),
    },
    {
        key: 'extraActions',
        header: 'EXTRA ACTIONS',
        minWidth: '9rem',
        className: 'text-center',
        headerClassName: 'text-center',
        render: (row) => {
            const n = row.extraActions?.length ?? 0
            return (
                <span className={`text-xs font-mono ${n > 0 ? 'text-white' : 'text-[#555]'}`}>
                    {n > 0 ? `+${n}` : '—'}
                </span>
            )
        },
    },
    {
        key: 'isApproved',
        header: 'STATUS',
        minWidth: '7rem',
        render: (row) => (
            <span
                className={`text-[10px] tracking-widest border px-2 py-0.5 ${
                    row.isApproved
                        ? 'text-green-400 border-green-600'
                        : 'text-yellow-400 border-yellow-600'
                }`}
            >
                {row.isApproved ? 'ACTIVE' : 'PENDING'}
            </span>
        ),
    },
]

// ─── Main component ───────────────────────────────────────────────────────────

export default function ViewAllUsersTable() {
    const [users, setUsers]       = useState<StaffUser[]>([])
    const [isLoading, setLoading] = useState(true)
    const [error, setError]       = useState<string | null>(null)

    const [search, setSearch]         = useState('')
    const [roleFilter, setRoleFilter] = useState('ALL')
    const [page, setPage]             = useState(1)

    // ── Fetch ────────────────────────────────────────────────────────────────

    const fetchUsers = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const res  = await apiFetch('/api/users')
            const json = await res.json()
            if (json.success) setUsers(json.data)
            else setError(json.message ?? 'Failed to load users.')
        } catch {
            setError('Could not reach the server.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchUsers() }, [fetchUsers])

    // ── Filter + search ──────────────────────────────────────────────────────

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        return users.filter((u) => {
            const matchRole   = roleFilter === 'ALL' || u.staffRole === roleFilter
            const matchSearch =
                !q ||
                (u.fullName?.toLowerCase().includes(q) ?? false) ||
                u.email.toLowerCase().includes(q) ||
                (u.nuId?.toLowerCase().includes(q) ?? false)
            return matchRole && matchSearch
        })
    }, [users, search, roleFilter])

    // Reset page whenever filter changes
    useEffect(() => { setPage(1) }, [search, roleFilter])

    // ── Paginate ─────────────────────────────────────────────────────────────

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const safePage   = Math.min(page, totalPages)
    const pageRows   = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

    // ── Group detection (only when ALL roles shown and not loading) ──────────

    /**
     * Builds an ordered list of { role, rows } groups for the current page.
     * We keep per-page grouping so the group headers appear naturally inline.
     */
    const groups = useMemo<{ role: string; rows: StaffUser[] }[]>(() => {
        if (roleFilter !== 'ALL') return []

        // Sort filtered list by ROLE_ORDER priority so groups stay consistent across pages
        const sorted = [...filtered].sort((a, b) => {
            const ai = ROLE_ORDER.indexOf(a.staffRole ?? '')
            const bi = ROLE_ORDER.indexOf(b.staffRole ?? '')
            return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
        })

        // Re-slice after sort
        const paged = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

        const groupMap = new Map<string, StaffUser[]>()
        for (const u of paged) {
            const role = u.staffRole ?? 'UNKNOWN'
            if (!groupMap.has(role)) groupMap.set(role, [])
            groupMap.get(role)!.push(u)
        }
        return Array.from(groupMap.entries()).map(([role, rows]) => ({ role, rows }))
    }, [filtered, roleFilter, safePage])

    // ── Summary counts for group header (full-list, not just page) ───────────

    const roleCounts = useMemo(() => {
        const map: Record<string, number> = {}
        for (const u of filtered) {
            const r = u.staffRole ?? 'UNKNOWN'
            map[r] = (map[r] ?? 0) + 1
        }
        return map
    }, [filtered])

    // ── Sorted page rows for flat (single-role filter) mode ──────────────────

    const flatPageRows = useMemo(() => {
        if (roleFilter === 'ALL') return []
        return filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
    }, [filtered, roleFilter, safePage])

    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="flex flex-col gap-5">

            {/* ── Filter bar ─────────────────────────────────────────────── */}
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
                        xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                        strokeWidth={2} stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round"
                            d="m21 21-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0Z" />
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
                            <option key={r} value={r}>
                                {r === 'ALL' ? 'ALL TEAMS' : (ROLE_LABEL[r] ?? r)}
                            </option>
                        ))}
                    </select>
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-primaryred">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"
                            fill="currentColor" className="h-4 w-4">
                            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.24 4.5a.75.75 0 0 1-1.08 0l-4.24-4.5a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" />
                        </svg>
                    </span>
                </div>

                {/* Refresh */}
                <button
                    onClick={fetchUsers}
                    disabled={isLoading}
                    title="Refresh"
                    className="border border-primaryred-muted text-primaryred px-4 py-3 text-xs tracking-widest hover:border-primaryred hover:bg-primaryred/10 transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >
                    ↺
                </button>
            </div>

            {/* ── Summary line ────────────────────────────────────────────── */}
            {!isLoading && !error && (
                <p className="text-[#C4C4C4] text-[11px] tracking-widest -mt-2">
                    {filtered.length === 0
                        ? '// NO_USERS_FOUND'
                        : `// SHOWING ${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filtered.length)} OF ${filtered.length} USER${filtered.length !== 1 ? 'S' : ''}`}
                </p>
            )}

            {/* ── Error state ──────────────────────────────────────────────── */}
            {error && (
                <div className="border border-red-800 bg-red-900/20 px-5 py-4 text-red-400 text-xs tracking-widest">
                    // ERROR: {error}
                </div>
            )}

            {/* ── Table — grouped (ALL) mode ───────────────────────────────── */}
            {!error && roleFilter === 'ALL' && (
                isLoading ? (
                    <DataTable
                        columns={COLUMNS}
                        rows={[]}
                        keyExtractor={(u) => u.id}
                        loading
                        skeletonRowCount={PAGE_SIZE}
                    />
                ) : groups.length === 0 ? (
                    <DataTable
                        columns={COLUMNS}
                        rows={[]}
                        keyExtractor={(u) => u.id}
                        emptyMessage="// NO_USERS_MATCH_FILTERS"
                    />
                ) : (
                    <div className="border border-primaryred-muted bg-[#191111] overflow-x-auto">
                        {groups.map(({ role, rows }) => (
                            <div key={role}>
                                <GroupHeader
                                    title={ROLE_LABEL[role] ?? role}
                                    count={roleCounts[role] ?? rows.length}
                                />
                                {/* Re-use DataTable without its outer border */}
                                <div className="[&>div]:border-0 [&>div]:rounded-none">
                                    <DataTable
                                        columns={COLUMNS}
                                        rows={rows}
                                        keyExtractor={(u) => u.id}
                                        emptyMessage="// NO_USERS"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}

            {/* ── Table — flat (single role) mode ─────────────────────────── */}
            {!error && roleFilter !== 'ALL' && (
                <DataTable
                    columns={COLUMNS}
                    rows={flatPageRows}
                    keyExtractor={(u) => u.id}
                    loading={isLoading}
                    skeletonRowCount={PAGE_SIZE}
                    emptyMessage="// NO_USERS_MATCH_FILTERS"
                />
            )}

            {/* ── Pagination ──────────────────────────────────────────────── */}
            {!isLoading && !error && filtered.length > 0 && (
                <Pagination
                    current={safePage}
                    total={totalPages}
                    onChange={setPage}
                />
            )}
        </div>
    )
}
