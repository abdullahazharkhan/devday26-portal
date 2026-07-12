'use client'

/**
 * DashboardPageContent
 *
 * Universal tab renderer — used by every team dashboard page.
 * It reads the authenticated user's action list from Zustand and renders
 * whatever component corresponds to the active tab, regardless of which team
 * the user belongs to.  This means cross-team actions granted by a super-admin
 * are automatically rendered here without touching individual page files.
 */

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/authStore'
import { ALL_ACTIONS } from './tabsConfig'

// ─── Tab component imports ────────────────────────────────────────────────────
function TabLoading() {
    return (
        <div className="border border-primaryred-muted bg-[#271C1C] p-5 sm:p-8 md:p-10 min-h-64 sm:min-h-80 flex items-center justify-center">
            <div className="w-36 h-4 animate-pulse bg-[#3a2525] rounded-sm" />
        </div>
    )
}

// Keep each action in its own chunk. Users only download the tab they open.
const ViewRegistrationsTab = dynamic(() => import('./ViewRegistrationsTab'), { loading: TabLoading })
const CreateRegistrationTab = dynamic(() => import('./CreateRegistrationTab'), { loading: TabLoading })
const UpdateAttendanceTab = dynamic(() => import('./UpdateAttendanceTab'), { loading: TabLoading })
const UpdateParticipantRecordTab = dynamic(() => import('./UpdateParticipantRecordTab'), { loading: TabLoading })
const ViewAllUsersTable = dynamic(() => import('../super-admin/ViewAllUsersTable'), { loading: TabLoading })
const CreateAccountForm = dynamic(() => import('../super-admin/CreateAccountForm'), { loading: TabLoading })
const AssignActionsForm = dynamic(() => import('../super-admin/AssignActionsForm'), { loading: TabLoading })
const AmbassadorDashboard = dynamic(() => import('../ambassador-management/AmbassadorDashboard'), { loading: TabLoading })
const ManageAmbassadors = dynamic(() => import('../ambassador-management/ManageAmbassadors'), { loading: TabLoading })
const EditCompetition = dynamic(() => import('../competitions/EditCompetition'), { loading: TabLoading })

// ─────────────────────────────────────────────────────────────────────────────

const COMING_SOON = (
    <div className="border border-primaryred-muted bg-[#271C1C] p-5 sm:p-8 md:p-10 min-h-64 sm:min-h-80 flex items-center justify-center">
        <p className="text-[#C4C4C4] text-xs tracking-widest">{/* CONTENT_COMING_SOON */}</p>
    </div>
)

function renderContent(actionId: string): React.ReactNode {
    switch (actionId) {
        // ── PR / Competitions shared ──────────────────────────────────────────
        case 'view-registration-details':  return <ViewRegistrationsTab />
        case 'create-new-registration':    return <CreateRegistrationTab />
        case 'update-attendance':          return <UpdateAttendanceTab />
        case 'update-participant-record':  return <UpdateParticipantRecordTab />

        // ── Competitions ──────────────────────────────────────────────────────
        case 'edit-competition':           return <EditCompetition />

        // ── Super Admin ───────────────────────────────────────────────────────
        case 'view-all-portal-users':      return <ViewAllUsersTable />
        case 'create-accounts':            return <CreateAccountForm />
        case 'assign-actions-to-users':    return <AssignActionsForm />

        // ── Ambassador Management ─────────────────────────────────────────────
        case 'view-ambassador-dashboard':  return <AmbassadorDashboard />
        case 'manage-ambassadors':         return <ManageAmbassadors />

        // ── Food / GR (not yet implemented) ───────────────────────────────────
        default:                           return COMING_SOON
    }
}

// ─────────────────────────────────────────────────────────────────────────────

const SKELETON = (
    <div className="flex flex-col gap-8">
        <div>
            <div className="h-8 w-64 animate-pulse bg-[#3a2525] rounded-sm" />
            <div className="w-12 h-0.5 bg-primaryred mt-2" />
        </div>
        <div className="border border-primaryred-muted bg-[#271C1C] p-5 sm:p-8 md:p-10 min-h-64 sm:min-h-80 flex items-center justify-center">
            <div className="w-36 h-4 animate-pulse bg-[#3a2525] rounded-sm" />
        </div>
    </div>
)

export default function DashboardPageContent() {
    const [hasMounted, setHasMounted] = useState(false)
    const user = useAuthStore((s) => s.user)
    const searchParams = useSearchParams()

    useEffect(() => {
        setHasMounted(true) // eslint-disable-line react-hooks/set-state-in-effect
    }, [])

    // Wait for Zustand to hydrate from localStorage before rendering
    if (!hasMounted) return SKELETON

    const userActions = user?.actions ?? []

    // Use the requested tab if the user actually holds that action;
    // otherwise fall back to the user's first available action.
    const requestedTab = searchParams.get('tab')
    const activeActionId =
        requestedTab && userActions.includes(requestedTab)
            ? requestedTab
            : (userActions.find((a) => ALL_ACTIONS[a]) ?? '')

    const title = ALL_ACTIONS[activeActionId]?.label?.toUpperCase() ?? activeActionId.toUpperCase()

    return (
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="text-2xl font-bold tracking-widest text-white">{title}</h1>
                <div className="w-12 h-0.5 bg-primaryred mt-2" />
            </div>
            {renderContent(activeActionId)}
        </div>
    )
}
