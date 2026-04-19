'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/apiClient'
import { useAuthStore } from '@/lib/stores/authStore'

type StallForm = {
    userId: string
    stallName: string
    menuDetails: string
    stallLocation: string
    paymentStatus: string
}

type AlertTone = 'success' | 'error' | ''

const EMPTY_FORM: StallForm = {
    userId: '',
    stallName: '',
    menuDetails: '',
    stallLocation: '',
    paymentStatus: 'PENDING_PAYMENT',
}

const fieldCls =
    'bg-[#191111] border border-primaryred-muted focus:border-primaryred focus:ring-primaryred p-3 text-white text-xs tracking-wider transition-all duration-200 focus:outline-none focus:ring-2 w-full'

export default function AddNewStallTab() {
    const userId = useAuthStore((state) => state.user?.id ?? '')
    const [form, setForm] = useState<StallForm>({ ...EMPTY_FORM, userId })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [message, setMessage] = useState<string>('')
    const [messageTone, setMessageTone] = useState<AlertTone>('')

    useEffect(() => {
        if (userId && form.userId !== userId) {
            setForm((prev) => ({ ...prev, userId }))
        }
    }, [userId, form.userId])

    const onChange = (key: keyof StallForm, value: string) => {
        if (key === 'userId') return
        setMessage('')
        setMessageTone('')
        setForm((prev) => ({ ...prev, [key]: value }))
    }

    const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsSubmitting(true)
        setMessage('')

        if (userId.trim().length === 0) {
            setMessageTone('error')
            setMessage('Unable to identify current user. Please log in again.')
            setIsSubmitting(false)
            return
        }

        if (form.stallName.trim().length === 0) {
            setMessageTone('error')
            setMessage('Stall name is required.')
            setIsSubmitting(false)
            return
        }

        try {
            const res = await apiFetch('/api/stalls', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    stallName: form.stallName,
                    menuDetails: form.menuDetails || null,
                    stallLocation: form.stallLocation || null,
                    paymentStatus: form.paymentStatus,
                }),
            })

            const json = await res.json()
            if (!res.ok || !json.success) {
                setMessageTone('error')
                setMessage(json.message ?? 'Failed to add stall.')
                return
            }

            setMessageTone('success')
            setMessage('Stall added successfully.')
            setForm(EMPTY_FORM)
        } catch {
            setMessageTone('error')
            setMessage('Could not reach the server.')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="border border-primaryred-muted bg-[#271C1C] p-5 sm:p-8">
            <h2 className="text-[11px] sm:text-xs tracking-[0.16rem] text-[#C4C4C4] uppercase mb-6">
                // REGISTER NEW FOOD STALL
            </h2>

            <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                <div className="flex flex-col gap-1.5">
                    <label className="text-primaryred text-xs tracking-widest">01 User_ID</label>
                    <input
                        value={form.userId}
                        readOnly
                        placeholder={userId ? undefined : 'Loading user...'}
                        className={`${fieldCls} bg-[#141010] cursor-not-allowed`}
                    />
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-primaryred text-xs tracking-widest">02 Stall_Name</label>
                    <input value={form.stallName} onChange={(e) => onChange('stallName', e.target.value)} className={fieldCls} />
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-primaryred text-xs tracking-widest">03 Stall_Location</label>
                    <input value={form.stallLocation} onChange={(e) => onChange('stallLocation', e.target.value)} className={fieldCls} />
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-primaryred text-xs tracking-widest">04 Payment_Status</label>
                    <select
                        value={form.paymentStatus}
                        onChange={(e) => onChange('paymentStatus', e.target.value)}
                        className={fieldCls}
                    >
                        <option value="PENDING_PAYMENT">PENDING_PAYMENT</option>
                        <option value="VERIFIED">VERIFIED</option>
                        <option value="ONHOLD">ONHOLD</option>
                        <option value="REJECTED">REJECTED</option>
                    </select>
                </div>

                <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-primaryred text-xs tracking-widest">05 Menu_Details</label>
                    <textarea
                        value={form.menuDetails}
                        onChange={(e) => onChange('menuDetails', e.target.value)}
                        className={fieldCls}
                        rows={4}
                    />
                </div>

                <div className="md:col-span-2 flex items-center gap-4 pt-2">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="bg-primaryred text-white text-xs py-3 px-7 tracking-widest hover:bg-primaryred-muted transition-colors duration-300 disabled:opacity-50"
                    >
                        {isSubmitting ? 'ADDING_STALL...' : 'ADD_STALL'}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setForm(EMPTY_FORM)
                            setMessage('')
                            setMessageTone('')
                        }}
                        className="text-primaryred border border-primaryred px-5 py-3 text-xs tracking-widest hover:bg-primaryred hover:text-white transition-colors"
                    >
                        RESET
                    </button>
                </div>
            </form>

            {message && (
                <p
                    className={`mt-5 text-xs tracking-wider border px-4 py-3 ${
                        messageTone === 'success'
                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                            : 'border-red-500 bg-red-500/10 text-red-300'
                    }`}
                >
                    {message}
                </p>
            )}
        </div>
    )
}
