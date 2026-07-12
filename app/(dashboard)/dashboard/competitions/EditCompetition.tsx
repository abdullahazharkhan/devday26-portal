'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '@/lib/apiClient'

// ─── Constants ────────────────────────────────────────────────────────────────

const VENUE_OPTIONS = ['LAB 1', 'LAB 2', 'LAB 3', 'LAB 4', 'LAB 5', 'LAB 6'] as const

// ─── Types ────────────────────────────────────────────────────────────────────

interface Competition {
    id:                   string
    name:                 string
    description:          string | null
    venues:               string[]   // many-to-many — array of venue names
    fee:                  number
    minTeamSize:          number
    maxTeamSize:          number
    capacityLimit:        number
    registeredTeams:      number
    compDay:              string     // ISO string — date only
    startTime:            string     // ISO string
    endTime:              string     // ISO string
    isActive:             boolean
    registrationDeadline: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-GB', {
        day:   '2-digit',
        month: 'short',
        year:  'numeric',
    })
}

function fmtTime(iso: string) {
    return new Date(iso).toLocaleTimeString('en-GB', {
        hour:   '2-digit',
        minute: '2-digit',
        hour12: true,
    }).toUpperCase()
}

function toDatetimeLocal(iso: string): string {
    const d   = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
    return <div className={`animate-pulse bg-[#3a2525] rounded-sm ${className ?? ''}`} />
}

function CompetitionCardSkeleton() {
    return (
        <div className="border border-primaryred-muted bg-[#191111] p-5 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-5 w-14" />
            </div>
            <Skeleton className="h-3 w-28" />
            <div className="flex gap-2">
                <Skeleton className="h-5 w-14" />
                <Skeleton className="h-5 w-14" />
            </div>
            <div className="border-t border-primaryred-muted pt-3 flex flex-col gap-2">
                <Skeleton className="h-3 w-36" />
                <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-8 w-full mt-1" />
        </div>
    )
}

// ─── Competition card (list view) ─────────────────────────────────────────────

function CompetitionCard({
    competition,
    onSelect,
}: {
    competition: Competition
    onSelect: () => void
}) {
    const fillPercent = competition.capacityLimit > 0
        ? Math.min(100, Math.round((competition.registeredTeams / competition.capacityLimit) * 100))
        : 0

    return (
        <div className="border border-primaryred-muted bg-[#191111] p-5 flex flex-col gap-4 hover:border-primaryred transition-colors duration-200">

            {/* Header */}
            <div className="flex items-start justify-between gap-3">
                <h3 className="text-white font-bold tracking-wide text-sm leading-snug flex-1">
                    {competition.name}
                </h3>
                <span className={`shrink-0 text-[10px] tracking-widest border px-2 py-0.5 ${
                    competition.isActive
                        ? 'text-green-400 border-green-600'
                        : 'text-[#C4C4C4] border-primaryred-muted'
                }`}>
                    {competition.isActive ? 'ACTIVE' : 'INACTIVE'}
                </span>
            </div>

            {/* Venue tags + Day */}
            <div className="flex flex-wrap gap-x-3 gap-y-1">
                {competition.venues.length > 0
                    ? competition.venues.map((v) => (
                        <span key={v} className="text-[10px] tracking-widest text-primaryred border border-primaryred-muted px-1.5 py-0.5">
                            {v}
                        </span>
                    ))
                    : <span className="text-[11px] tracking-wider text-[#C4C4C4]">No venue</span>
                }
                <span className="text-[11px] tracking-wider text-[#C4C4C4] ml-1">
                    🗓 {fmtDate(competition.compDay)}
                </span>
            </div>

            {/* Times */}
            <div className="border-t border-primaryred-muted pt-3 grid grid-cols-2 gap-3">
                <div>
                    <p className="text-[10px] tracking-widest text-primaryred mb-0.5">START</p>
                    <p className="text-white text-xs font-mono">{fmtTime(competition.startTime)}</p>
                </div>
                <div>
                    <p className="text-[10px] tracking-widest text-primaryred mb-0.5">END</p>
                    <p className="text-white text-xs font-mono">{fmtTime(competition.endTime)}</p>
                </div>
            </div>

            {/* Capacity bar */}
            <div>
                <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] tracking-widest text-[#C4C4C4]">CAPACITY</span>
                    <span className="text-[10px] font-mono text-[#C4C4C4]">
                        {competition.registeredTeams}/{competition.capacityLimit}
                    </span>
                </div>
                <div className="h-1 bg-[#3a2525] w-full">
                    <div
                        className="h-full bg-primaryred transition-all duration-300"
                        style={{ width: `${fillPercent}%` }}
                    />
                </div>
            </div>

            {/* Edit button */}
            <button
                onClick={onSelect}
                className="w-full text-xs tracking-widest text-primaryred border border-primaryred px-4 py-2 hover:bg-primaryred hover:text-white transition-colors duration-200 mt-1"
            >
                EDIT
            </button>
        </div>
    )
}

// ─── Edit panel ───────────────────────────────────────────────────────────────

function EditPanel({
    competition,
    onBack,
    onSaved,
}: {
    competition: Competition
    onBack: () => void
    onSaved: (updated: Pick<Competition, 'id' | 'startTime' | 'endTime' | 'venues'>) => void
}) {
    const [startTime,     setStartTime]     = useState(toDatetimeLocal(competition.startTime))
    const [endTime,       setEndTime]       = useState(toDatetimeLocal(competition.endTime))
    const [selectedVenues, setSelectedVenues] = useState<string[]>(competition.venues)
    const [isSaving,      setIsSaving]      = useState(false)
    const [message,       setMessage]       = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    const toggleVenue = (venue: string) => {
        setMessage(null)
        setSelectedVenues((prev) =>
            prev.includes(venue) ? prev.filter((v) => v !== venue) : [...prev, venue]
        )
    }

    const handleSave = async () => {
        if (!startTime || !endTime) {
            setMessage({ type: 'error', text: 'Both start time and end time are required.' })
            return
        }
        if (new Date(endTime) <= new Date(startTime)) {
            setMessage({ type: 'error', text: 'End time must be after start time.' })
            return
        }

        setIsSaving(true)
        setMessage(null)

        try {
            // Fire time + venue updates in parallel
            const [timeRes, venueRes] = await Promise.all([
                apiFetch(`/api/competitions/${competition.id}`, {
                    method:  'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify({
                        startTime: new Date(startTime).toISOString(),
                        endTime:   new Date(endTime).toISOString(),
                    }),
                }),
                apiFetch(`/api/competitions/${competition.id}/venues`, {
                    method:  'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify({ venues: selectedVenues }),
                }),
            ])

            const [timeJson, venueJson] = await Promise.all([timeRes.json(), venueRes.json()])

            if ((timeRes.ok && timeJson.success) && (venueRes.ok && venueJson.success)) {
                setMessage({ type: 'success', text: 'Competition updated successfully.' })
                onSaved({
                    id:        competition.id,
                    startTime: timeJson.data.startTime,
                    endTime:   timeJson.data.endTime,
                    venues:    venueJson.data.venues,
                })
            } else {
                const errMsg = (!timeJson.success ? timeJson.message : null)
                            ?? (!venueJson.success ? venueJson.message : null)
                            ?? 'Failed to update.'
                setMessage({ type: 'error', text: errMsg })
            }
        } catch {
            setMessage({ type: 'error', text: 'Could not reach the server.' })
        } finally {
            setIsSaving(false)
        }
    }

    const inputCls =
        'bg-[#191111] border border-primaryred-muted focus:border-primaryred focus:ring-primaryred p-3 text-white text-xs tracking-wider transition-all duration-200 focus:outline-none focus:ring-2 w-full [color-scheme:dark]'

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
                        {competition.name.toUpperCase()}
                    </h2>
                    <p className="text-[#C4C4C4] text-[11px] tracking-wider mt-0.5">
                        {fmtDate(competition.compDay)}
                    </p>
                </div>
            </div>

            {/* Form */}
            <div className="border border-primaryred-muted bg-[#271C1C] p-5 sm:p-8 flex flex-col gap-8">

                {/* ── Time section ── */}
                <div className="flex flex-col gap-4">
                    <p className="text-primaryred text-[10px] tracking-widest border-b border-primaryred-muted pb-2">
                        — SCHEDULE
                    </p>

                    {/* Current times (read-only display) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="border border-primaryred-muted bg-[#191111] p-4">
                            <p className="text-[10px] tracking-widest text-primaryred mb-1">CURRENT_START</p>
                            <p className="text-white text-sm font-mono">{fmtTime(competition.startTime)}</p>
                            <p className="text-[#C4C4C4] text-[11px] mt-0.5">{fmtDate(competition.startTime)}</p>
                        </div>
                        <div className="border border-primaryred-muted bg-[#191111] p-4">
                            <p className="text-[10px] tracking-widest text-primaryred mb-1">CURRENT_END</p>
                            <p className="text-white text-sm font-mono">{fmtTime(competition.endTime)}</p>
                            <p className="text-[#C4C4C4] text-[11px] mt-0.5">{fmtDate(competition.endTime)}</p>
                        </div>
                    </div>

                    {/* Time inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="flex flex-col gap-2">
                            <label className="text-primaryred text-xs tracking-widest">
                                NEW START TIME
                            </label>
                            <input
                                type="datetime-local"
                                value={startTime}
                                onChange={(e) => { setStartTime(e.target.value); setMessage(null) }}
                                className={inputCls}
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-primaryred text-xs tracking-widest">
                                NEW END TIME
                            </label>
                            <input
                                type="datetime-local"
                                value={endTime}
                                onChange={(e) => { setEndTime(e.target.value); setMessage(null) }}
                                className={inputCls}
                            />
                        </div>
                    </div>
                </div>

                {/* ── Venue section ── */}
                <div className="flex flex-col gap-4">
                    <p className="text-primaryred text-[10px] tracking-widest border-b border-primaryred-muted pb-2">
                        — VENUES
                    </p>
                    <p className="text-[#C4C4C4] text-[11px] tracking-wider">
                        Select one or more labs for this competition.
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {VENUE_OPTIONS.map((venue) => {
                            const active = selectedVenues.includes(venue)
                            return (
                                <button
                                    key={venue}
                                    type="button"
                                    onClick={() => toggleVenue(venue)}
                                    className={`text-xs tracking-widest border px-4 py-3 text-center transition-colors duration-200 ${
                                        active
                                            ? 'bg-primaryred text-white border-primaryred'
                                            : 'bg-[#191111] text-[#C4C4C4] border-primaryred-muted hover:border-primaryred hover:text-white'
                                    }`}
                                >
                                    {venue}
                                </button>
                            )
                        })}
                    </div>
                    {selectedVenues.length === 0 && (
                        <p className="text-[11px] tracking-wider text-[#C4C4C4] opacity-60">
                            {'// No venues selected — competition will have no venue assigned.'}
                        </p>
                    )}
                </div>

                {/* Feedback */}
                {message && (
                    <p className={`text-xs tracking-wide border px-4 py-2 ${
                        message.type === 'success'
                            ? 'text-green-400 border-green-500 bg-green-500/10'
                            : 'text-red-500 border-red-500 bg-red-500/10'
                    }`}>
                        {message.text}
                    </p>
                )}

                {/* Save */}
                <div>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-primaryred text-white text-sm py-3 px-8 tracking-widest hover:bg-[#b01519] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? 'SAVING...' : 'SAVE_CHANGES'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function EditCompetition() {
    const [competitions, setCompetitions] = useState<Competition[]>([])
    const [isLoading,    setLoading]      = useState(true)
    const [error,        setError]        = useState<string | null>(null)
    const [selected,     setSelected]     = useState<Competition | null>(null)

    const fetchCompetitions = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const res  = await apiFetch('/api/competitions')
            const json = await res.json()
            if (json.success) setCompetitions(json.data)
            else setError(json.message ?? 'Failed to load competitions.')
        } catch {
            setError('Could not reach the server.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchCompetitions() }, [fetchCompetitions])

    // Merge saved fields back into local state
    const handleSaved = (updated: Pick<Competition, 'id' | 'startTime' | 'endTime' | 'venues'>) => {
        setCompetitions((prev) =>
            prev.map((c) =>
                c.id === updated.id
                    ? { ...c, startTime: updated.startTime, endTime: updated.endTime, venues: updated.venues }
                    : c
            )
        )
        setSelected((prev) =>
            prev?.id === updated.id
                ? { ...prev, startTime: updated.startTime, endTime: updated.endTime, venues: updated.venues }
                : prev
        )
    }

    // ── Edit panel ───────────────────────────────────────────────────────────

    if (selected) {
        return (
            <EditPanel
                competition={selected}
                onBack={() => setSelected(null)}
                onSaved={handleSaved}
            />
        )
    }

    // ── List view ────────────────────────────────────────────────────────────

    return (
        <div className="flex flex-col gap-5">

            {/* Toolbar */}
            <div className="flex items-center justify-between gap-3">
                <p className="text-[#C4C4C4] text-[11px] tracking-widest">
                    {isLoading
                        ? '// LOADING...'
                        : error
                        ? '// ERROR'
                        : `// ${competitions.length} COMPETITION${competitions.length !== 1 ? 'S' : ''} FOUND`}
                </p>
                <button
                    onClick={fetchCompetitions}
                    disabled={isLoading}
                    title="Refresh"
                    className="border border-primaryred-muted text-primaryred px-4 py-2 text-xs tracking-widest hover:border-primaryred hover:bg-primaryred/10 transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    ↺ REFRESH
                </button>
            </div>

            {/* Error */}
            {error && (
                <div className="border border-red-800 bg-red-900/20 px-5 py-4 text-red-400 text-xs tracking-widest">
                    {`// ERROR: ${error}`}
                </div>
            )}

            {/* Grid */}
            {!error && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {isLoading
                        ? Array.from({ length: 6 }).map((_, i) => <CompetitionCardSkeleton key={i} />)
                        : competitions.length === 0
                        ? (
                            <div className="col-span-full border border-primaryred-muted bg-[#271C1C] p-10 flex items-center justify-center">
                                <p className="text-[#C4C4C4] text-xs tracking-widest">{'// NO_COMPETITIONS_FOUND'}</p>
                            </div>
                        )
                        : competitions.map((c) => (
                            <CompetitionCard
                                key={c.id}
                                competition={c}
                                onSelect={() => setSelected(c)}
                            />
                        ))
                    }
                </div>
            )}
        </div>
    )
}
