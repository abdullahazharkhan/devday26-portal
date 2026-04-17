"use client"

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useState, useRef, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { useAuthStore } from '@/lib/stores/authStore'
import teamConfig, { ALL_ACTIONS } from './tabsConfig'

type VisibleTab = {
    action: string
    label: string
    groupSlug: string
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

function NavSkeleton() {
    return (
        <div className="bg-[#191111] border-b border-primaryred-muted">
            <div className="grid grid-cols-2 sm:grid-cols-3 items-center px-4 sm:px-6 py-3 sm:py-4 gap-y-3 sm:gap-y-0">
                {/* Logo placeholder */}
                <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-7 h-7 sm:w-9 sm:h-9 animate-pulse bg-[#3a2525] rounded-sm" />
                    <span className="font-bold text-xl sm:text-3xl tracking-[0.15rem] sm:tracking-widest text-primaryred leading-none select-none">
                        DEVDAY&nbsp;&apos;26
                    </span>
                </div>
                {/* Team name skeleton */}
                <div className="col-span-2 sm:col-span-1 sm:col-start-2 row-start-2 sm:row-start-1 flex justify-center">
                    <div className="w-36 h-6 animate-pulse bg-[#3a2525] rounded-sm" />
                </div>
                {/* Avatar skeleton */}
                <div className="flex justify-end">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 animate-pulse bg-[#3a2525] rounded-sm" />
                </div>
            </div>
            {/* Tab skeletons */}
            <div className="border-t border-primaryred-muted flex">
                {[120, 96, 108].map((w, i) => (
                    <div key={i} className="px-3 sm:px-5 py-2.5 sm:py-3">
                        <div className={`h-3 w-${w === 120 ? '24' : w === 96 ? '20' : '24'} animate-pulse bg-[#3a2525] rounded-sm`} style={{ width: w }} />
                    </div>
                ))}
            </div>
        </div>
    )
}

export default function DashboardNav() {
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const router = useRouter()
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const [isLoggingOut, setIsLoggingOut] = useState(false)
    const [hasMounted, setHasMounted] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [activeGroup, setActiveGroup] = useState('all')
    const [isActionsPanelOpen, setIsActionsPanelOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    const user      = useAuthStore((s) => s.user)
    const clearUser = useAuthStore((s) => s.clearUser)
    const setUser   = useAuthStore((s) => s.setUser)
    const isStale   = useAuthStore((s) => s.isStale)

    useEffect(() => { setHasMounted(true) }, [])

    // Only re-fetch the profile when the cached data is stale (>5 min) or absent.
    // This avoids an unnecessary /api/auth/me round-trip on every mount while
    // still picking up permission changes granted by a super-admin.
    useEffect(() => {
        if (!hasMounted) return
        if (!isStale()) return    // fresh data — skip network call
        fetch('/api/auth/me')
            .then((r) => r.json())
            .then((json) => {
                if (json.success && json.data) setUser(json.data)
            })
            .catch(() => { /* silent — stale data is better than an error */ })
    }, [hasMounted, setUser, isStale])

    const displayName = (user?.fullName ?? user?.email ?? 'USER').toUpperCase()
    const initials    = getInitials(user?.fullName ?? null)
    const roleLabel   = user?.staffRole ?? '—'

    const userActions = user?.actions ?? []

    // pathname: /dashboard/<team>
    const segments = pathname.split('/').filter(Boolean)
    const teamSlug = segments[1] ?? ''
    const team = teamConfig[teamSlug]  // used only for the centre heading label

    const actionGroupMap = useMemo(() => {
        const map = new Map<string, { slug: string; label: string }>()
        Object.entries(teamConfig).forEach(([slug, cfg]) => {
            cfg.tabs.forEach((tab) => {
                if (!map.has(tab.action)) {
                    map.set(tab.action, { slug, label: cfg.label })
                }
            })
        })
        return map
    }, [])

    // Show every action the user holds, in the canonical order defined by ALL_ACTIONS,
    // regardless of which team dashboard they are on.  This ensures cross-team actions
    // granted by a super-admin appear as tabs immediately without a re-login.
    const visibleTabs: VisibleTab[] = Object.entries(ALL_ACTIONS)
        .filter(([action]) => userActions.includes(action))
        .map(([action, { label }]) => {
            const group = actionGroupMap.get(action)
            return {
                action,
                label,
                groupSlug: group?.slug ?? 'other',
            }
        })

    const tabIndexMap = useMemo(() => {
        return new Map(visibleTabs.map((tab, index) => [tab.action, index + 1]))
    }, [visibleTabs])

    const groupOptions = useMemo(() => {
        const orderedSlugs = Object.keys(teamConfig)
        const available = new Set(visibleTabs.map((tab) => tab.groupSlug))

        const options = orderedSlugs
            .filter((slug) => available.has(slug))
            .map((slug) => ({
                slug,
                label: teamConfig[slug]?.label?.replaceAll('_', ' ') ?? slug.toUpperCase(),
            }))

        if (available.has('other')) {
            options.push({ slug: 'other', label: 'OTHER' })
        }

        return options
    }, [visibleTabs])

    const normalizedSearch = searchTerm.trim().toLowerCase()
    const filteredTabs = visibleTabs.filter((tab) => {
        const matchesGroup = activeGroup === 'all' || tab.groupSlug === activeGroup
        const matchesSearch =
            normalizedSearch.length === 0 ||
            tab.label.toLowerCase().includes(normalizedSearch) ||
            tab.action.toLowerCase().includes(normalizedSearch)
        return matchesGroup && matchesSearch
    })

    const groupedFilteredTabs = groupOptions
        .map((group) => ({
            ...group,
            tabs: filteredTabs.filter((tab) => tab.groupSlug === group.slug),
        }))
        .filter((group) => group.tabs.length > 0)

    const activeTab = searchParams.get('tab') ?? (visibleTabs[0]?.action ?? '')

    const buildTabHref = (tabAction: string) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('tab', tabAction)
        return `/dashboard/${teamSlug}?${params.toString()}`
    }

    // All hooks must be called before any conditional return
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    // Zustand hydrates from localStorage client-side: show skeleton until mounted
    if (!hasMounted) return <NavSkeleton />

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
            {visibleTabs.length > 0 && (
                <div className="border-t border-primaryred-muted px-4 sm:px-6 py-3 sm:py-4 space-y-3 bg-[#161010]">
                    <button
                        type="button"
                        onClick={() => setIsActionsPanelOpen((prev) => !prev)}
                        aria-expanded={isActionsPanelOpen}
                        className="w-full border border-primaryred-muted bg-[#211616] px-3 sm:px-4 py-2.5 text-left hover:border-primaryred transition-colors"
                    >
                        <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-[11px] sm:text-xs tracking-[0.14rem] text-white uppercase font-semibold">
                                    Choose an action
                                </p>
                                <p className="text-[10px] sm:text-[11px] tracking-[0.08rem] text-[#A58F8F] uppercase mt-1 truncate">
                                    {isActionsPanelOpen
                                        ? 'Collapse action menu'
                                        : `Expand action menu • active: ${(ALL_ACTIONS[activeTab]?.label ?? 'none').toUpperCase()}`}
                                </p>
                            </div>
                            <span className="text-primaryred text-sm leading-none" aria-hidden="true">
                                {isActionsPanelOpen ? '−' : '+'}
                            </span>
                        </div>
                    </button>

                    {isActionsPanelOpen && (
                        <>
                            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                                <div className="relative flex-1">
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="SEARCH ACTIONS"
                                        aria-label="Search available actions"
                                        className="w-full bg-[#241919] border border-primaryred-muted text-[11px] sm:text-xs tracking-[0.12rem] text-white placeholder:text-[#7B6A6A] px-3 sm:px-4 py-2.5 outline-none focus:border-primaryred transition-colors"
                                    />
                                </div>
                                <div className="text-[10px] sm:text-[11px] tracking-[0.14rem] text-[#C4C4C4] uppercase whitespace-nowrap">
                                    {filteredTabs.length} of {visibleTabs.length} actions
                                </div>
                            </div>

                            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
                                <button
                                    type="button"
                                    onClick={() => setActiveGroup('all')}
                                    className={`px-3 py-1.5 text-[10px] tracking-[0.12rem] uppercase border transition-colors whitespace-nowrap ${
                                        activeGroup === 'all'
                                            ? 'border-primaryred bg-[#2E1A1A] text-white'
                                            : 'border-primaryred-muted text-[#C4C4C4] hover:text-white hover:border-primaryred'
                                    }`}
                                >
                                    All Teams
                                </button>

                                {groupOptions.map((group) => {
                                    const isActiveGroup = activeGroup === group.slug
                                    return (
                                        <button
                                            key={group.slug}
                                            type="button"
                                            onClick={() => setActiveGroup(group.slug)}
                                            className={`px-3 py-1.5 text-[10px] tracking-[0.12rem] uppercase border transition-colors whitespace-nowrap ${
                                                isActiveGroup
                                                    ? 'border-primaryred bg-[#2E1A1A] text-white'
                                                    : 'border-primaryred-muted text-[#C4C4C4] hover:text-white hover:border-primaryred'
                                            }`}
                                        >
                                            {group.label}
                                        </button>
                                    )
                                })}
                            </div>

                            {groupedFilteredTabs.length === 0 ? (
                                <div className="border border-primaryred-muted bg-[#1E1515] px-4 py-4 text-[11px] tracking-[0.1rem] text-[#C4C4C4] uppercase">
                                    No actions found for this filter.
                                </div>
                            ) : (
                                <nav className="space-y-3">
                                    {groupedFilteredTabs.map((group) => (
                                        <section key={group.slug} className="border border-primaryred-muted/60 bg-[#1D1414]">
                                            <div className="px-3 sm:px-4 py-2 border-b border-primaryred-muted/70 flex items-center justify-between gap-3">
                                                <p className="text-[10px] sm:text-[11px] tracking-[0.14rem] text-primaryred uppercase font-semibold">
                                                    {group.label}
                                                </p>
                                                <p className="text-[10px] tracking-[0.12rem] text-[#8F7A7A] uppercase">
                                                    {group.tabs.length} actions
                                                </p>
                                            </div>

                                            <div className="p-2 sm:p-3 flex flex-wrap gap-2">
                                                {group.tabs.map((tab) => {
                                                    const isActive = activeTab === tab.action
                                                    const tabIndex = tabIndexMap.get(tab.action) ?? 0
                                                    return (
                                                        <Link
                                                            key={tab.action}
                                                            href={buildTabHref(tab.action)}
                                                            className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-[10px] sm:text-[11px] tracking-[0.1rem] uppercase border transition-colors ${
                                                                isActive
                                                                    ? 'text-white bg-[#311D1D] border-primaryred'
                                                                    : 'text-[#C4C4C4] bg-[#261A1A] border-primaryred-muted hover:text-white hover:border-primaryred'
                                                            }`}
                                                        >
                                                            <span className="text-primaryred font-bold">
                                                                {String(tabIndex).padStart(2, '0')}
                                                            </span>
                                                            {tab.label}
                                                        </Link>
                                                    )
                                                })}
                                            </div>
                                        </section>
                                    ))}
                                </nav>
                            )}
                        </>
                    )}
                </div>
            )}
        </header>
    )
}
