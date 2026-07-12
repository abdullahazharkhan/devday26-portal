'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '@/lib/apiClient'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Ambassador {
    id:             string
    fullName:       string
    cnic:           string
    institute:      string
    referralCode:   string
    totalReferrals: number
    email:          string
    isActive:       boolean
    registeredAt:   string
}

interface FormState {
    fullName:       string
    email:          string
    cnic:           string
    institute:      string
    isActive:       boolean
    regenerateCode: boolean
}

const EMPTY_FORM: FormState = {
    fullName:       '',
    email:          '',
    cnic:           '',
    institute:      '',
    isActive:       true,
    regenerateCode: false,
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SkeletonRow() {
    return (
        <tr className="border-b border-primaryred-muted">
            {Array.from({ length: 8 }).map((_, i) => (
                <td key={i} className="px-4 py-3">
                    <div className="h-3 bg-[#271C1C] rounded animate-pulse" />
                </td>
            ))}
        </tr>
    )
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({
    mode,
    form,
    onChange,
    onSubmit,
    onClose,
    saving,
    serverError,
}: {
    mode:        'create' | 'edit'
    form:        FormState
    onChange:    (f: Partial<FormState>) => void
    onSubmit:    () => void
    onClose:     () => void
    saving:      boolean
    serverError: string | null
}) {
    const inputCls =
        'w-full bg-[#191111] border border-primaryred-muted text-white text-sm px-3 py-2 focus:outline-none focus:border-primaryred transition-colors duration-200 placeholder-[#555]'
    const labelCls = 'block text-[10px] tracking-[0.15em] text-primaryred mb-1'

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
            <div className="w-full max-w-xl bg-[#191111] border border-primaryred-muted flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-primaryred-muted bg-[#271C1C] flex-shrink-0">
                    <h2 className="text-sm font-bold tracking-[0.2em] text-white">
                        {mode === 'create' ? '+ NEW AMBASSADOR' : '✎ EDIT AMBASSADOR'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-[#C4C4C4] hover:text-primaryred transition-colors duration-150 text-lg leading-none"
                    >
                        ✕
                    </button>
                </div>

                {/* Body */}
                <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-4">
                    {serverError && (
                        <div className="border border-red-800 bg-red-900/20 px-4 py-3 text-red-400 text-xs tracking-widest">
                            {serverError}
                        </div>
                    )}

                    {/* Full Name */}
                    <div>
                        <label className={labelCls}>FULL NAME *</label>
                        <input
                            type="text"
                            className={inputCls}
                            placeholder="e.g. Hamza Qureshi"
                            value={form.fullName}
                            onChange={(e) => onChange({ fullName: e.target.value })}
                        />
                    </div>

                    {/* Email */}
                    <div>
                        <label className={labelCls}>EMAIL *</label>
                        <input
                            type="email"
                            className={inputCls}
                            placeholder="e.g. hamza@gmail.com"
                            value={form.email}
                            onChange={(e) => onChange({ email: e.target.value })}
                        />
                    </div>

                    {/* CNIC */}
                    <div>
                        <label className={labelCls}>CNIC *</label>
                        <input
                            type="text"
                            className={`${inputCls} font-mono`}
                            placeholder="13 digits e.g. 4210112345670"
                            maxLength={15}
                            value={form.cnic}
                            onChange={(e) => onChange({ cnic: e.target.value.replace(/[^0-9-]/g, '') })}
                        />
                    </div>

                    {/* Institute */}
                    <div>
                        <label className={labelCls}>INSTITUTE *</label>
                        <input
                            type="text"
                            className={inputCls}
                            placeholder="e.g. University of Karachi"
                            value={form.institute}
                            onChange={(e) => onChange({ institute: e.target.value })}
                        />
                    </div>

                    {/* Edit-only controls */}
                    {mode === 'edit' && (
                        <div className="flex flex-col sm:flex-row gap-4">
                            {/* Status toggle */}
                            <div className="flex-1">
                                <label className={labelCls}>STATUS</label>
                                <div className="flex gap-2">
                                    {(['ACTIVE', 'INACTIVE'] as const).map((s) => (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => onChange({ isActive: s === 'ACTIVE' })}
                                            className={`flex-1 py-2 text-[11px] tracking-widest border transition-colors duration-150 ${
                                                (s === 'ACTIVE') === form.isActive
                                                    ? 'bg-primaryred border-primaryred text-white'
                                                    : 'bg-transparent border-primaryred-muted text-[#C4C4C4] hover:border-primaryred'
                                            }`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Regenerate referral code */}
                            <div className="flex-1 flex flex-col justify-end">
                                <label className={labelCls}>REFERRAL CODE</label>
                                <label className="flex items-center gap-2 cursor-pointer select-none border border-primaryred-muted px-3 py-2 hover:border-primaryred transition-colors duration-150">
                                    <input
                                        type="checkbox"
                                        className="accent-primaryred"
                                        checked={form.regenerateCode}
                                        onChange={(e) => onChange({ regenerateCode: e.target.checked })}
                                    />
                                    <span className="text-[11px] tracking-widest text-[#C4C4C4]">
                                        REGENERATE CODE
                                    </span>
                                </label>
                            </div>
                        </div>
                    )}

                    {mode === 'create' && (
                        <p className="text-[10px] tracking-widest text-[#555]">
                            {'// REFERRAL_CODE WILL BE AUTO-GENERATED'}
                        </p>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-primaryred-muted bg-[#271C1C] flex-shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="px-5 py-2 text-xs tracking-widest text-[#C4C4C4] border border-primaryred-muted hover:border-primaryred hover:text-white transition-colors duration-150 disabled:opacity-50"
                    >
                        CANCEL
                    </button>
                    <button
                        type="button"
                        onClick={onSubmit}
                        disabled={saving}
                        className="px-5 py-2 text-xs tracking-widest text-white bg-primaryred border border-primaryred hover:bg-red-700 transition-colors duration-150 disabled:opacity-50"
                    >
                        {saving
                            ? (mode === 'create' ? 'CREATING...' : 'SAVING...')
                            : (mode === 'create' ? 'CREATE' : 'SAVE CHANGES')}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Delete Confirm ───────────────────────────────────────────────────────────

function DeleteConfirm({
    ambassador,
    onConfirm,
    onCancel,
    deleting,
}: {
    ambassador: Ambassador
    onConfirm:  () => void
    onCancel:   () => void
    deleting:   boolean
}) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
        >
            <div className="w-full max-w-md bg-[#191111] border border-red-800">
                <div className="px-6 py-4 border-b border-red-800 bg-red-900/20">
                    <h2 className="text-sm font-bold tracking-[0.2em] text-red-400">⚠ CONFIRM DELETE</h2>
                </div>
                <div className="px-6 py-5">
                    <p className="text-[#C4C4C4] text-sm leading-relaxed">
                        You are about to permanently delete:
                    </p>
                    <div className="mt-3 border border-primaryred-muted bg-[#271C1C] px-4 py-3">
                        <p className="text-white font-medium text-sm">{ambassador.fullName}</p>
                        <p className="text-[#C4C4C4] text-xs mt-0.5">{ambassador.email}</p>
                        <p className="text-primaryred font-mono text-xs mt-0.5 tracking-wider">{ambassador.referralCode}</p>
                    </div>
                    <p className="text-red-400 text-xs tracking-widest mt-4">
                        {'// THIS ACTION CANNOT BE UNDONE'}
                    </p>
                </div>
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-primaryred-muted bg-[#271C1C]">
                    <button
                        onClick={onCancel}
                        disabled={deleting}
                        className="px-5 py-2 text-xs tracking-widest text-[#C4C4C4] border border-primaryred-muted hover:border-primaryred hover:text-white transition-colors duration-150 disabled:opacity-50"
                    >
                        CANCEL
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={deleting}
                        className="px-5 py-2 text-xs tracking-widest text-white bg-red-800 border border-red-700 hover:bg-red-700 transition-colors duration-150 disabled:opacity-50"
                    >
                        {deleting ? 'DELETING...' : 'DELETE'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ManageAmbassadors() {
    const [ambassadors, setAmbassadors] = useState<Ambassador[]>([])
    const [isLoading,   setIsLoading]   = useState(true)
    const [error,       setError]       = useState<string | null>(null)

    // Modal state
    const [modal,       setModal]       = useState<{ mode: 'create' | 'edit'; data?: Ambassador } | null>(null)
    const [form,        setForm]        = useState<FormState>(EMPTY_FORM)
    const [saving,      setSaving]      = useState(false)
    const [modalError,  setModalError]  = useState<string | null>(null)

    // Delete state
    const [deleteTarget, setDeleteTarget] = useState<Ambassador | null>(null)
    const [deleting,     setDeleting]     = useState(false)

    // ── Fetch ─────────────────────────────────────────────────────────────────

    const fetchAmbassadors = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        try {
            const res  = await apiFetch('/api/ambassadors')
            const json = await res.json() as { success: boolean; data?: Ambassador[]; message?: string }
            if (json.success && json.data) setAmbassadors(json.data)
            else setError(json.message ?? 'Failed to load ambassadors.')
        } catch {
            setError('Network error — could not reach server.')
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => { fetchAmbassadors() }, [fetchAmbassadors])

    // ── Form helpers ──────────────────────────────────────────────────────────

    const openCreate = () => {
        setForm(EMPTY_FORM)
        setModalError(null)
        setModal({ mode: 'create' })
    }

    const openEdit = (a: Ambassador) => {
        setForm({
            fullName:       a.fullName,
            email:          a.email,
            cnic:           a.cnic,
            institute:      a.institute,
            isActive:       a.isActive,
            regenerateCode: false,
        })
        setModalError(null)
        setModal({ mode: 'edit', data: a })
    }

    const closeModal = () => { setModal(null); setModalError(null) }

    const patchForm = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }))

    // ── Submit create/edit ────────────────────────────────────────────────────

    const handleSubmit = async () => {
        const { fullName, email, cnic, institute } = form

        if (!fullName.trim() || !email.trim() || !cnic.trim() || !institute.trim()) {
            setModalError('All fields are required.')
            return
        }

        setSaving(true)
        setModalError(null)

        try {
            let res: Response
            if (modal?.mode === 'create') {
                res = await apiFetch('/api/ambassadors', {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify({ fullName, email, cnic, institute }),
                })
            } else {
                const id = modal!.data!.id
                res = await apiFetch(`/api/ambassadors/${id}`, {
                    method:  'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify({
                        fullName,
                        email,
                        cnic,
                        institute,
                        isActive:       form.isActive,
                        regenerateCode: form.regenerateCode,
                    }),
                })
            }

            const json = await res.json() as { success: boolean; data?: Ambassador; message?: string }

            if (!json.success) {
                setModalError(json.message ?? 'Operation failed.')
                return
            }

            const updatedAmbassador = json.data
            if (updatedAmbassador) {
                setAmbassadors((current) => modal?.mode === 'create'
                    ? [updatedAmbassador, ...current]
                    : current.map((ambassador) => ambassador.id === updatedAmbassador.id ? updatedAmbassador : ambassador)
                )
            } else {
                void fetchAmbassadors()
            }

            closeModal()
        } catch {
            setModalError('Network error — could not reach server.')
        } finally {
            setSaving(false)
        }
    }

    // ── Delete ────────────────────────────────────────────────────────────────

    const handleDelete = async () => {
        if (!deleteTarget) return
        setDeleting(true)
        try {
            const res  = await apiFetch(`/api/ambassadors/${deleteTarget.id}`, { method: 'DELETE' })
            const json = await res.json() as { success: boolean; message?: string }
            if (json.success) {
                setAmbassadors((current) => current.filter((ambassador) => ambassador.id !== deleteTarget.id))
                setDeleteTarget(null)
            }
        } catch {
            // silent — leave dialog open
        } finally {
            setDeleting(false)
        }
    }

    // ── Sorted list (descending referrals) ────────────────────────────────────

    const sorted = [...ambassadors].sort((a, b) => b.totalReferrals - a.totalReferrals)

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <>
            {/* Modals */}
            {modal && (
                <Modal
                    mode={modal.mode}
                    form={form}
                    onChange={patchForm}
                    onSubmit={handleSubmit}
                    onClose={closeModal}
                    saving={saving}
                    serverError={modalError}
                />
            )}
            {deleteTarget && (
                <DeleteConfirm
                    ambassador={deleteTarget}
                    onConfirm={handleDelete}
                    onCancel={() => setDeleteTarget(null)}
                    deleting={deleting}
                />
            )}

            <div className="flex flex-col gap-5">
                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <p className="text-[10px] tracking-[0.2em] text-[#C4C4C4]">
                            {isLoading ? '—' : `${ambassadors.length} AMBASSADOR${ambassadors.length !== 1 ? 'S' : ''} REGISTERED`}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={fetchAmbassadors}
                            disabled={isLoading}
                            title="Refresh"
                            className="border border-primaryred-muted text-primaryred hover:bg-[#271C1C] transition-colors duration-150 px-3 py-2 text-xs disabled:opacity-40"
                        >
                            ↺
                        </button>
                        <button
                            onClick={openCreate}
                            className="border border-primaryred bg-primaryred text-white hover:bg-red-700 transition-colors duration-150 px-5 py-2 text-xs tracking-widest"
                        >
                            + NEW AMBASSADOR
                        </button>
                    </div>
                </div>

                {/* Error banner */}
                {error && (
                    <div className="border border-red-800 bg-red-900/20 px-5 py-4 text-red-400 text-xs tracking-widest">
                        {`// ERROR: ${error}`}
                    </div>
                )}

                {/* Table */}
                <div className="border border-primaryred-muted overflow-x-auto">
                    <table className="w-full text-xs text-left min-w-[720px]">
                        <thead>
                            <tr className="border-b border-primaryred-muted bg-[#271C1C]">
                                {['#', 'FULL NAME', 'EMAIL', 'CNIC', 'INSTITUTE', 'REFERRAL CODE', 'REFERRALS', 'STATUS', 'ACTIONS'].map((h) => (
                                    <th key={h} className="px-4 py-3 text-primaryred tracking-[0.15em] font-bold whitespace-nowrap">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                            ) : sorted.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-16 text-center text-[#C4C4C4] tracking-widest">
                                        {'// NO_AMBASSADORS_FOUND — click "+ NEW AMBASSADOR" to add one'}
                                    </td>
                                </tr>
                            ) : (
                                sorted.map((a, idx) => (
                                    <tr
                                        key={a.id}
                                        className="border-b border-primaryred-muted bg-[#191111] hover:bg-[#271C1C] transition-colors duration-150 group"
                                    >
                                        <td className="px-4 py-3 text-primaryred font-bold tabular-nums">
                                            #{idx + 1}
                                        </td>
                                        <td className="px-4 py-3 text-white font-medium whitespace-nowrap">
                                            {a.fullName}
                                        </td>
                                        <td className="px-4 py-3 text-[#C4C4C4] whitespace-nowrap">{a.email}</td>
                                        <td className="px-4 py-3 text-[#C4C4C4] font-mono whitespace-nowrap">{a.cnic}</td>
                                        <td className="px-4 py-3 text-[#C4C4C4]">{a.institute}</td>
                                        <td className="px-4 py-3 font-mono text-primaryred tracking-wider whitespace-nowrap">
                                            {a.referralCode}
                                        </td>
                                        <td className="px-4 py-3 text-white font-bold text-center tabular-nums">
                                            {a.totalReferrals}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className={`text-[10px] tracking-widest border px-2 py-0.5 ${
                                                a.isActive
                                                    ? 'text-green-400 border-green-600'
                                                    : 'text-[#C4C4C4] border-primaryred-muted'
                                            }`}>
                                                {a.isActive ? 'ACTIVE' : 'INACTIVE'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => openEdit(a)}
                                                    className="text-[10px] tracking-widest border border-primaryred-muted text-[#C4C4C4] hover:border-primaryred hover:text-white transition-colors duration-150 px-2 py-1"
                                                >
                                                    EDIT
                                                </button>
                                                <button
                                                    onClick={() => setDeleteTarget(a)}
                                                    className="text-[10px] tracking-widest border border-red-900 text-red-400 hover:border-red-600 hover:text-red-300 transition-colors duration-150 px-2 py-1"
                                                >
                                                    DELETE
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer count */}
                {!isLoading && sorted.length > 0 && (
                    <p className="text-right text-[10px] tracking-widest text-[#555]">
                        SHOWING {sorted.length} OF {sorted.length} AMBASSADORS
                    </p>
                )}
            </div>
        </>
    )
}
