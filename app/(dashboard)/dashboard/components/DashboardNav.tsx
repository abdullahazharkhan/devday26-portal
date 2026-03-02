"use client"

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { useAuthStore } from '@/lib/stores/authStore'

type Tab = {
    id: string
    label: string
}

type TeamConfig = {
    label: string
    tabs: Tab[]
}

const teamConfig: Record<string, TeamConfig> = {
    competitions: {
        label: "COMPETITIONS",
        tabs: [
            { id: "view-registration-details", label: "View Registration Details" },
            { id: "view-all-competitions", label: "View All Competitions" },
            { id: "edit-competition-time", label: "Edit Competition Time" },
        ],
    },
    food: {
        label: "FOOD",
        tabs: [
            { id: "view-stall-details", label: "View Stall Details" },
            { id: "add-new-stall", label: "Add New Stall" },
            { id: "edit-stall", label: "Edit Stall" },
            { id: "delete-stall", label: "Delete Stall" },
        ],
    },
    gr: {
        label: "GR",
        tabs: [
            { id: "view-all-companies", label: "View All Companies" },
            { id: "add-new-company", label: "Add New Company" },
            { id: "assign-booth", label: "Assign Booth" },
            { id: "edit-company", label: "Edit Company" },
            { id: "delete-company", label: "Delete Company" },
        ],
    },
    pr: {
        label: "PR",
        tabs: [
            { id: "view-all-registrations", label: "View All Registrations" },
            { id: "create-new-registration", label: "Create New Registration" },
            { id: "update-attendance", label: "Update Attendance" },
        ],
    },
    "super-admin": {
        label: "SUPER_ADMIN",
        tabs: [
            { id: "view-all-members", label: "View All Members" },
            { id: "add-members-to-team", label: "Add Members to Team" },
            { id: "create-accounts", label: "Create Accounts for Members" },
            { id: "update-participant-record", label: "Update Participant Record" },
        ],
    },
    excom: {
        label: "EXCOM",
        tabs: [
            { id: "view-all-members", label: "View All Members" },
            { id: "view-all-registrations", label: "View All Registrations" },
            { id: "view-all-competitions", label: "View All Competitions" },
        ],
    },
}

function getInitials(fullName: string | null): string {
    if (!fullName) return '?'
    return fullName
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join('')
}

export default function DashboardNav() {
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const router = useRouter()
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const [isLoggingOut, setIsLoggingOut] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    const user      = useAuthStore((s) => s.user)
    const clearUser = useAuthStore((s) => s.clearUser)

    const displayName = (user?.fullName ?? user?.email ?? 'USER').toUpperCase()
    const initials    = getInitials(user?.fullName ?? null)
    const roleLabel   = user?.staffRole ?? '—'

    // pathname: /dashboard/<team>
    const segments = pathname.split('/').filter(Boolean)
    const teamSlug = segments[1] ?? ''
    const team = teamConfig[teamSlug]
    const activeTab = searchParams.get('tab') ?? (team?.tabs[0]?.id ?? '')

    const buildTabHref = (tabId: string) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('tab', tabId)
        return `/dashboard/${teamSlug}?${params.toString()}`
    }

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    return (
        <header className="bg-[#191111] border-b border-primaryred-muted">
            {/* Top bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 items-center px-4 sm:px-6 py-3 sm:py-4 relative gap-y-3 sm:gap-y-0">

                {/* Left: Logo */}
                <div className="flex items-center gap-2 sm:gap-3">
                    <Image
                        src="/logos/devday26-logo.png"
                        alt="DevDay 26 Logo"
                        width={36}
                        height={36}
                        className="w-7 h-7 sm:w-9 sm:h-9 object-contain"
                        priority
                    />
                    <span className="font-bold text-xl sm:text-3xl tracking-[0.15rem] sm:tracking-widest text-primaryred leading-none select-none">
                        DEVDAY&nbsp;&apos;26
                    </span>
                </div>

                {/* Center: Team name */}
                <div className="col-span-2 sm:col-span-1 sm:col-start-2 row-start-2 sm:row-start-1 flex justify-center">
                    {team && (
                        <h2 className="font-bold text-lg md:text-xl tracking-[0.12rem] sm:tracking-[0.2rem] text-white uppercase text-center">
                            TEAM_{team.label}
                        </h2>
                    )}
                </div>

                {/* Right: User avatar + dropdown */}
                <div className="flex justify-end" ref={dropdownRef}>
                    <button
                        onClick={() => setDropdownOpen(prev => !prev)}
                        className="flex items-center gap-2 sm:gap-3 group focus:outline-none"
                    >
                        <span className="hidden md:block text-xs tracking-widest text-[#C4C4C4] group-hover:text-white transition-colors duration-200 uppercase">
                            {displayName}
                        </span>
                        <div className="w-8 h-8 sm:w-9 sm:h-9 bg-primaryred-muted border border-primaryred flex items-center justify-center text-xs font-bold text-primaryred shrink-0">
                            {initials}
                        </div>
                    </button>

                    {/* Dropdown */}
                    {dropdownOpen && (
                        <div className="absolute top-full right-0 mt-1 w-[calc(100vw-2rem)] max-w-72 sm:max-w-80 bg-[#271C1C] border border-primaryred-muted z-50 shadow-xl">
                            <div className="p-4 sm:p-5 border-b border-primaryred-muted flex items-start gap-3 sm:gap-4">
                                <div className="flex flex-col gap-1 min-w-0">
                                    <p className="text-white text-sm font-semibold tracking-wide truncate">
                                        {displayName}
                                    </p>
                                    <p className="text-[#C4C4C4] text-xs tracking-wide truncate">
                                        {user?.email ?? '—'}
                                    </p>
                                    <span className="mt-1 self-start text-[10px] tracking-widest text-primaryred border border-primaryred px-2 py-0.5">
                                        {roleLabel}
                                    </span>
                                </div>
                            </div>
                            <div className="p-3">
                                <button
                                    disabled={isLoggingOut}
                                    onClick={async () => {
                                        setIsLoggingOut(true)
                                        setDropdownOpen(false)
                                        try {
                                            await fetch('/api/auth/logout', { method: 'POST' })
                                        } finally {
                                            clearUser()
                                            router.push('/login')
                                        }
                                    }}
                                    className="w-full text-xs tracking-widest text-primaryred border border-primaryred px-4 py-2 hover:bg-primaryred hover:text-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoggingOut ? 'LOGGING_OUT...' : 'LOGOUT'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Tabs */}
            {team && (
                <div className="overflow-x-auto scrollbar-none">
                    <nav className="flex border-t border-primaryred-muted min-w-max">
                        {team.tabs.map((tab, index) => {
                            const isActive = activeTab === tab.id
                            return (
                                <Link
                                    key={tab.id}
                                    href={buildTabHref(tab.id)}
                                    className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 sm:py-3 text-[10px] sm:text-[11px] tracking-[0.08rem] sm:tracking-[0.15rem] uppercase font-medium transition-colors duration-200 whitespace-nowrap border-b-2 ${
                                        isActive
                                            ? 'text-white bg-[#271C1C] border-primaryred'
                                            : 'text-[#C4C4C4] hover:text-white hover:bg-[#271C1C] border-transparent'
                                    }`}
                                >
                                    <span className="text-primaryred font-bold">
                                        {String(index + 1).padStart(2, '0')}
                                    </span>
                                    {tab.label.toUpperCase()}
                                </Link>
                            )
                        })}
                    </nav>
                </div>
            )}
        </header>
    )
}
