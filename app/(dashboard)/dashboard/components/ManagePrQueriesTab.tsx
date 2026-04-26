'use client'

/**
 * ManagePrQueriesTab
 *
 * To-do-list style query logger for the PR team.
 * PR members can:
 *   1. Log a new participant query (name, email, roll number, competition, message)
 *   2. View all logged queries with status badges
 *   3. Approve or Reject a query (optionally attaching a resolve note)
 *   4. Delete a query
 *
 * Status changes to APPROVED or REJECTED will trigger an email (backend stub).
 */

import { useEffect, useState, useCallback } from 'react'
import { apiFetch } from '@/lib/apiClient'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────────

type PrQueryStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

interface PrQuery {
    id:               string
    participantName:  string
    participantEmail: string
    rollNumber:       string | null
    participantId:    string | null
    competitionName:  string
    message:          string
    status:           PrQueryStatus
    resolvedNote:     string | null
    createdAt:        string
    updatedAt:        string
    createdBy:        { id: string; email: string }
}

interface ApiResponse {
    success: boolean
    data?:   PrQuery[]
    meta?:   { total: number; page: number; limit: number; totalPages: number }
    message?: string
    errors?:  { message: string }[]
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: PrQueryStatus }) {
    const cfg: Record<PrQueryStatus, { label: string; cls: string }> = {
        PENDING:  { label: 'PENDING',  cls: 'bg-yellow-900/60 text-yellow-300 border border-yellow-600/40' },
        APPROVED: { label: 'APPROVED', cls: 'bg-green-900/60  text-green-300  border border-green-600/40'  },
        REJECTED: { label: 'REJECTED', cls: 'bg-red-900/60    text-primaryred border border-primaryred/40' },
    }
    const { label, cls } = cfg[status]
    return (
        <span className={`inline-block px-2 py-0.5 text-[10px] tracking-widest font-mono rounded-sm ${cls}`}>
            {label}
        </span>
    )
}

// ─── Inline status updater ────────────────────────────────────────────────────

function StatusUpdater({
    query,
    onUpdated,
}: {
    query: PrQuery
    onUpdated: (updated: PrQuery) => void
}) {
    const [open,    setOpen]    = useState(false)
    const [target,  setTarget]  = useState<PrQueryStatus>(query.status)
    const [note,    setNote]    = useState(query.resolvedNote ?? '')
    const [loading, setLoading] = useState(false)

    async function submit() {
        if (target === query.status) { setOpen(false); return }
        setLoading(true)
        try {
            const res  = await apiFetch(`/api/pr-queries/${query.id}/status`, {
                method:  'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ status: target, resolvedNote: note || undefined }),
            })
            const json = await res.json()
            if (!json.success) throw new Error(json.message || 'Failed to update status.')
            toast.success(`Query marked as ${target}.`)
            onUpdated(json.data as PrQuery)
            setOpen(false)
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Failed to update status.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="relative">
            <button
                onClick={() => setOpen((v) => !v)}
                className="text-[10px] tracking-widest font-mono border border-primaryred/30 px-2 py-1 text-[#C4C4C4] hover:border-primaryred hover:text-white transition-colors"
            >
                CHANGE STATUS ▾
            </button>

            {open && (
                <div className="absolute right-0 top-8 z-20 w-64 bg-[#1a1010] border border-primaryred/40 p-4 flex flex-col gap-3 shadow-xl">
                    <p className="text-[10px] tracking-widest text-[#888]">SELECT NEW STATUS</p>

                    <div className="flex gap-2">
                        {(['PENDING', 'APPROVED', 'REJECTED'] as PrQueryStatus[]).map((s) => (
                            <button
                                key={s}
                                onClick={() => setTarget(s)}
                                className={`flex-1 py-1 text-[9px] tracking-widest font-mono border transition-colors ${
                                    target === s
                                        ? 'border-primaryred text-primaryred bg-primaryred/10'
                                        : 'border-[#444] text-[#888] hover:border-[#888]'
                                }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>

                    {(target === 'APPROVED' || target === 'REJECTED') && (
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Optional resolve note..."
                            rows={2}
                            className="w-full bg-[#111] border border-[#333] text-[#C4C4C4] text-xs p-2 resize-none focus:outline-none focus:border-primaryred/60 placeholder:text-[#555]"
                        />
                    )}

                    <div className="flex gap-2">
                        <button
                            onClick={submit}
                            disabled={loading}
                            className="flex-1 py-1.5 text-[10px] tracking-widest font-mono bg-primaryred text-white hover:bg-primaryred/80 transition-colors disabled:opacity-50"
                        >
                            {loading ? 'SAVING…' : 'CONFIRM'}
                        </button>
                        <button
                            onClick={() => { setOpen(false); setTarget(query.status) }}
                            className="flex-1 py-1.5 text-[10px] tracking-widest font-mono border border-[#444] text-[#888] hover:border-[#888] transition-colors"
                        >
                            CANCEL
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ManagePrQueriesTab() {
    const [queries,      setQueries]      = useState<PrQuery[]>([])
    const [loading,      setLoading]      = useState(true)
    const [filterStatus, setFilterStatus] = useState<PrQueryStatus | 'ALL'>('ALL')
    const [total,        setTotal]        = useState(0)

    // ── New query form state ──────────────────────────────────────────────────
    const [showForm,       setShowForm]       = useState(false)
    const [formName,       setFormName]       = useState('')
    const [formEmail,      setFormEmail]      = useState('')
    const [formRoll,       setFormRoll]       = useState('')
    const [formComp,       setFormComp]       = useState('')
    const [formMsg,        setFormMsg]        = useState('')
    const [formSubmitting, setFormSubmitting] = useState(false)

    // ── Expanded message rows ─────────────────────────────────────────────────
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

    // ── Delete confirmation ───────────────────────────────────────────────────
    const [deletingId, setDeletingId] = useState<string | null>(null)

    // ─── Fetch queries ────────────────────────────────────────────────────────

    const fetchQueries = useCallback(async () => {
        setLoading(true)
        try {
            const qs  = filterStatus !== 'ALL' ? `?status=${filterStatus}&limit=50` : '?limit=50'
            const res  = await apiFetch(`/api/pr-queries${qs}`)
            const json = (await res.json()) as ApiResponse
            if (!json.success) throw new Error(json.message)
            setQueries(json.data ?? [])
            setTotal(json.meta?.total ?? 0)
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Failed to load queries.')
        } finally {
            setLoading(false)
        }
    }, [filterStatus])

    useEffect(() => { fetchQueries() }, [fetchQueries])

    // ─── Submit new query ─────────────────────────────────────────────────────

    async function submitQuery(e: React.FormEvent) {
        e.preventDefault()
        if (!formName || !formEmail || !formComp || !formMsg) {
            toast.error('Please fill in all required fields.')
            return
        }
        setFormSubmitting(true)
        try {
            const res  = await apiFetch('/api/pr-queries', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({
                    participantName:  formName,
                    participantEmail: formEmail,
                    rollNumber:       formRoll || undefined,
                    competitionName:  formComp,
                    message:          formMsg,
                }),
            })
            const json = await res.json()
            if (!json.success) {
                const msg = json.errors?.[0]?.message ?? json.message ?? 'Failed to log query.'
                throw new Error(msg)
            }
            toast.success('Query logged successfully.')
            setFormName(''); setFormEmail(''); setFormRoll(''); setFormComp(''); setFormMsg('')
            setShowForm(false)
            await fetchQueries()
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Failed to log query.')
        } finally {
            setFormSubmitting(false)
        }
    }

    // ─── Delete query ─────────────────────────────────────────────────────────

    async function deleteQuery(id: string) {
        try {
            const res  = await apiFetch(`/api/pr-queries/${id}`, { method: 'DELETE' })
            const json = await res.json()
            if (!json.success) throw new Error(json.message)
            toast.success('Query deleted.')
            setQueries((prev) => prev.filter((q) => q.id !== id))
            setTotal((t) => t - 1)
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Failed to delete query.')
        } finally {
            setDeletingId(null)
        }
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    function toggleExpand(id: string) {
        setExpandedIds((prev) => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    function handleUpdated(updated: PrQuery) {
        setQueries((prev) => prev.map((q) => (q.id === updated.id ? { ...q, ...updated } : q)))
    }

    const statusCounts = {
        ALL:      queries.length,
        PENDING:  queries.filter((q) => q.status === 'PENDING').length,
        APPROVED: queries.filter((q) => q.status === 'APPROVED').length,
        REJECTED: queries.filter((q) => q.status === 'REJECTED').length,
    }

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="flex flex-col gap-8">

            {/* ── Header + Log button ───────────────────────────────────────── */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <p className="text-xs tracking-widest text-[#888] mt-1">
                        LOG AND MANAGE PARTICIPANT COMPETITION-SWAP REQUESTS
                    </p>
                </div>
                <button
                    onClick={() => setShowForm((v) => !v)}
                    className="px-4 py-2 text-xs tracking-widest font-mono border border-primaryred text-primaryred hover:bg-primaryred hover:text-white transition-all"
                >
                    {showForm ? '— CLOSE FORM' : '+ LOG NEW QUERY'}
                </button>
            </div>

            {/* ── Log-new-query form ────────────────────────────────────────── */}
            {showForm && (
                <form
                    onSubmit={submitQuery}
                    className="border border-primaryred/30 bg-[#1a0f0f] p-6 flex flex-col gap-5"
                >
                    <p className="text-[10px] tracking-widest text-primaryred">NEW PARTICIPANT QUERY</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] tracking-widest text-[#888]">
                                PARTICIPANT NAME <span className="text-primaryred">*</span>
                            </label>
                            <input
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                placeholder="Full name"
                                className="bg-[#111] border border-[#333] text-[#C4C4C4] text-sm px-3 py-2 focus:outline-none focus:border-primaryred/60 placeholder:text-[#444]"
                            />
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] tracking-widest text-[#888]">
                                PARTICIPANT EMAIL <span className="text-primaryred">*</span>
                            </label>
                            <input
                                type="email"
                                value={formEmail}
                                onChange={(e) => setFormEmail(e.target.value)}
                                placeholder="email@example.com"
                                className="bg-[#111] border border-[#333] text-[#C4C4C4] text-sm px-3 py-2 focus:outline-none focus:border-primaryred/60 placeholder:text-[#444]"
                            />
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] tracking-widest text-[#888]">ROLL NUMBER</label>
                            <input
                                value={formRoll}
                                onChange={(e) => setFormRoll(e.target.value)}
                                placeholder="e.g. 22K-1234 (optional)"
                                className="bg-[#111] border border-[#333] text-[#C4C4C4] text-sm px-3 py-2 focus:outline-none focus:border-primaryred/60 placeholder:text-[#444]"
                            />
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] tracking-widest text-[#888]">
                                COMPETITION <span className="text-primaryred">*</span>
                            </label>
                            <input
                                value={formComp}
                                onChange={(e) => setFormComp(e.target.value)}
                                placeholder="Competition name or swap detail"
                                className="bg-[#111] border border-[#333] text-[#C4C4C4] text-sm px-3 py-2 focus:outline-none focus:border-primaryred/60 placeholder:text-[#444]"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] tracking-widest text-[#888]">
                            MESSAGE / REQUEST DETAILS <span className="text-primaryred">*</span>
                        </label>
                        <textarea
                            value={formMsg}
                            onChange={(e) => setFormMsg(e.target.value)}
                            placeholder="Describe the participant's request in full..."
                            rows={4}
                            className="bg-[#111] border border-[#333] text-[#C4C4C4] text-sm px-3 py-2 resize-none focus:outline-none focus:border-primaryred/60 placeholder:text-[#444]"
                        />
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="submit"
                            disabled={formSubmitting}
                            className="px-6 py-2 text-xs tracking-widest font-mono bg-primaryred text-white hover:bg-primaryred/80 transition-colors disabled:opacity-50"
                        >
                            {formSubmitting ? 'SAVING…' : 'SAVE QUERY'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowForm(false)}
                            className="px-6 py-2 text-xs tracking-widest font-mono border border-[#444] text-[#888] hover:border-[#888] transition-colors"
                        >
                            CANCEL
                        </button>
                    </div>
                </form>
            )}

            {/* ── Filter bar ────────────────────────────────────────────────── */}
            <div className="flex items-center gap-3 flex-wrap">
                {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((s) => (
                    <button
                        key={s}
                        onClick={() => setFilterStatus(s)}
                        className={`px-3 py-1 text-[10px] tracking-widest font-mono border transition-colors ${
                            filterStatus === s
                                ? 'border-primaryred text-primaryred bg-primaryred/10'
                                : 'border-[#333] text-[#666] hover:border-[#555] hover:text-[#aaa]'
                        }`}
                    >
                        {s} ({statusCounts[s]})
                    </button>
                ))}
                <span className="ml-auto text-[10px] tracking-widest text-[#555]">
                    {total} TOTAL
                </span>
            </div>

            {/* ── Query list ────────────────────────────────────────────────── */}
            {loading ? (
                <div className="border border-primaryred/20 bg-[#1a0f0f] p-10 flex items-center justify-center">
                    <p className="text-xs tracking-widest text-[#555] animate-pulse">LOADING QUERIES…</p>
                </div>
            ) : queries.length === 0 ? (
                <div className="border border-primaryred/20 bg-[#1a0f0f] p-10 flex items-center justify-center">
                    <p className="text-xs tracking-widest text-[#555]">NO QUERIES FOUND</p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {queries.map((q) => {
                        const isExpanded = expandedIds.has(q.id)
                        const date = new Date(q.createdAt).toLocaleDateString('en-GB', {
                            day: '2-digit', month: 'short', year: 'numeric',
                        })

                        return (
                            <div
                                key={q.id}
                                className="border border-primaryred/20 bg-[#1a0f0f] hover:border-primaryred/40 transition-colors"
                            >
                                {/* Row header */}
                                <div className="flex items-start gap-4 p-4 flex-wrap">
                                    {/* Left: participant info */}
                                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <span className="text-sm font-mono text-white tracking-wide">
                                                {q.participantName}
                                            </span>
                                            <StatusBadge status={q.status} />
                                        </div>
                                        <div className="flex gap-4 flex-wrap">
                                            <span className="text-[11px] text-[#888] font-mono">{q.participantEmail}</span>
                                            {q.rollNumber && (
                                                <span className="text-[11px] text-[#888] font-mono">
                                                    ROLL: {q.rollNumber}
                                                </span>
                                            )}
                                            <span className="text-[11px] text-[#888] font-mono">
                                                COMP: {q.competitionName}
                                            </span>
                                        </div>

                                        {/* Message preview / expanded */}
                                        <div className="mt-1">
                                            <p className={`text-xs text-[#aaa] leading-relaxed ${!isExpanded ? 'line-clamp-2' : ''}`}>
                                                {q.message}
                                            </p>
                                            {q.message.length > 120 && (
                                                <button
                                                    onClick={() => toggleExpand(q.id)}
                                                    className="text-[10px] text-primaryred/70 hover:text-primaryred tracking-widest mt-0.5"
                                                >
                                                    {isExpanded ? '▲ COLLAPSE' : '▼ READ MORE'}
                                                </button>
                                            )}
                                        </div>

                                        {/* Resolved note */}
                                        {q.resolvedNote && (
                                            <p className="text-[11px] text-[#666] italic mt-1">
                                                Note: {q.resolvedNote}
                                            </p>
                                        )}
                                    </div>

                                    {/* Right: date + actions */}
                                    <div className="flex flex-col items-end gap-3 shrink-0">
                                        <span className="text-[10px] text-[#555] tracking-widest font-mono">{date}</span>

                                        <div className="flex gap-2 items-center">
                                            <StatusUpdater query={q} onUpdated={handleUpdated} />

                                            {/* Delete */}
                                            {deletingId === q.id ? (
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => deleteQuery(q.id)}
                                                        className="text-[9px] tracking-widest font-mono px-2 py-1 bg-primaryred text-white hover:bg-primaryred/80"
                                                    >
                                                        CONFIRM
                                                    </button>
                                                    <button
                                                        onClick={() => setDeletingId(null)}
                                                        className="text-[9px] tracking-widest font-mono px-2 py-1 border border-[#444] text-[#888]"
                                                    >
                                                        CANCEL
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setDeletingId(q.id)}
                                                    className="text-[10px] tracking-widest font-mono border border-[#333] px-2 py-1 text-[#666] hover:border-primaryred/40 hover:text-primaryred/60 transition-colors"
                                                >
                                                    DELETE
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
