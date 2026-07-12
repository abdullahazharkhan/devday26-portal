'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { apiFetch } from '@/lib/apiClient'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Ambassador {
    id:             string
    fullName:       string
    cnic:           string
    institute:      string
    referralCode:   string
    totalReferrals: number
    email:          string
    isActive:       boolean
    registeredAt:   string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 12

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-GB', {
        day:   '2-digit',
        month: 'short',
        year:  'numeric',
    })
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({
    current,
    total,
    onChange,
}: {
    current: number
    total:   number
    onChange: (p: number) => void
}) {
    if (total <= 1) return null

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
                        <span key={`ellipsis-${idx}`} className="w-8 text-center text-[#C4C4C4] text-xs">…</span>
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

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
    return (
        <tr className="border-b border-primaryred-muted">
            {[140, 120, 90, 100, 60, 70].map((w, i) => (
                <td key={i} className="px-4 py-3">
                    <div className={`animate-pulse bg-[#3a2525] h-3 rounded-sm`} style={{ width: w }} />
                </td>
            ))}
        </tr>
    )
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

function DetailPanel({
    ambassador,
    onClose,
}: {
    ambassador: Ambassador
    onClose:    () => void
}) {
    const fields: { label: string; value: string | number }[] = [
        { label: 'FULL NAME',        value: ambassador.fullName },
        { label: 'EMAIL',            value: ambassador.email },
        { label: 'CNIC',             value: ambassador.cnic },
        { label: 'INSTITUTE',        value: ambassador.institute },
        { label: 'REFERRAL CODE',    value: ambassador.referralCode },
        { label: 'TOTAL REFERRALS',  value: ambassador.totalReferrals },
        { label: 'STATUS',           value: ambassador.isActive ? 'ACTIVE' : 'INACTIVE' },
        { label: 'REGISTERED ON',    value: fmtDate(ambassador.registeredAt) },
    ]

    return (
        <div className="border border-primaryred-muted bg-[#271C1C]">
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-primaryred-muted">
                <div>
                    <h2 className="text-white font-bold tracking-widest text-sm">
                        {ambassador.fullName.toUpperCase()}
                    </h2>
                    <p className="text-[#C4C4C4] text-[11px] tracking-wider mt-0.5">
                        {ambassador.referralCode}
                    </p>
                </div>
                <button
                    onClick={onClose}
                    className="text-xs tracking-widest text-primaryred border border-primaryred px-4 py-2 hover:bg-primaryred hover:text-white transition-colors duration-200 shrink-0"
                >
                    ← BACK
                </button>
            </div>

            {/* Fields grid */}
            <div className="p-5 sm:p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {fields.map(({ label, value }) => (
                    <div key={label} className="border border-primaryred-muted bg-[#191111] p-4">
                        <p className="text-[10px] tracking-widest text-primaryred mb-1">{label}</p>
                        <p className={`text-sm font-mono break-all ${
                            label === 'STATUS'
                                ? value === 'ACTIVE' ? 'text-green-400' : 'text-[#C4C4C4]'
                                : 'text-white'
                        }`}>
                            {value}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AmbassadorDashboard() {
    const [ambassadors, setAmbassadors] = useState<Ambassador[]>([])
    const [isLoading,   setLoading]     = useState(true)
    const [error,       setError]       = useState<string | null>(null)
    const [selected,    setSelected]    = useState<Ambassador | null>(null)

    // Filters
    const [search,          setSearch]          = useState('')
    const [instituteFilter, setInstituteFilter] = useState('ALL')
    const [statusFilter,    setStatusFilter]    = useState('ALL')
    const [page,            setPage]            = useState(1)

    const fetchAmbassadors = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const res  = await apiFetch('/api/ambassadors')
            const json = await res.json()
            if (json.success) setAmbassadors(json.data)
            else setError(json.message ?? 'Failed to load ambassadors.')
        } catch {
            setError('Could not reach the server.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchAmbassadors() }, [fetchAmbassadors])

    // Derived institute options
    const instituteOptions = useMemo(() => {
        const unique = Array.from(new Set(ambassadors.map((a) => a.institute))).sort()
        return ['ALL', ...unique]
    }, [ambassadors])

    // Filtered + searched list, sorted by totalReferrals descending (rank #1 = most referrals)
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        return ambassadors
            .filter((a) => {
                const matchesSearch = !q || [a.fullName, a.email, a.cnic, a.referralCode, a.institute]
                    .some((v) => v.toLowerCase().includes(q))
                const matchesInstitute = instituteFilter === 'ALL' || a.institute === instituteFilter
                const matchesStatus    = statusFilter === 'ALL'
                    || (statusFilter === 'ACTIVE'   && a.isActive)
                    || (statusFilter === 'INACTIVE' && !a.isActive)
                return matchesSearch && matchesInstitute && matchesStatus
            })
            .sort((a, b) => b.totalReferrals - a.totalReferrals)
    }, [ambassadors, search, instituteFilter, statusFilter])

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

    // Reset page when filters change
    const handleSearch          = (v: string) => { setSearch(v);          setPage(1) }
    const handleInstituteFilter = (v: string) => { setInstituteFilter(v); setPage(1) }
    const handleStatusFilter    = (v: string) => { setStatusFilter(v);    setPage(1) }

    // ── Detail view ──────────────────────────────────────────────────────────

    if (selected) {
        return <DetailPanel ambassador={selected} onClose={() => setSelected(null)} />
    }

    // ── Table view ───────────────────────────────────────────────────────────

    const selectCls = 'bg-[#191111] border border-primaryred-muted text-white text-xs tracking-wider px-3 py-2 focus:outline-none focus:border-primaryred transition-colors duration-200 appearance-none'

    return (
        <div className="flex flex-col gap-5">

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">

                {/* Search */}
                <div className="relative flex-1 min-w-50">
                    <input
                        type="text"
                        placeholder="Search name, email, CNIC, code..."
                        value={search}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="bg-[#191111] border border-primaryred-muted text-white text-xs tracking-wider px-3 py-2 pr-8 focus:outline-none focus:border-primaryred transition-colors duration-200 w-full placeholder:text-[#5a3535]"
                    />
                    {search && (
                        <button
                            onClick={() => handleSearch('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-[#C4C4C4] hover:text-white text-xs"
                        >
                            ✕
                        </button>
                    )}
                </div>

                {/* Institute filter */}
                <div className="relative">
                    <select value={instituteFilter} onChange={(e) => handleInstituteFilter(e.target.value)} className={selectCls}>
                        {instituteOptions.map((o) => (
                            <option key={o} value={o}>{o === 'ALL' ? 'All Institutes' : o}</option>
                        ))}
                    </select>
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-primaryred text-[10px]">▾</span>
                </div>

                {/* Status filter */}
                <div className="relative">
                    <select value={statusFilter} onChange={(e) => handleStatusFilter(e.target.value)} className={selectCls}>
                        <option value="ALL">All Status</option>
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                    </select>
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-primaryred text-[10px]">▾</span>
                </div>

                {/* Refresh + count */}
                <div className="flex items-center gap-3 ml-auto">
                    <span className="text-[#C4C4C4] text-[11px] tracking-widest whitespace-nowrap">
                        {isLoading ? '// LOADING...' : error ? '// ERROR' : `// ${filtered.length} AMBASSADOR${filtered.length !== 1 ? 'S' : ''}`}
                    </span>
                    <button
                        onClick={fetchAmbassadors}
                        disabled={isLoading}
                        title="Refresh"
                        className="border border-primaryred-muted text-primaryred px-3 py-2 text-xs tracking-widest hover:border-primaryred hover:bg-primaryred/10 transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        ↺
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="border border-red-800 bg-red-900/20 px-5 py-4 text-red-400 text-xs tracking-widest">
                    {`// ERROR: ${error}`}
                </div>
            )}

            {/* Table */}
            <div className="border border-primaryred-muted overflow-x-auto">
                <table className="w-full text-xs text-left min-w-160">
                    <thead>
                        <tr className="border-b border-primaryred-muted bg-[#271C1C]">
                            {['RANK', 'FULL NAME', 'EMAIL', 'CNIC', 'INSTITUTE', 'REFERRAL CODE', 'REFERRALS', 'STATUS'].map((h) => (
                                <th key={h} className="px-4 py-3 text-primaryred tracking-[0.15em] font-bold whitespace-nowrap">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                        ) : paginated.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-4 py-16 text-center text-[#C4C4C4] tracking-widest">
                                    {'// NO_AMBASSADORS_FOUND'}
                                </td>
                            </tr>
                        ) : (
                            paginated.map((a, idx) => {
                                const rank = (page - 1) * PAGE_SIZE + idx + 1
                                return (
                                <tr
                                    key={a.id}
                                    onClick={() => setSelected(a)}
                                    className="border-b border-primaryred-muted bg-[#191111] hover:bg-[#271C1C] cursor-pointer transition-colors duration-150 group"
                                >
                                    <td className="px-4 py-3 text-primaryred font-bold text-center tabular-nums">
                                        #{rank}
                                    </td>
                                    <td className="px-4 py-3 text-white font-medium group-hover:text-primaryred transition-colors duration-150 whitespace-nowrap">
                                        {a.fullName}
                                    </td>
                                    <td className="px-4 py-3 text-[#C4C4C4] whitespace-nowrap">{a.email}</td>
                                    <td className="px-4 py-3 text-[#C4C4C4] font-mono whitespace-nowrap">{a.cnic}</td>
                                    <td className="px-4 py-3 text-[#C4C4C4]">{a.institute}</td>
                                    <td className="px-4 py-3 font-mono text-primaryred tracking-wider whitespace-nowrap">{a.referralCode}</td>
                                    <td className="px-4 py-3 text-white font-bold text-center">{a.totalReferrals}</td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <span className={`text-[10px] tracking-widest border px-2 py-0.5 ${
                                            a.isActive
                                                ? 'text-green-400 border-green-600'
                                                : 'text-[#C4C4C4] border-primaryred-muted'
                                        }`}>
                                            {a.isActive ? 'ACTIVE' : 'INACTIVE'}
                                        </span>
                                    </td>
                                </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {!isLoading && !error && (
                <Pagination current={page} total={totalPages} onChange={setPage} />
            )}
        </div>
    )
}
