'use client'

import { useState, useEffect, useCallback } from 'react'
import DataTable, { Column } from './DataTable'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Competition {
    id: string
    name: string
    compDay: string
    fee?: string
    minTeamSize?: number
    maxTeamSize?: number
}

interface RegistrationRow {
    id: string
    name: string
    referenceId: string
    paymentStatus: 'PENDING_PAYMENT' | 'VERIFIED' | 'REJECTED'
    paymentMethod: string | null
    competition: { id: string; name: string; compDay: string; fee: string }
    memberCount: number
    createdAt: string
}

interface RegistrationMember {
    id: string
    isLeader: boolean
    cardIssued: boolean
    cardIssuedAt: string | null
    joinedAt: string
    attendance: { status: boolean; method: string; markedAt: string } | null
    participant: {
        id: string
        fullName: string
        email: string
        cnic: string
        phone: string | null
        institution: string | null
    }
}

interface RegistrationDetail {
    id: string
    name: string
    referenceId: string
    paymentStatus: string
    paymentMethod: string | null
    paymentDate: string | null
    declaredTID: string | null
    amountPaid: string | null
    paymentProofUrl: string | null
    createdAt: string
    updatedAt: string
    competition: Competition
    members: RegistrationMember[]
}

interface PaginationMeta {
    total: number
    page: number
    limit: number
    totalPages: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-PK', {
        day: '2-digit', month: 'short', year: 'numeric',
    })
}

function fmtDateTime(iso: string) {
    return new Date(iso).toLocaleString('en-PK', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    })
}

const STATUS_STYLES: Record<string, string> = {
    PENDING_PAYMENT: 'text-yellow-400 border-yellow-600 bg-yellow-500/10',
    VERIFIED:        'text-green-400  border-green-600  bg-green-500/10',
    REJECTED:        'text-red-400    border-red-600    bg-red-500/10',
}

function StatusBadge({ status }: { status: string }) {
    const cls = STATUS_STYLES[status] ?? 'text-[#C4C4C4] border-primaryred-muted'
    return (
        <span className={`text-[10px] tracking-widest border px-2 py-0.5 whitespace-nowrap ${cls}`}>
            {status.replace('_', ' ')}
        </span>
    )
}

function Skeleton({ className }: { className?: string }) {
    return <div className={`animate-pulse bg-[#3a2525] rounded-sm ${className ?? ''}`} />
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-[10px] tracking-widest text-primaryred">{label}</span>
            <span className="text-white text-xs tracking-wide">{value ?? '—'}</span>
        </div>
    )
}

// ─── Detail skeleton ──────────────────────────────────────────────────────────

function DetailSkeleton() {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
                <Skeleton className="h-9 w-24" />
                <div className="flex flex-col gap-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-3 w-32" />
                </div>
            </div>
            <div className="border border-primaryred-muted bg-[#271C1C] p-5 sm:p-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex flex-col gap-1.5">
                        <Skeleton className="h-2.5 w-20" />
                        <Skeleton className="h-4 w-36" />
                    </div>
                ))}
            </div>
            <div className="border border-primaryred-muted bg-[#271C1C] p-5 sm:p-8">
                <Skeleton className="h-4 w-28 mb-4" />
                <Skeleton className="h-32 w-full" />
            </div>
        </div>
    )
}

// ─── Registration detail panel ────────────────────────────────────────────────

function RegistrationDetailPanel({
    registrationId,
    onBack,
}: {
    registrationId: string
    onBack: () => void
}) {
    const [detail, setDetail]     = useState<RegistrationDetail | null>(null)
    const [isLoading, setLoading] = useState(true)
    const [error, setError]       = useState<string | null>(null)

    useEffect(() => {
        setLoading(true)
        setError(null)
        fetch(`/api/registrations/${registrationId}`)
            .then((r) => r.json())
            .then((json) => {
                if (json.success) setDetail(json.data)
                else setError(json.message ?? 'Failed to load registration.')
            })
            .catch(() => setError('Could not reach the server.'))
            .finally(() => setLoading(false))
    }, [registrationId])

    const memberColumns: Column<RegistrationMember>[] = [
        {
            key: 'participant.fullName',
            header: 'NAME',
            render: (m) => (
                <span className="flex items-center gap-2">
                    {m.participant.fullName}
                    {m.isLeader && (
                        <span className="text-[9px] tracking-widest text-primaryred border border-primaryred px-1.5 py-0.5">
                            LEADER
                        </span>
                    )}
                </span>
            ),
            minWidth: '10rem',
        },
        {
            key: 'participant.email',
            header: 'EMAIL',
            render: (m) => <span className="text-[#C4C4C4]">{m.participant.email}</span>,
            minWidth: '12rem',
        },
        {
            key: 'participant.cnic',
            header: 'CNIC',
            render: (m) => <span className="text-[#C4C4C4] tracking-widest">{m.participant.cnic}</span>,
            minWidth: '9rem',
        },
        {
            key: 'participant.phone',
            header: 'PHONE',
            render: (m) => <span className="text-[#C4C4C4]">{m.participant.phone ?? '—'}</span>,
            minWidth: '8rem',
        },
        {
            key: 'participant.institution',
            header: 'INSTITUTION',
            render: (m) => (
                <span className="text-[#C4C4C4] truncate max-w-40 block">
                    {m.participant.institution ?? '—'}
                </span>
            ),
            minWidth: '9rem',
        },
        {
            key: 'cardIssued',
            header: 'CARD',
            render: (m) => (
                <span className={`text-[10px] tracking-widest border px-2 py-0.5 ${
                    m.cardIssued
                        ? 'text-green-400 border-green-600 bg-green-500/10'
                        : 'text-[#C4C4C4] border-primaryred-muted'
                }`}>
                    {m.cardIssued ? 'ISSUED' : 'PENDING'}
                </span>
            ),
            minWidth: '6rem',
        },
        {
            key: 'attendance',
            header: 'ATTENDANCE',
            render: (m) => {
                if (!m.attendance) {
                    return (
                        <span className="text-[10px] tracking-widest border px-2 py-0.5 text-[#C4C4C4] border-primaryred-muted">
                            NOT_MARKED
                        </span>
                    )
                }
                return (
                    <span className={`text-[10px] tracking-widest border px-2 py-0.5 ${
                        m.attendance.status
                            ? 'text-green-400 border-green-600 bg-green-500/10'
                            : 'text-red-400 border-red-600 bg-red-500/10'
                    }`}>
                        {m.attendance.status ? 'PRESENT' : 'ABSENT'}
                    </span>
                )
            },
            minWidth: '7rem',
        },
    ]

    if (isLoading) return <DetailSkeleton />

    if (error) {
        return (
            <div className="flex flex-col gap-4">
                <button
                    onClick={onBack}
                    className="self-start text-xs tracking-widest text-primaryred border border-primaryred px-4 py-2 hover:bg-primaryred hover:text-white transition-colors duration-200"
                >
                    ← BACK
                </button>
                <div className="border border-red-500/40 bg-red-500/10 p-5 text-red-400 text-xs tracking-wide">
                    {error}
                </div>
            </div>
        )
    }

    if (!detail) return null

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-wrap items-center gap-4">
                <button
                    onClick={onBack}
                    className="text-xs tracking-widest text-primaryred border border-primaryred px-4 py-2 hover:bg-primaryred hover:text-white transition-colors duration-200 shrink-0"
                >
                    ← BACK
                </button>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-white font-bold tracking-widest text-base sm:text-lg">
                            {detail.name.toUpperCase()}
                        </h2>
                        <StatusBadge status={detail.paymentStatus} />
                    </div>
                    <p className="text-[#C4C4C4] text-xs tracking-widest mt-0.5">
                        REF: <span className="text-primaryred">{detail.referenceId}</span>
                        {' · '}{detail.competition.name}
                    </p>
                </div>
            </div>

            {/* Info Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Competition info */}
                <div className="border border-primaryred-muted bg-[#271C1C] p-5 sm:p-6 flex flex-col gap-4">
                    <h3 className="text-primaryred text-xs tracking-[0.2em] font-bold">COMPETITION</h3>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                        <InfoRow label="NAME"      value={detail.competition.name} />
                        <InfoRow label="FEE"       value={detail.competition.fee ? `PKR ${detail.competition.fee}` : '—'} />
                        <InfoRow label="DATE"      value={detail.competition.compDay ? fmtDate(detail.competition.compDay) : '—'} />
                        <InfoRow label="TEAM_SIZE" value={
                            detail.competition.minTeamSize != null && detail.competition.maxTeamSize != null
                                ? `${detail.competition.minTeamSize}–${detail.competition.maxTeamSize}`
                                : `${detail.members.length} members`
                        } />
                    </div>
                    {/* Attendance summary */}
                    {(() => {
                        const marked  = detail.members.filter((m) => m.attendance !== null)
                        const present = detail.members.filter((m) => m.attendance?.status === true)
                        const total   = detail.members.length
                        if (marked.length === 0) {
                            return (
                                <div className="flex items-center gap-2 pt-1">
                                    <span className="text-[10px] tracking-[0.2em] text-[#C4C4C4]">ATTENDANCE:</span>
                                    <span className="text-[10px] tracking-widest text-[#C4C4C4] border border-primaryred-muted px-2 py-0.5">
                                        NOT_MARKED
                                    </span>
                                </div>
                            )
                        }
                        return (
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                <span className="text-[10px] tracking-[0.2em] text-[#C4C4C4]">ATTENDANCE:</span>
                                <span className={`text-[10px] tracking-widest border px-2 py-0.5 ${
                                    present.length === total
                                        ? 'text-green-400 border-green-600 bg-green-500/10'
                                        : present.length === 0
                                            ? 'text-red-400 border-red-600 bg-red-500/10'
                                            : 'text-yellow-400 border-yellow-600 bg-yellow-500/10'
                                }`}>
                                    {present.length}/{total} PRESENT
                                </span>
                            </div>
                        )
                    })()}
                </div>

                {/* Payment info */}
                <div className="border border-primaryred-muted bg-[#271C1C] p-5 sm:p-6 flex flex-col gap-4">
                    <h3 className="text-primaryred text-xs tracking-[0.2em] font-bold">PAYMENT</h3>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                        <InfoRow label="STATUS"  value={<StatusBadge status={detail.paymentStatus} />} />
                        <InfoRow label="METHOD"  value={detail.paymentMethod ?? '—'} />
                        <InfoRow label="AMOUNT"  value={detail.amountPaid ? `PKR ${detail.amountPaid}` : '—'} />
                        <InfoRow label="TID"     value={detail.declaredTID ?? '—'} />
                        <InfoRow label="DATE"    value={detail.paymentDate ? fmtDate(detail.paymentDate) : '—'} />
                        <InfoRow label="REGISTERED" value={fmtDateTime(detail.createdAt)} />
                    </div>
                    {detail.paymentProofUrl && (
                        <a
                            href={detail.paymentProofUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="self-start text-xs tracking-widest text-primaryred border border-primaryred px-4 py-2 hover:bg-primaryred hover:text-white transition-colors duration-200"
                        >
                            VIEW_PAYMENT_PROOF ↗
                        </a>
                    )}
                </div>
            </div>

            {/* Members */}
            <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                    <h3 className="text-white text-sm font-bold tracking-widest">TEAM_MEMBERS</h3>
                    <span className="text-[10px] tracking-widest text-primaryred border border-primaryred px-2 py-0.5">
                        {detail.members.length} MEMBER{detail.members.length !== 1 ? 'S' : ''}
                    </span>
                </div>
                <DataTable<RegistrationMember>
                    columns={memberColumns}
                    rows={detail.members}
                    keyExtractor={(m) => m.id}
                    emptyMessage="// NO_MEMBERS_FOUND"
                    skeletonRowCount={3}
                />
            </div>
        </div>
    )
}

// ─── Pagination control ────────────────────────────────────────────────────────

function Pagination({
    meta,
    onPageChange,
}: {
    meta: PaginationMeta
    onPageChange: (p: number) => void
}) {
    const { page, totalPages } = meta
    if (totalPages <= 1) return null

    // Show pages: always first, last, current ± 1, with ellipsis
    const pages: (number | '…')[] = []
    const add = new Set<number>()

    for (const p of [1, page - 1, page, page + 1, totalPages]) {
        if (p >= 1 && p <= totalPages) add.add(p)
    }

    const sorted = Array.from(add).sort((a, b) => a - b)
    for (let i = 0; i < sorted.length; i++) {
        if (i > 0 && sorted[i] - sorted[i - 1] > 1) pages.push('…')
        pages.push(sorted[i])
    }

    return (
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-primaryred-muted pt-4">
            <p className="text-[11px] tracking-widest text-[#C4C4C4]">
                {`// PAGE ${page} OF ${totalPages} · ${meta.total} TOTAL`}
            </p>
            <div className="flex items-center gap-1 flex-wrap">
                <button
                    onClick={() => onPageChange(page - 1)}
                    disabled={page <= 1}
                    className="text-xs tracking-widest text-primaryred border border-primaryred px-3 py-1.5 hover:bg-primaryred hover:text-white transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    ← PREV
                </button>

                {pages.map((p, i) =>
                    p === '…' ? (
                        <span key={`e-${i}`} className="text-[#C4C4C4] text-xs px-1">…</span>
                    ) : (
                        <button
                            key={p}
                            onClick={() => onPageChange(p as number)}
                            className={`w-8 h-8 text-xs font-bold border transition-colors duration-200 ${
                                p === page
                                    ? 'bg-primaryred text-white border-primaryred'
                                    : 'text-[#C4C4C4] border-primaryred-muted hover:border-primaryred hover:text-white'
                            }`}
                        >
                            {p}
                        </button>
                    )
                )}

                <button
                    onClick={() => onPageChange(page + 1)}
                    disabled={page >= totalPages}
                    className="text-xs tracking-widest text-primaryred border border-primaryred px-3 py-1.5 hover:bg-primaryred hover:text-white transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    NEXT →
                </button>
            </div>
        </div>
    )
}

// ─── Per-competition table ────────────────────────────────────────────────────

const COMP_COLUMNS: Column<RegistrationRow>[] = [
    {
        key: '_idx',
        header: '#',
        render: (_, i) => <span className="text-[#C4C4C4]">{i + 1}</span>,
        minWidth: '3rem',
    },
    {
        key: 'name',
        header: 'TEAM',
        render: (row) => <span className="font-semibold text-white">{row.name}</span>,
        minWidth: '10rem',
    },
    {
        key: 'referenceId',
        header: 'REF_ID',
        render: (row) => (
            <span className="font-mono text-primaryred tracking-widest">{row.referenceId}</span>
        ),
        minWidth: '8rem',
    },
    {
        key: 'paymentStatus',
        header: 'STATUS',
        render: (row) => <StatusBadge status={row.paymentStatus} />,
        minWidth: '8rem',
    },
    {
        key: 'memberCount',
        header: 'MEMBERS',
        render: (row) => <span className="text-[#C4C4C4]">{row.memberCount}</span>,
        minWidth: '5rem',
    },
    {
        key: 'createdAt',
        header: 'REGISTERED',
        render: (row) => <span className="text-[#C4C4C4]">{fmtDate(row.createdAt)}</span>,
        minWidth: '8rem',
    },
    {
        key: '_action',
        header: '',
        render: () => (
            <span className="text-primaryred text-[10px] tracking-widest opacity-60">VIEW →</span>
        ),
        minWidth: '4rem',
    },
]

function CompetitionSection({
    competition,
    onRowClick,
}: {
    competition: Competition
    onRowClick: (id: string) => void
}) {
    const [rows,        setRows]        = useState<RegistrationRow[]>([])
    const [meta,        setMeta]        = useState<PaginationMeta>({ total: 0, page: 1, limit: 15, totalPages: 0 })
    const [isLoading,   setIsLoading]   = useState(true)
    const [isOpen,      setIsOpen]      = useState(true)
    const [page,        setPage]        = useState(1)
    const [searchInput, setSearchInput] = useState('')
    const [search,      setSearch]      = useState('')
    const [statusFilter,setStatusFilter]= useState('')

    // Debounce search
    useEffect(() => {
        const t = setTimeout(() => { setSearch(searchInput); setPage(1) }, 400)
        return () => clearTimeout(t)
    }, [searchInput])

    // Reset page when status filter changes
    useEffect(() => { setPage(1) }, [statusFilter])

    const fetchRows = useCallback(async () => {
        setIsLoading(true)
        try {
            const params = new URLSearchParams()
            params.set('page',          String(page))
            params.set('limit',         '15')
            params.set('competitionId', competition.id)
            if (search)       params.set('search', search)
            if (statusFilter) params.set('status', statusFilter)

            const res  = await fetch(`/api/registrations?${params}`)
            const json = await res.json()
            if (json.success) {
                setRows(json.data)
                setMeta(json.meta)
            }
        } catch {
            // silent
        } finally {
            setIsLoading(false)
        }
    }, [competition.id, page, search, statusFilter])

    useEffect(() => { fetchRows() }, [fetchRows])

    const totalLabel = isLoading
        ? '...'
        : `${meta.total} TEAM${meta.total !== 1 ? 'S' : ''}`

    return (
        <div className="border border-primaryred-muted">
            {/* Section header — click to collapse */}
            <button
                onClick={() => setIsOpen((o) => !o)}
                className="w-full flex items-center justify-between gap-4 px-5 py-4 bg-[#271C1C] hover:bg-[#2e1e1e] transition-colors duration-200 group"
            >
                <div className="flex flex-wrap items-center gap-3 min-w-0">
                    <h2 className="text-white font-bold tracking-widest text-sm sm:text-base truncate">
                        {competition.name.toUpperCase()}
                    </h2>
                    {competition.compDay && (
                        <span className="text-[10px] tracking-widest text-[#C4C4C4] border border-primaryred-muted px-2 py-0.5 shrink-0">
                            {fmtDate(competition.compDay)}
                        </span>
                    )}
                    <span className="text-[10px] tracking-widest text-primaryred border border-primaryred px-2 py-0.5 shrink-0">
                        {totalLabel}
                    </span>
                </div>
                {/* Chevron */}
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className={`h-4 w-4 text-primaryred shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                >
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.24 4.5a.75.75 0 0 1-1.08 0l-4.24-4.5a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" />
                </svg>
            </button>

            {/* Collapsible body */}
            {isOpen && (
                <div className="flex flex-col gap-0">

                    {/* Per-section search + status filter */}
                    <div className="flex flex-col sm:flex-row gap-3 px-4 py-3 border-b border-primaryred-muted bg-[#191111]">
                        {/* Search */}
                        <div className="relative flex-1">
                            <input
                                type="text"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                placeholder="Search by team name or ref ID..."
                                className="bg-[#271C1C] border border-primaryred-muted focus:border-primaryred focus:ring-1 focus:ring-primaryred p-2.5 pl-8 text-white text-xs tracking-wider placeholder-[#555] focus:outline-none w-full transition-colors duration-200"
                            />
                            <svg
                                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primaryred pointer-events-none"
                                xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0Z" />
                            </svg>
                            {searchInput && (
                                <button
                                    onClick={() => setSearchInput('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#C4C4C4] hover:text-white text-xs"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        {/* Status filter */}
                        <div className="relative sm:w-44">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="bg-[#271C1C] border border-primaryred-muted focus:border-primaryred focus:ring-1 focus:ring-primaryred p-2.5 pr-8 text-white text-xs tracking-widest focus:outline-none w-full appearance-none transition-colors duration-200"
                            >
                                <option value="">ALL STATUSES</option>
                                <option value="PENDING_PAYMENT">PENDING PAYMENT</option>
                                <option value="VERIFIED">VERIFIED</option>
                                <option value="REJECTED">REJECTED</option>
                            </select>
                            <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-primaryred">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.24 4.5a.75.75 0 0 1-1.08 0l-4.24-4.5a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" />
                                </svg>
                            </span>
                        </div>
                    </div>

                    <DataTable<RegistrationRow>
                        columns={COMP_COLUMNS}
                        rows={rows}
                        keyExtractor={(r) => r.id}
                        loading={isLoading}
                        skeletonRowCount={5}
                        emptyMessage="// NO_REGISTRATIONS_FOUND"
                        onRowClick={(row) => onRowClick(row.id)}
                    />

                    {/* Per-section pagination */}
                    {!isLoading && meta.totalPages > 1 && (
                        <div className="px-4 py-3 border-t border-primaryred-muted bg-[#191111]">
                            <Pagination meta={meta} onPageChange={setPage} />
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

// ─── Competitions loading skeleton ────────────────────────────────────────────

function CompetitionsSkeleton() {
    return (
        <div className="flex flex-col gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="border border-primaryred-muted">
                    <div className="px-5 py-4 bg-[#271C1C] flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="h-5 w-48 animate-pulse bg-[#3a2525] rounded-sm" />
                            <div className="h-4 w-16 animate-pulse bg-[#3a2525] rounded-sm" />
                            <div className="h-4 w-14 animate-pulse bg-[#3a2525] rounded-sm" />
                        </div>
                        <div className="h-4 w-4 animate-pulse bg-[#3a2525] rounded-sm" />
                    </div>
                    <div className="p-4 flex flex-col gap-2">
                        {Array.from({ length: 4 }).map((_, j) => (
                            <div key={j} className="h-8 animate-pulse bg-[#3a2525] rounded-sm" />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}

// ─── Main: View Registrations Tab ─────────────────────────────────────────────

export default function ViewRegistrationsTab() {
    const [competitions, setCompetitions] = useState<Competition[]>([])
    const [compsLoading, setCompsLoading] = useState(true)

    // Detail panel
    const [selectedId, setSelectedId] = useState<string | null>(null)

    // ── Fetch competitions (once) ──────────────────────────────────────────
    useEffect(() => {
        setCompsLoading(true)
        fetch('/api/registrations/competitions')
            .then((r) => r.json())
            .then((json) => { if (json.success) setCompetitions(json.data) })
            .catch(() => {/* silent */})
            .finally(() => setCompsLoading(false))
    }, [])

    // ── Detail panel ───────────────────────────────────────────────────────
    if (selectedId) {
        return (
            <RegistrationDetailPanel
                registrationId={selectedId}
                onBack={() => setSelectedId(null)}
            />
        )
    }

    // ── List view ──────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col gap-5">

            {/* Competition sections */}
            {compsLoading ? (
                <CompetitionsSkeleton />
            ) : competitions.length === 0 ? (
                <div className="border border-primaryred-muted bg-[#271C1C] p-10 flex items-center justify-center">
                    <p className="text-[#C4C4C4] text-xs tracking-widest">// NO_COMPETITIONS_FOUND</p>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {competitions.map((comp) => (
                        <CompetitionSection
                            key={comp.id}
                            competition={comp}
                            onRowClick={setSelectedId}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
