'use client'

import { useState, useCallback } from 'react'
import { apiFetch } from '@/lib/apiClient'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Team {
    id: string
    name: string
    referenceId: string
    competition: {
        id: string
        name: string
        compDay: string
    }
    leader: {
        fullName: string
        email: string
    } | null
    memberCount: number
    attendanceMarked: boolean
    markedCount: number
}

type AttendanceMethod = 'SELF_GEOFENCE' | 'STAFF_QR' | 'STAFF_SOFT_MARK'

// ─── Components ───────────────────────────────────────────────────────────────

function LoadingSpinner() {
    return (
        <div className="flex items-center justify-center p-8">
            <div className="w-8 h-8 border-4 border-primaryred border-t-transparent rounded-full animate-spin" />
        </div>
    )
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="flex items-center justify-center p-8 text-[#C4C4C4] text-sm tracking-wide">
            {message}
        </div>
    )
}

interface TeamCardProps {
    team: Team
    onMarkAttendance: (teamId: string) => void
    marking: boolean
}

function TeamCard({ team, onMarkAttendance, marking }: TeamCardProps) {
    const alreadyMarked = team.attendanceMarked

    return (
        <div className={`border bg-[#1A1111] p-4 sm:p-6 transition-colors ${
            alreadyMarked
                ? 'border-green-700'
                : 'border-primaryred-muted hover:border-primaryred'
        }`}>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                {/* Team Info */}
                <div className="flex-1 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 sm:flex-wrap">
                        <h3 className="text-white font-bold text-base sm:text-lg tracking-wide">
                            {team.name}
                        </h3>
                        <span className="text-[#C4C4C4] text-xs tracking-wider">
                            REF: {team.referenceId}
                        </span>
                        {alreadyMarked && (
                            <span className="inline-flex items-center gap-1.5 bg-green-500/15 border border-green-600 text-green-400 text-xs px-2.5 py-0.5 tracking-wide font-semibold">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                                ATTENDANCE MARKED
                            </span>
                        )}
                    </div>
                    
                    <div className="space-y-1 text-sm">
                        <div className="text-[#C4C4C4]">
                            <span className="text-primaryred font-semibold">Competition:</span>{' '}
                            {team.competition.name}
                        </div>
                        <div className="text-[#C4C4C4]">
                            <span className="text-primaryred font-semibold">Date:</span>{' '}
                            {new Date(team.competition.compDay).toLocaleDateString('en-PK', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                            })}
                        </div>
                        {team.leader && (
                            <div className="text-[#C4C4C4]">
                                <span className="text-primaryred font-semibold">Leader:</span>{' '}
                                {team.leader.fullName} ({team.leader.email})
                            </div>
                        )}
                        <div className="text-[#C4C4C4]">
                            <span className="text-primaryred font-semibold">Members:</span>{' '}
                            {alreadyMarked
                                ? <span className="text-green-400">{team.markedCount}/{team.memberCount} present</span>
                                : team.memberCount
                            }
                        </div>
                    </div>
                </div>

                {/* Action Button */}
                <button
                    onClick={() => onMarkAttendance(team.id)}
                    disabled={marking || alreadyMarked}
                    className={`px-6 py-3 tracking-widest text-sm font-semibold transition-colors whitespace-nowrap self-start lg:self-center ${
                        alreadyMarked
                            ? 'bg-green-700/40 border border-green-700 text-green-400 cursor-not-allowed'
                            : marking
                            ? 'bg-gray-600 text-white cursor-not-allowed'
                            : 'bg-primaryred hover:bg-red-600 text-white'
                    }`}
                >
                    {marking ? 'MARKING...' : alreadyMarked ? 'ALREADY MARKED' : 'MARK ATTENDANCE'}
                </button>
            </div>
        </div>
    )
}

interface ConfirmModalProps {
    team: Team | null
    onConfirm: () => void
    onCancel: () => void
    method: AttendanceMethod
    setMethod: (method: AttendanceMethod) => void
}

function ConfirmModal({ team, onConfirm, onCancel, method, setMethod }: ConfirmModalProps) {
    if (!team) return null

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-[#271C1C] border border-primaryred max-w-lg w-full p-6 sm:p-8 space-y-6">
                <h2 className="text-white text-lg sm:text-xl font-bold tracking-widest">
                    CONFIRM ATTENDANCE
                </h2>
                
                <div className="space-y-3 text-sm text-[#C4C4C4]">
                    <div>
                        <span className="text-primaryred font-semibold">Team:</span> {team.name}
                    </div>
                    <div>
                        <span className="text-primaryred font-semibold">Competition:</span>{' '}
                        {team.competition.name}
                    </div>
                    <div>
                        <span className="text-primaryred font-semibold">Members:</span>{' '}
                        {team.memberCount}
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="block text-primaryred text-sm font-semibold tracking-wide">
                        ATTENDANCE METHOD
                    </label>
                    <select
                        value={method}
                        onChange={(e) => setMethod(e.target.value as AttendanceMethod)}
                        className="w-full bg-[#191111] border border-primaryred-muted p-3 text-white text-sm focus:outline-none focus:border-primaryred focus:ring-2 focus:ring-primaryred transition-all"
                    >
                        <option value="STAFF_SOFT_MARK">Staff Soft Mark</option>
                        <option value="STAFF_QR">Staff QR Scan</option>
                        <option value="SELF_GEOFENCE">Self Geofence</option>
                    </select>
                </div>

                <p className="text-[#C4C4C4] text-sm">
                    This will mark attendance for all <span className="text-primaryred font-semibold">{team.memberCount}</span> member(s) of this team. Continue?
                </p>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                        onClick={onConfirm}
                        className="flex-1 bg-primaryred hover:bg-red-600 text-white px-6 py-3 tracking-widest text-sm font-semibold transition-colors"
                    >
                        CONFIRM
                    </button>
                    <button
                        onClick={onCancel}
                        className="flex-1 bg-transparent border border-primaryred-muted hover:border-primaryred text-white px-6 py-3 tracking-widest text-sm font-semibold transition-colors"
                    >
                        CANCEL
                    </button>
                </div>
            </div>
        </div>
    )
}

interface SuccessModalProps {
    team: Team | null
    markedCount: number
    onClose: () => void
}

function SuccessModal({ team, markedCount, onClose }: SuccessModalProps) {
    if (!team) return null

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-[#271C1C] border border-green-500 max-w-lg w-full p-6 sm:p-8 space-y-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                        <svg
                            className="w-6 h-6 text-green-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                            />
                        </svg>
                    </div>
                    <h2 className="text-white text-lg sm:text-xl font-bold tracking-widest">
                        ATTENDANCE MARKED
                    </h2>
                </div>

                <div className="space-y-3 text-sm text-[#C4C4C4]">
                    <div>
                        <span className="text-green-500 font-semibold">Team:</span> {team.name}
                    </div>
                    <div>
                        <span className="text-green-500 font-semibold">Marked:</span>{' '}
                        {markedCount} member(s)
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className="w-full bg-green-500 hover:bg-green-600 text-white px-6 py-3 tracking-widest text-sm font-semibold transition-colors"
                >
                    CLOSE
                </button>
            </div>
        </div>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function UpdateAttendanceTab() {
    const [searchQuery, setSearchQuery] = useState('')
    const [teams, setTeams] = useState<Team[]>([])
    const [searching, setSearching] = useState(false)
    const [marking, setMarking] = useState(false)
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
    const [showConfirmModal, setShowConfirmModal] = useState(false)
    const [showSuccessModal, setShowSuccessModal] = useState(false)
    const [markedCount, setMarkedCount] = useState(0)
    const [method, setMethod] = useState<AttendanceMethod>('STAFF_SOFT_MARK')
    const [error, setError] = useState<string | null>(null)

    const handleSearch = useCallback(async () => {
        if (!searchQuery.trim()) {
            setTeams([])
            setError(null)
            return
        }

        setSearching(true)
        setError(null)

        try {
            const res = await apiFetch(
                `/api/registrations/search?q=${encodeURIComponent(searchQuery.trim())}`
            )

            if (!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.message || 'Search failed')
            }

            const result = await res.json()
            setTeams(result.data || [])
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Search failed')
            setTeams([])
        } finally {
            setSearching(false)
        }
    }, [searchQuery])

    const handleMarkAttendance = (teamId: string) => {
        const team = teams.find((t) => t.id === teamId)
        if (!team) return

        setSelectedTeam(team)
        setShowConfirmModal(true)
    }

    const confirmMarkAttendance = async () => {
        if (!selectedTeam) return

        setMarking(true)
        setShowConfirmModal(false)
        setError(null)

        try {
            const res = await apiFetch(
                `/api/registrations/${selectedTeam.id}/mark-attendance`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ method }),
                }
            )

            if (!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.message || 'Failed to mark attendance')
            }

            const result = await res.json()
            setMarkedCount(result.data?.markedCount || 0)
            setShowSuccessModal(true)

            // Refresh search results
            await handleSearch()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to mark attendance')
        } finally {
            setMarking(false)
        }
    }

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSearch()
        }
    }

    return (
        <div className="border border-primaryred-muted bg-[#271C1C] p-4 sm:p-6 md:p-8 lg:p-10 space-y-6">
            {/* Search Section */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                    <input
                        type="text"
                        placeholder="Search by Team ID, Team Name, or Leader Name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="flex-1 bg-[#191111] border border-primaryred-muted focus:border-primaryred focus:ring-2 focus:ring-primaryred p-3 text-white text-sm placeholder:text-[#666] transition-all focus:outline-none"
                    />
                    <button
                        onClick={handleSearch}
                        disabled={searching || !searchQuery.trim()}
                        className="bg-primaryred hover:bg-red-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-8 py-3 tracking-widest text-sm font-semibold transition-colors whitespace-nowrap"
                    >
                        {searching ? 'SEARCHING...' : 'SEARCH'}
                    </button>
                </div>

                <p className="text-[#C4C4C4] text-xs tracking-wide">
                    Enter Team ID, Team Name, Reference ID, or Leader Name to find teams
                </p>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-500/10 border border-red-500 p-4 text-red-500 text-sm">
                    {error}
                </div>
            )}

            {/* Results Section */}
            <div className="space-y-4">
                {searching ? (
                    <LoadingSpinner />
                ) : teams.length === 0 ? (
                    searchQuery.trim() ? (
                        <EmptyState message="No teams found matching your search" />
                    ) : (
                        <EmptyState message="Enter a search query to find teams" />
                    )
                ) : (
                    <>
                        <div className="text-[#C4C4C4] text-sm tracking-wide">
                            Found {teams.length} team{teams.length !== 1 ? 's' : ''}
                        </div>
                        <div className="space-y-3">
                            {teams.map((team) => (
                                <TeamCard
                                    key={team.id}
                                    team={team}
                                    onMarkAttendance={handleMarkAttendance}
                                    marking={marking}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Modals */}
            {showConfirmModal && (
                <ConfirmModal
                    team={selectedTeam}
                    onConfirm={confirmMarkAttendance}
                    onCancel={() => setShowConfirmModal(false)}
                    method={method}
                    setMethod={setMethod}
                />
            )}

            {showSuccessModal && (
                <SuccessModal
                    team={selectedTeam}
                    markedCount={markedCount}
                    onClose={() => {
                        setShowSuccessModal(false)
                        setSelectedTeam(null)
                    }}
                />
            )}
        </div>
    )
}
