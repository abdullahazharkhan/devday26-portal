const KNOWN_ACTION_IDS = [
    'view-registration-details',
    'edit-competition',
    'view-stall-details',
    'add-new-stall',
    'edit-stall',
    'delete-stall',
    'view-all-companies',
    'add-new-company',
    'assign-booth',
    'edit-company',
    'delete-company',
    'create-new-registration',
    'update-attendance',
    'view-all-portal-users',
    'assign-actions-to-users',
    'create-accounts',
    'update-participant-record',
    'view-ambassador-dashboard',
    'manage-ambassadors',
] as const

const KNOWN_ACTION_SET = new Set<string>(KNOWN_ACTION_IDS)

const LEGACY_ALIASES: Record<string, string> = {
    'view-registration-detail': 'view-registration-details',
    'view-all-portal-user': 'view-all-portal-users',
}

function toLooseKebab(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[_\s]+/g, '-')
        .replace(/-+/g, '-')
}

export function normalizeActionId(value: string): string {
    if (!value) return ''
    const normalized = toLooseKebab(value)
    return LEGACY_ALIASES[normalized] ?? normalized
}

export function normalizeActionIds(values: unknown): string[] {
    if (!Array.isArray(values)) return []

    const seen = new Set<string>()
    const normalized: string[] = []

    for (const value of values) {
        if (typeof value !== 'string') continue
        const actionId = normalizeActionId(value)
        if (!actionId || !KNOWN_ACTION_SET.has(actionId) || seen.has(actionId)) continue
        seen.add(actionId)
        normalized.push(actionId)
    }

    return normalized
}
