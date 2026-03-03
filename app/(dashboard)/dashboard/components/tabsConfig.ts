// ─── Types ────────────────────────────────────────────────────────────────────

export type Tab = {
    action: string   // action ID (kebab-case) — used for permission checking + URL param
    label: string    // display label in the context of this dashboard
}

export type TeamConfig = {
    label: string
    tabs: Tab[]
}

// ─── Master list of every action in the system ───────────────────────────────

export const ALL_ACTIONS: Record<string, { label: string }> = {
    'view-registration-details': { label: 'View Registration Details' },
    'view-all-competitions':     { label: 'View All Competitions' },
    'edit-competition-time':     { label: 'Edit Competition Time' },
    'view-stall-details':        { label: 'View Stall Details' },
    'add-new-stall':             { label: 'Add New Stall' },
    'edit-stall':                { label: 'Edit Stall' },
    'delete-stall':              { label: 'Delete Stall' },
    'view-all-companies':        { label: 'View All Companies' },
    'add-new-company':           { label: 'Add New Company' },
    'assign-booth':              { label: 'Assign Booth' },
    'edit-company':              { label: 'Edit Company' },
    'delete-company':            { label: 'Delete Company' },
    'create-new-registration':   { label: 'Create New Registration' },
    'update-attendance':         { label: 'Update Attendance' },
    'view-all-portal-users':     { label: 'View All Portal Users' },
    'assign-actions-to-users':   { label: 'Assign Actions to Users' },
    'create-accounts':           { label: 'Create Accounts for Users' },
    'update-participant-record': { label: 'Update Participant Record' },
}

// ─── Default actions per StaffRole ───────────────────────────────────────────

export const ROLE_DEFAULT_ACTIONS: Record<string, string[]> = {
    COMPETITIONS: [
        'view-registration-details',
        'view-all-competitions',
        'edit-competition-time',
    ],
    FOOD: [
        'view-stall-details',
        'add-new-stall',
        'edit-stall',
        'delete-stall',
    ],
    GR: [
        'view-all-companies',
        'add-new-company',
        'assign-booth',
        'edit-company',
        'delete-company',
    ],
    PR: [
        'view-registration-details',
        'create-new-registration',
        'update-attendance',
    ],
    EXCOM: [
        'view-all-portal-users',
        'view-registration-details',
        'view-all-competitions',
    ],
    SUPERADMIN: Object.keys(ALL_ACTIONS),
}

// ─── Dashboard tab configuration ─────────────────────────────────────────────
// Each dashboard lists the tabs it shows.  A tab is only visible to a user who
// holds the corresponding `action`.

export const teamConfig: Record<string, TeamConfig> = {
    competitions: {
        label: 'COMPETITIONS',
        tabs: [
            { action: 'view-registration-details', label: 'View Registration Details' },
            { action: 'view-all-competitions',     label: 'View All Competitions' },
            { action: 'edit-competition-time',     label: 'Edit Competition Time' },
        ],
    },
    food: {
        label: 'FOOD',
        tabs: [
            { action: 'view-stall-details', label: 'View Stall Details' },
            { action: 'add-new-stall',      label: 'Add New Stall' },
            { action: 'edit-stall',         label: 'Edit Stall' },
            { action: 'delete-stall',       label: 'Delete Stall' },
        ],
    },
    gr: {
        label: 'GR',
        tabs: [
            { action: 'view-all-companies', label: 'View All Companies' },
            { action: 'add-new-company',    label: 'Add New Company' },
            { action: 'assign-booth',       label: 'Assign Booth' },
            { action: 'edit-company',       label: 'Edit Company' },
            { action: 'delete-company',     label: 'Delete Company' },
        ],
    },
    pr: {
        label: 'PR',
        tabs: [
            { action: 'view-registration-details', label: 'View All Registrations' },
            { action: 'create-new-registration',   label: 'Create New Registration' },
            { action: 'update-attendance',          label: 'Update Attendance' },
        ],
    },
    'super-admin': {
        label: 'SUPER_ADMIN',
        tabs: [
            { action: 'view-all-portal-users',     label: 'View All Portal Users' },
            { action: 'assign-actions-to-users',   label: 'Assign Actions to Users' },
            { action: 'create-accounts',           label: 'Create Accounts for Users' },
            { action: 'update-participant-record', label: 'Update Participant Record' },
        ],
    },
    excom: {
        label: 'EXCOM',
        tabs: [
            { action: 'view-all-portal-users',     label: 'View All Portal Users' },
            { action: 'view-registration-details', label: 'View All Registrations' },
            { action: 'view-all-competitions',     label: 'View All Competitions' },
        ],
    },
}

export default teamConfig
