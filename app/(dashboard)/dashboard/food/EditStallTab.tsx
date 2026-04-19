'use client'

import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '@/lib/apiClient'

type Stall = {
    id: string
    userId: string
    stallName: string
    menuDetails: string | null
    paymentStatus: string
    stallLocation: string | null
    createdAt: string
    updatedAt: string
}

type AlertTone = 'success' | 'error' | ''

const STALLS: Stall[] = [
    {
        id: 'st-01',
        userId: 'usr-01',
        stallName: 'Byte Bites',
        menuDetails: 'Burgers, wraps, fries',
        paymentStatus: 'PENDING_PAYMENT',
        stallLocation: 'Block A Courtyard',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: 'st-02',
        userId: 'usr-02',
        stallName: 'Kernel Kebab',
        menuDetails: 'BBQ platters',
        paymentStatus: 'VERIFIED',
        stallLocation: 'Main Arena Left Wing',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
]

const fieldCls =
    'bg-[#191111] border border-primaryred-muted focus:border-primaryred focus:ring-primaryred p-3 text-white text-xs tracking-wider transition-all duration-200 focus:outline-none focus:ring-2 w-full'

export default function EditStallTab() {
    const [stalls, setStalls] = useState<Stall[]>(STALLS)
    const [selectedId, setSelectedId] = useState(STALLS[0]?.id ?? '')
    const [isSaving, setIsSaving] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [saveMessage, setSaveMessage] = useState('')
    const [saveMessageTone, setSaveMessageTone] = useState<AlertTone>('')

    const selected = useMemo(
        () => stalls.find((stall) => stall.id === selectedId) ?? stalls[0] ?? null,
        [selectedId, stalls]
    )

    const [form, setForm] = useState({
        userId: selected?.userId ?? '',
        stallName: selected?.stallName ?? '',
        menuDetails: selected?.menuDetails ?? '',
        paymentStatus: selected?.paymentStatus ?? 'PENDING_PAYMENT',
        stallLocation: selected?.stallLocation ?? '',
    })

    const handleSelect = (id: string) => {
        const match = stalls.find((stall) => stall.id === id)
        if (!match) return

        setSelectedId(id)
        setSaveMessage('')
        setSaveMessageTone('')
        setForm({
            userId: match.userId,
            stallName: match.stallName,
            menuDetails: match.menuDetails ?? '',
            paymentStatus: match.paymentStatus,
            stallLocation: match.stallLocation ?? '',
        })
    }

    const handleDelete = async () => {
        if (!selectedId) return
        if (!confirm('Delete this stall permanently?')) return

        setIsDeleting(true)
        setSaveMessage('')
        setSaveMessageTone('')

        try {
            const res = await apiFetch(`/api/stalls/${selectedId}`, {
                method: 'DELETE',
            })
            const json = await res.json()

            if (!res.ok || !json.success) {
                setSaveMessageTone('error')
                setSaveMessage(json.message ?? 'Failed to delete stall.')
                return
            }

            const updated = stalls.filter((stall) => stall.id !== selectedId)
            setStalls(updated)

            if (updated.length > 0) {
                const first = updated[0]
                setSelectedId(first.id)
                setForm({
                    userId: first.userId,
                    stallName: first.stallName,
                    menuDetails: first.menuDetails ?? '',
                    paymentStatus: first.paymentStatus,
                    stallLocation: first.stallLocation ?? '',
                })
                setSaveMessageTone('success')
                setSaveMessage('Stall deleted successfully.')
            } else {
                setSelectedId('')
                setForm({
                    userId: '',
                    stallName: '',
                    menuDetails: '',
                    paymentStatus: 'PENDING_PAYMENT',
                    stallLocation: '',
                })
                setSaveMessageTone('success')
                setSaveMessage('Stall deleted successfully. No stalls remaining.')
            }
        } catch {
            setSaveMessageTone('error')
            setSaveMessage('Could not reach the server.')
        } finally {
            setIsDeleting(false)
        }
    }

    const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsSaving(true)
        setSaveMessage('')
        try {
            const res = await apiFetch(`/api/stalls/${selectedId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: form.userId,
                    stallName: form.stallName,
                    menuDetails: form.menuDetails || null,
                    paymentStatus: form.paymentStatus,
                    stallLocation: form.stallLocation || null,
                }),
            })

            const json = await res.json()
            if (!res.ok || !json.success) {
                setSaveMessageTone('error')
                setSaveMessage(json.message ?? 'Failed to update stall.')
                return
            }

            setSaveMessageTone('success')
            setSaveMessage('Stall updated successfully.')
            setStalls((prev) => prev.map((stall) => (
                stall.id === selectedId
                    ? {
                        ...stall,
                        userId: form.userId,
                        stallName: form.stallName,
                        menuDetails: form.menuDetails || null,
                        paymentStatus: form.paymentStatus,
                        stallLocation: form.stallLocation || null,
                    }
                    : stall
            )))
        } catch {
            setSaveMessageTone('error')
            setSaveMessage('Could not reach the server.')
        } finally {
            setIsSaving(false)
        }
    }

    useEffect(() => {
        const load = async () => {
            setIsLoading(true)
            try {
                const res = await apiFetch('/api/stalls')
                const json = await res.json()

                if (res.ok && json.success && Array.isArray(json.data) && json.data.length > 0) {
                    const list = json.data as Stall[]
                    setStalls(list)
                    const first = list[0]
                    setSelectedId(first.id)
                    setForm({
                        userId: first.userId,
                        stallName: first.stallName,
                        menuDetails: first.menuDetails ?? '',
                        paymentStatus: first.paymentStatus,
                        stallLocation: first.stallLocation ?? '',
                    })
                }
            } finally {
                setIsLoading(false)
            }
        }

        load()
    }, [])

    if (isLoading) {
        return (
            <div className="border border-primaryred-muted bg-[#271C1C] p-6">
                <p className="text-[#C4C4C4] text-xs tracking-widest">// LOADING_STALLS</p>
            </div>
        )
    }

    if (!selected) {
        return (
            <div className="border border-primaryred-muted bg-[#271C1C] p-6">
                <p className="text-[#C4C4C4] text-xs tracking-widest">// NO_STALLS_AVAILABLE_FOR_EDIT</p>
            </div>
        )
    }

    return (
        <div className="border border-primaryred-muted bg-[#271C1C] p-5 sm:p-8 flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-end gap-4">
                <div className="flex-1 flex flex-col gap-1.5">
                    <label className="text-primaryred text-xs tracking-widest">SELECT_STALL</label>
                    <select
                        value={selectedId}
                        onChange={(e) => handleSelect(e.target.value)}
                        className={fieldCls}
                    >
                        {stalls.map((stall) => (
                            <option key={stall.id} value={stall.id}>
                                {stall.stallName}
                            </option>
                        ))}
                    </select>
                </div>
                <p className="text-[11px] tracking-wider text-[#C4C4C4] uppercase">ID: {selected.id}</p>
            </div>

            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                <div className="flex flex-col gap-1.5">
                    <label className="text-primaryred text-xs tracking-widest">User_ID</label>
                    <input value={form.userId} onChange={(e) => setForm((p) => ({ ...p, userId: e.target.value }))} className={fieldCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                    <label className="text-primaryred text-xs tracking-widest">Stall_Name</label>
                    <input value={form.stallName} onChange={(e) => setForm((p) => ({ ...p, stallName: e.target.value }))} className={fieldCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                    <label className="text-primaryred text-xs tracking-widest">Stall_Location</label>
                    <input value={form.stallLocation} onChange={(e) => setForm((p) => ({ ...p, stallLocation: e.target.value }))} className={fieldCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                    <label className="text-primaryred text-xs tracking-widest">Payment_Status</label>
                    <select
                        value={form.paymentStatus}
                        onChange={(e) => setForm((p) => ({ ...p, paymentStatus: e.target.value }))}
                        className={fieldCls}
                    >
                        <option value="PENDING_PAYMENT">PENDING_PAYMENT</option>
                        <option value="VERIFIED">VERIFIED</option>
                        <option value="ONHOLD">ONHOLD</option>
                        <option value="REJECTED">REJECTED</option>
                    </select>
                </div>

                <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-primaryred text-xs tracking-widest">Menu_Details</label>
                    <textarea
                        value={form.menuDetails}
                        onChange={(e) => setForm((p) => ({ ...p, menuDetails: e.target.value }))}
                        className={fieldCls}
                        rows={4}
                    />
                </div>

                <div className="md:col-span-2 flex flex-wrap items-center gap-3">
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="bg-primaryred text-white text-xs py-3 px-7 tracking-widest hover:bg-primaryred-muted transition-colors duration-300 disabled:opacity-50"
                    >
                        {isSaving ? 'SAVING...' : 'SAVE_CHANGES'}
                    </button>
                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="border border-red-500 text-red-500 text-xs py-3 px-7 tracking-widest hover:bg-red-500/10 transition-colors duration-300 disabled:opacity-50"
                    >
                        {isDeleting ? 'DELETING...' : 'DELETE_STALL'}
                    </button>
                </div>
            </form>

            {saveMessage && (
                <p
                    className={`text-xs tracking-wider border px-4 py-3 ${
                        saveMessageTone === 'success'
                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                            : 'border-red-500 bg-red-500/10 text-red-300'
                    }`}
                >
                    {saveMessage}
                </p>
            )}
        </div>
    )
}
