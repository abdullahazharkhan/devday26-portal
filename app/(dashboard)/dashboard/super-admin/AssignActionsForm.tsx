'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { ALL_ACTIONS, ROLE_DEFAULT_ACTIONS, teamConfig } from '../components/tabsConfig'

// ─── Types ────────────────────────────────────────────────────────────────────

interface StaffUser {
    id: string
    email: string
    fullName: string | null
    nuId: string | null
    staffRole: string | null
    extraActions: string[]
    effectiveActions: string[]
}

// ─── Grouped actions for the checkbox UI ─────────────────────────────────────

const ACTION_GROUPS = Object.entries(teamConfig).map(([slug, cfg]) => ({
    slug,
    label: cfg.label,
    actions: cfg.tabs.map((t) => t.action),
}))

// Collect any actions not already covered by a dashboard group
const groupedActions = new Set(ACTION_GROUPS.flatMap((g) => g.actions))
const ungroupedActions = Object.keys(ALL_ACTIONS).filter((a) => !groupedActions.has(a))
if (ungroupedActions.length > 0) {
    ACTION_GROUPS.push({ slug: 'other', label: 'OTHER', actions: ungroupedActions })
}

// Deduplicate (some actions appear in multiple dashboards)
const UNIQUE_ACTIONS = [...new Set(ACTION_GROUPS.flatMap((g) => g.actions))]

// ─── Component ────────────────────────────────────────────────────────────────

export default function AssignActionsForm() {
    const [users, setUsers] = useState<StaffUser[]>([])
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
    const [checkedActions, setCheckedActions] = useState<Set<string>>(new Set())
    const [roleDefaults, setRoleDefaults] = useState<Set<string>>(new Set())
    const [isLoadingUsers, setIsLoadingUsers] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    // ── Fetch users list ─────────────────────────────────────────────────────

    const fetchUsers = useCallback(async () => {
        setIsLoadingUsers(true)
        try {
            const res = await fetch('/api/users')
            const json = await res.json()
            if (json.success) setUsers(json.data)
        } catch {
            // silent
        } finally {
            setIsLoadingUsers(false)
        }
    }, [])

    useEffect(() => { fetchUsers() }, [fetchUsers])

    // ── When a user is selected, hydrate the checkboxes ──────────────────────

    useEffect(() => {
        if (!selectedUserId) {
            setCheckedActions(new Set())
            setRoleDefaults(new Set())
            return
        }

        const user = users.find((u) => u.id === selectedUserId)
        if (!user) return

        const defaults = new Set(ROLE_DEFAULT_ACTIONS[user.staffRole ?? ''] ?? [])
        setRoleDefaults(defaults)

        // Checked = role defaults + extra actions
        setCheckedActions(new Set(user.effectiveActions))
    }, [selectedUserId, users])

    // ── Toggle a single action ───────────────────────────────────────────────

    const toggleAction = (action: string) => {
        // Cannot un-check a role-default action
        if (roleDefaults.has(action)) return

        setCheckedActions((prev) => {
            const next = new Set(prev)
            if (next.has(action)) next.delete(action)
            else next.add(action)
            return next
        })
    }

    // ── Save ─────────────────────────────────────────────────────────────────

    const handleSave = async () => {
        if (!selectedUserId) return
        setIsSaving(true)
        setMessage(null)

        // Send ALL checked actions; backend strips role defaults
        const actions = Array.from(checkedActions)

        try {
            const res = await fetch(`/api/users/${selectedUserId}/actions`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ actions }),
            })

            const json = await res.json()

            if (res.ok) {
                setMessage({ type: 'success', text: 'Actions updated successfully.' })

                // Update the local user list so the checkboxes stay correct
                setUsers((prev) =>
                    prev.map((u) =>
                        u.id === selectedUserId
                            ? { ...u, extraActions: json.data.extraActions, effectiveActions: json.data.effectiveActions }
                            : u
                    )
                )
            } else {
                setMessage({ type: 'error', text: json.message ?? 'Failed to update actions.' })
            }
        } catch {
            setMessage({ type: 'error', text: 'Could not reach the server.' })
        } finally {
            setIsSaving(false)
        }
    }

    // ── UI ───────────────────────────────────────────────────────────────────

    const selectedUser = users.find((u) => u.id === selectedUserId)

    return (
        <div className="flex flex-col gap-6">

            {/* User selector */}
            <div className="border border-primaryred-muted bg-[#271C1C] p-5 sm:p-8">
                <h2 className="text-sm tracking-[0.2em] text-[#C4C4C4] mb-4">
                    // SELECT A USER TO MANAGE THEIR ACTIONS
                </h2>

                {isLoadingUsers ? (
                    <p className="text-[#C4C4C4] text-xs tracking-widest animate-pulse">LOADING_USERS...</p>
                ) : (
                    <div className="relative">
                        <select
                            value={selectedUserId ?? ''}
                            onChange={(e) => { setSelectedUserId(e.target.value || null); setMessage(null) }}
                            className="bg-[#191111] border border-primaryred-muted focus:border-primaryred focus:ring-primaryred p-3 pr-10 text-white text-sm transition-all duration-200 focus:outline-none focus:ring-2 w-full appearance-none"
                        >
                            <option value="" className="text-gray-400">Select a user</option>
                            {users.map((u) => (
                                <option key={u.id} value={u.id}>
                                    {u.fullName ?? u.email} — {u.staffRole ?? 'NO_ROLE'} ({u.nuId ?? u.email})
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
            </div>

            {/* Action checkboxes */}
            {selectedUser && (
                <div className="border border-primaryred-muted bg-[#271C1C] p-5 sm:p-8 flex flex-col gap-6">
                    <div>
                        <h2 className="text-white text-base font-bold tracking-widest">
                            {(selectedUser.fullName ?? selectedUser.email).toUpperCase()}
                        </h2>
                        <p className="text-[#C4C4C4] text-xs tracking-wider mt-1">
                            Role: <span className="text-primaryred">{selectedUser.staffRole ?? 'NONE'}</span>
                            {' '}— Role-default actions are locked and cannot be removed.
                        </p>
                        <div className="w-10 h-0.5 bg-primaryred mt-2" />
                    </div>

                    {ACTION_GROUPS.map((group) => {
                        // Only show unique actions per group (skip if all are shown in earlier group)
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
                                                className={`flex items-center gap-3 px-4 py-2.5 border transition-colors duration-200 cursor-pointer select-none ${
                                                    isChecked
                                                        ? 'border-primaryred bg-primaryred/10'
                                                        : 'border-primaryred-muted hover:border-primaryred/50'
                                                } ${isDefault ? 'opacity-70 cursor-not-allowed' : ''}`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    disabled={isDefault}
                                                    onChange={() => toggleAction(action)}
                                                    className="accent-primaryred w-4 h-4 shrink-0"
                                                />
                                                <span className="text-white text-xs tracking-wider">
                                                    {label.toUpperCase()}
                                                </span>
                                                {isDefault && (
                                                    <span className="ml-auto text-[9px] tracking-widest text-primaryred border border-primaryred px-1.5 py-0.5">
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

                    {/* Status message */}
                    {message && (
                        <p className={`text-xs tracking-wide border px-4 py-2 ${
                            message.type === 'success'
                                ? 'text-green-400 border-green-500 bg-green-500/10'
                                : 'text-red-500 border-red-500 bg-red-500/10'
                        }`}>
                            {message.text}
                        </p>
                    )}

                    {/* Save button */}
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
            )}
        </div>
    )
}
