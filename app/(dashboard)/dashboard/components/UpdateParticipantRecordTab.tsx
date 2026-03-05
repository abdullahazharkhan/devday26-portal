'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '@/lib/apiClient'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParticipantProfile {
    id: string
    fullName: string
    email: string
    cnic: string
    phone: string | null
    institution: string | null
}

interface TeamRegistration {
    teamId: string
    teamName: string
    referenceId: string
    paymentStatus: 'PENDING_PAYMENT' | 'VERIFIED' | 'REJECTED'
    isLeader: boolean
    memberCount: number
    competition: {
        id: string
        name: string
        compDay: string
        startTime: string
        endTime: string
        fee: string
    }
}

interface Competition {
    id: string
    name: string
    compDay: string
    fee: string
    minTeamSize: number
    maxTeamSize: number
    startTime: string
    endTime: string
}

interface Clash {
    participantName: string
    participantCnic: string
    clashTeam: string
    clashCompetition: string
    clashStart: string
    clashEnd: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtTime(iso: string) {
    return new Date(iso).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })
}

function InfoPill({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-[10px] tracking-widest text-primaryred">{label}</span>
            <span className="text-white text-xs tracking-wide">{value || '—'}</span>
        </div>
    )
}

// ─── Clash List ───────────────────────────────────────────────────────────────

function ClashList({ clashes }: { clashes: Clash[] }) {
    return (
        <div className="space-y-2">
            {clashes.map((c, i) => (
                <div
                    key={i}
                    className="bg-yellow-500/5 border border-yellow-600/40 p-3 text-xs space-y-1"
                >
                    <div className="text-yellow-300 font-semibold">{c.participantName}</div>
                    <div className="text-[#C4C4C4]">
                        Also in <span className="text-white font-medium">{c.clashTeam}</span> ({c.clashCompetition})
                    </div>
                    <div className="text-[#C4C4C4]">
                        {fmtDate(c.clashStart)} · {fmtTime(c.clashStart)} – {fmtTime(c.clashEnd)}
                    </div>
                </div>
            ))}
        </div>
    )
}

// ─── Change Competition Modal ─────────────────────────────────────────────────

interface ChangeCompModalProps {
    team: TeamRegistration
    competitions: Competition[]
    onClose: () => void
    onSuccess: (teamId: string, newCompName: string) => void
}

function ChangeCompModal({ team, competitions, onClose, onSuccess }: ChangeCompModalProps) {
    const [selectedCompId, setSelectedCompId] = useState('')
    const [submitting,     setSubmitting]     = useState(false)
    const [clashes,        setClashes]        = useState<Clash[] | null>(null)
    const [error,          setError]          = useState<string | null>(null)

    const availableComps = competitions.filter(
        (c) => c.id !== team.competition.id &&
               team.memberCount >= c.minTeamSize &&
               team.memberCount <= c.maxTeamSize
    )

    const selectedComp = competitions.find((c) => c.id === selectedCompId)

    async function submit(force = false) {
        if (!selectedCompId) return

        setSubmitting(true)
        setError(null)
        if (!force) setClashes(null)

        try {
            const res = await apiFetch(
                `/api/registrations/${team.teamId}/change-competition`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ newCompetitionId: selectedCompId, force }),
                }
            )

            const json = await res.json()

            if (res.ok) {
                onSuccess(team.teamId, json.data.newCompetitionName)
                return
            }

            if (res.status === 409 && json.clashes) {
                setClashes(json.clashes)
                return
            }

            setError(json.message || 'Failed to change competition.')
        } catch {
            setError('Could not reach the server.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
            <div className="bg-[#1A1111] border border-primaryred w-full max-w-lg max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-primaryred-muted">
                    <h2 className="text-white font-bold tracking-widest text-sm sm:text-base">
                        CHANGE COMPETITION
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-[#C4C4C4] hover:text-white text-lg leading-none"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-5 sm:p-6 space-y-5">
                    {/* Current competition */}
                    <div className="space-y-1">
                        <p className="text-[10px] tracking-widest text-[#C4C4C4]">CURRENT COMPETITION</p>
                        <div className="bg-[#271C1C] border border-primaryred-muted px-3 py-2.5 text-white text-sm">
                            {team.competition.name}
                            <span className="text-[#C4C4C4] text-xs ml-2">
                                · {fmtDate(team.competition.compDay)} · {fmtTime(team.competition.startTime)}–{fmtTime(team.competition.endTime)}
                            </span>
                        </div>
                    </div>

                    {/* New competition dropdown */}
                    <div className="space-y-2">
                        <label className="block text-[10px] tracking-widest text-primaryred font-semibold">
                            SELECT NEW COMPETITION
                        </label>
                        {availableComps.length === 0 ? (
                            <p className="text-[#C4C4C4] text-xs">
                                No compatible competitions found (team size: {team.memberCount} members).
                            </p>
                        ) : (
                            <div className="relative">
                                <select
                                    value={selectedCompId}
                                    onChange={(e) => {
                                        setSelectedCompId(e.target.value)
                                        setClashes(null)
                                        setError(null)
                                    }}
                                    className="w-full bg-[#191111] border border-primaryred-muted focus:border-primaryred focus:ring-2 focus:ring-primaryred p-3 pr-9 text-white text-sm appearance-none focus:outline-none transition-all"
                                >
                                    <option value="">— Select competition —</option>
                                    {availableComps.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name} · {fmtDate(c.compDay)} · {fmtTime(c.startTime)}–{fmtTime(c.endTime)}
                                        </option>
                                    ))}
                                </select>
                                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-primaryred">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.24 4.5a.75.75 0 0 1-1.08 0l-4.24-4.5a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" />
                                    </svg>
                                </span>
                            </div>
                        )}

                        {/* Selected comp details */}
                        {selectedComp && (
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-[#C4C4C4] bg-[#271C1C] border border-primaryred-muted p-3">
                                <div><span className="text-primaryred">Fee:</span> PKR {selectedComp.fee}</div>
                                <div><span className="text-primaryred">Team size:</span> {selectedComp.minTeamSize}–{selectedComp.maxTeamSize}</div>
                            </div>
                        )}
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500 p-3 text-red-400 text-xs">
                            {error}
                        </div>
                    )}

                    {/* Clash warning */}
                    {clashes && clashes.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-yellow-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                                </svg>
                                <p className="text-yellow-400 text-xs font-semibold tracking-wide">
                                    TIMING CLASHES DETECTED
                                </p>
                            </div>
                            <ClashList clashes={clashes} />
                            <p className="text-[#C4C4C4] text-xs">
                                These members are already registered in a competition that overlaps with the new timing. Do you still want to proceed?
                            </p>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <button
                                    onClick={() => submit(true)}
                                    disabled={submitting}
                                    className="flex-1 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-white px-4 py-2.5 tracking-widest text-xs font-semibold transition-colors"
                                >
                                    {submitting ? 'CHANGING...' : 'FORCE CHANGE ANYWAY'}
                                </button>
                                <button
                                    onClick={onClose}
                                    className="flex-1 border border-primaryred-muted hover:border-primaryred text-[#C4C4C4] hover:text-white px-4 py-2.5 tracking-widest text-xs font-semibold transition-colors"
                                >
                                    CANCEL
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Normal action buttons */}
                    {!clashes && (
                        <div className="flex flex-col sm:flex-row gap-2 pt-1">
                            <button
                                onClick={() => submit(false)}
                                disabled={!selectedCompId || submitting || availableComps.length === 0}
                                className="flex-1 bg-primaryred hover:bg-red-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2.5 tracking-widest text-xs font-semibold transition-colors"
                            >
                                {submitting ? 'CHANGING...' : 'CONFIRM CHANGE'}
                            </button>
                            <button
                                onClick={onClose}
                                className="flex-1 border border-primaryred-muted hover:border-primaryred text-[#C4C4C4] hover:text-white px-4 py-2.5 tracking-widest text-xs font-semibold transition-colors"
                            >
                                CANCEL
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// ─── Team Registration Card ───────────────────────────────────────────────────

interface TeamCardProps {
    team: TeamRegistration
    onChangeCompetition: (team: TeamRegistration) => void
    justChanged: boolean
}

function TeamCard({ team, onChangeCompetition, justChanged }: TeamCardProps) {
    return (
        <div className={`border p-4 sm:p-5 transition-colors ${
            justChanged
                ? 'border-green-600 bg-green-500/5'
                : 'border-primaryred-muted bg-[#1A1111] hover:border-primaryred/60'
        }`}>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                {/* Info */}
                <div className="flex-1 space-y-3 min-w-0">
                    {/* Competition name + status */}
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-white font-bold text-sm tracking-wide">
                            {team.competition.name}
                        </h3>
                        <StatusBadge status={team.paymentStatus} />
                        {team.isLeader && (
                            <span className="text-[9px] tracking-widest text-primaryred border border-primaryred px-1.5 py-0.5">
                                LEADER
                            </span>
                        )}
                        {justChanged && (
                            <span className="text-[9px] tracking-widest text-green-400 border border-green-600 bg-green-500/10 px-1.5 py-0.5">
                                UPDATED
                            </span>
                        )}
                    </div>

                    {/* Competition details */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-xs text-[#C4C4C4]">
                        <div>
                            <span className="text-primaryred">Date:</span>{' '}
                            {fmtDate(team.competition.compDay)}
                        </div>
                        <div>
                            <span className="text-primaryred">Time:</span>{' '}
                            {fmtTime(team.competition.startTime)}–{fmtTime(team.competition.endTime)}
                        </div>
                        <div>
                            <span className="text-primaryred">Fee:</span> PKR {team.competition.fee}
                        </div>
                        <div>
                            <span className="text-primaryred">Team:</span> {team.teamName}
                        </div>
                        <div>
                            <span className="text-primaryred">Ref:</span>{' '}
                            <span className="font-mono">{team.referenceId}</span>
                        </div>
                        <div>
                            <span className="text-primaryred">Members:</span> {team.memberCount}
                        </div>
                    </div>
                </div>

                {/* Action */}
                <button
                    onClick={() => onChangeCompetition(team)}
                    className="self-start sm:self-center shrink-0 border border-primaryred text-primaryred hover:bg-primaryred hover:text-white px-4 py-2 text-xs tracking-widest font-semibold transition-colors whitespace-nowrap"
                >
                    CHANGE COMPETITION
                </button>
            </div>
        </div>
    )
}

// ─── Participant Profile Card ─────────────────────────────────────────────────

function ParticipantCard({ profile, teamCount }: { profile: ParticipantProfile; teamCount: number }) {
    return (
        <div className="border border-primaryred bg-[#1A1111] p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="text-white font-bold text-lg sm:text-xl tracking-wide">
                        {profile.fullName}
                    </h2>
                    <p className="text-[#C4C4C4] text-xs tracking-wide mt-0.5">{profile.email}</p>
                </div>
                <span className="text-[10px] tracking-widest text-primaryred border border-primaryred px-2.5 py-1">
                    {teamCount} COMPETITION{teamCount !== 1 ? 'S' : ''}
                </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-3 pt-1">
                <InfoPill label="CNIC"        value={profile.cnic} />
                <InfoPill label="PHONE"       value={profile.phone} />
                <InfoPill label="INSTITUTION" value={profile.institution} />
            </div>
        </div>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function UpdateParticipantRecordTab() {
    const [emailInput,   setEmailInput]   = useState('')
    const [searching,    setSearching]    = useState(false)
    const [profile,      setProfile]      = useState<ParticipantProfile | null>(null)
    const [teams,        setTeams]        = useState<TeamRegistration[]>([])
    const [competitions, setCompetitions] = useState<Competition[]>([])
    const [error,        setError]        = useState<string | null>(null)
    const [activeTeam,   setActiveTeam]   = useState<TeamRegistration | null>(null)
    const [changedTeams, setChangedTeams] = useState<Set<string>>(new Set())

    // Fetch all competitions once (for modal dropdown)
    useEffect(() => {
        apiFetch('/api/registrations/competitions-form')
            .then((r) => r.json())
            .then((json) => { if (json.success) setCompetitions(json.data) })
            .catch(() => {/* silent */})
    }, [])

    const handleSearch = useCallback(async () => {
        const email = emailInput.trim()
        if (!email) return

        setSearching(true)
        setError(null)
        setProfile(null)
        setTeams([])
        setChangedTeams(new Set())

        try {
            const res  = await apiFetch(`/api/participants/by-email?email=${encodeURIComponent(email)}`)
            const json = await res.json()

            if (!res.ok) {
                setError(json.message || 'Participant not found.')
                return
            }

            setProfile(json.data.participant)
            setTeams(json.data.teams)
        } catch {
            setError('Could not reach the server.')
        } finally {
            setSearching(false)
        }
    }, [emailInput])

    function handleChangeSuccess(teamId: string, newCompName: string) {
        // Update the team's competition in local state
        setTeams((prev) => prev.map((t) => {
            if (t.teamId !== teamId) return t
            const comp = competitions.find((c) => c.name === newCompName) ||
                         competitions.find((c) => c.id === t.competition.id)
            if (!comp) return t
            return {
                ...t,
                competition: {
                    id:        comp.id,
                    name:      newCompName,
                    compDay:   comp.compDay,
                    startTime: comp.startTime,
                    endTime:   comp.endTime,
                    fee:       comp.fee,
                },
            }
        }))

        // Re-fetch to get accurate data after change
        const email = emailInput.trim()
        if (email) {
            apiFetch(`/api/participants/by-email?email=${encodeURIComponent(email)}`)
                .then((r) => r.json())
                .then((json) => {
                    if (json.success) {
                        setProfile(json.data.participant)
                        setTeams(json.data.teams)
                    }
                })
                .catch(() => {/* silent */})
        }

        setChangedTeams((prev) => new Set([...prev, teamId]))
        setActiveTeam(null)
    }

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleSearch()
    }

    return (
        <div className="border border-primaryred-muted bg-[#271C1C] p-4 sm:p-6 md:p-8 lg:p-10 space-y-6">

            {/* Search bar */}
            <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                    <input
                        type="email"
                        placeholder="Enter participant email address..."
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="flex-1 bg-[#191111] border border-primaryred-muted focus:border-primaryred focus:ring-2 focus:ring-primaryred p-3 text-white text-sm placeholder:text-[#666] transition-all focus:outline-none"
                    />
                    <button
                        onClick={handleSearch}
                        disabled={searching || !emailInput.trim()}
                        className="bg-primaryred hover:bg-red-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-8 py-3 tracking-widest text-sm font-semibold transition-colors whitespace-nowrap"
                    >
                        {searching ? 'SEARCHING...' : 'SEARCH'}
                    </button>
                </div>
                <p className="text-[#C4C4C4] text-xs tracking-wide">
                    Enter the participant&apos;s email address to view their profile and registered competitions
                </p>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-500/10 border border-red-500 p-4 text-red-400 text-sm">
                    {error}
                </div>
            )}

            {/* Searching spinner */}
            {searching && (
                <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-primaryred border-t-transparent rounded-full animate-spin" />
                </div>
            )}

            {/* Results */}
            {!searching && profile && (
                <div className="space-y-5">
                    {/* Profile card */}
                    <ParticipantCard profile={profile} teamCount={teams.length} />

                    {/* Team registrations */}
                    <div className="space-y-3">
                        <h3 className="text-white text-xs font-bold tracking-widest">
                            COMPETITION REGISTRATIONS
                        </h3>

                        {teams.length === 0 ? (
                            <div className="border border-primaryred-muted bg-[#1A1111] p-8 flex items-center justify-center">
                                <p className="text-[#C4C4C4] text-xs tracking-widest">
                                    // NOT_REGISTERED_IN_ANY_COMPETITION
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {teams.map((team) => (
                                    <TeamCard
                                        key={team.teamId}
                                        team={team}
                                        onChangeCompetition={setActiveTeam}
                                        justChanged={changedTeams.has(team.teamId)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Empty state before any search */}
            {!searching && !profile && !error && (
                <div className="flex items-center justify-center py-12 text-[#C4C4C4] text-xs tracking-widest">
                    // ENTER_EMAIL_TO_GET_STARTED
                </div>
            )}

            {/* Change competition modal */}
            {activeTeam && (
                <ChangeCompModal
                    team={activeTeam}
                    competitions={competitions}
                    onClose={() => setActiveTeam(null)}
                    onSuccess={handleChangeSuccess}
                />
            )}
        </div>
    )
}
