'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/apiClient'
import { useAuthStore } from '@/lib/stores/authStore'

type CompanyForm = {
    userId: string
    name: string
    categoryId: string
    description: string
    website: string
    contactEmail: string
    contactPhone: string
}

type CategoryOption = {
    id: string
    label: string
}

type AlertTone = 'success' | 'error' | ''

const EMPTY_FORM: CompanyForm = {
    userId: '',
    name: '',
    categoryId: '',
    description: '',
    website: '',
    contactEmail: '',
    contactPhone: '',
}

const fieldCls =
    'bg-[#191111] border border-primaryred-muted focus:border-primaryred focus:ring-primaryred p-3 text-white text-xs tracking-wider transition-all duration-200 focus:outline-none focus:ring-2 w-full'

export default function AddNewCompanyTab() {
    const userId = useAuthStore((state) => state.user?.id ?? '')
    const [form, setForm] = useState<CompanyForm>({ ...EMPTY_FORM, userId })
    const [categories, setCategories] = useState<CategoryOption[]>([])
    const [isCategoriesLoading, setIsCategoriesLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [message, setMessage] = useState('')
    const [messageTone, setMessageTone] = useState<AlertTone>('')

    useEffect(() => {
        if (userId && form.userId !== userId) {
            setForm((prev) => ({ ...prev, userId }))
        }
    }, [userId, form.userId])

    useEffect(() => {
        const loadCategories = async () => {
            setIsCategoriesLoading(true)
            try {
                const res = await apiFetch('/api/companies/categories')
                const json = await res.json()
                if (res.ok && json.success && Array.isArray(json.data)) {
                    setCategories(json.data)
                }
            } catch {
                // keep empty list if fetch fails
            } finally {
                setIsCategoriesLoading(false)
            }
        }

        loadCategories()
    }, [])

    const onChange = (key: keyof CompanyForm, value: string) => {
        if (key === 'userId') return
        setMessage('')
        setMessageTone('')
        setForm((prev) => ({ ...prev, [key]: value }))
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsSubmitting(true)
        setMessage('')

        if (userId.trim().length === 0) {
            setMessageTone('error')
            setMessage('Unable to identify current user. Please log in again.')
            setIsSubmitting(false)
            return
        }

        if (form.name.trim().length === 0) {
            setMessageTone('error')
            setMessage('Company name is required.')
            setIsSubmitting(false)
            return
        }

        try {
            const res = await apiFetch('/api/companies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    name: form.name,
                    categoryId: form.categoryId || null,
                    description: form.description || null,
                    website: form.website || null,
                    contactEmail: form.contactEmail || null,
                    contactPhone: form.contactPhone || null,
                }),
            })

            const json = await res.json()
            if (!res.ok || !json.success) {
                setMessageTone('error')
                setMessage(json.message ?? 'Failed to add company.')
                return
            }

            setMessageTone('success')
            setMessage('Company added successfully.')
            setForm({ ...EMPTY_FORM, userId })
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
                // ADD NEW COMPANY PROFILE
            </h2>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
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
                    <label className="text-primaryred text-xs tracking-widest">02 Company_Name</label>
                    <input value={form.name} onChange={(e) => onChange('name', e.target.value)} className={fieldCls} />
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-primaryred text-xs tracking-widest">03 Category_ID</label>
                    <select value={form.categoryId} onChange={(e) => onChange('categoryId', e.target.value)} className={fieldCls} disabled={isCategoriesLoading}>
                        {isCategoriesLoading ? (
                            <option value="" disabled>
                                LOADING_CATEGORIES...
                            </option>
                        ) : (
                            <>
                                <option value="">NONE</option>
                                {categories.map((category) => (
                                    <option key={category.id} value={category.id}>
                                        {category.label}
                                    </option>
                                ))}
                            </>
                        )}
                    </select>
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-primaryred text-xs tracking-widest">04 Website</label>
                    <input value={form.website} onChange={(e) => onChange('website', e.target.value)} className={fieldCls} />
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-primaryred text-xs tracking-widest">05 Contact_Email</label>
                    <input type="email" value={form.contactEmail} onChange={(e) => onChange('contactEmail', e.target.value)} className={fieldCls} />
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-primaryred text-xs tracking-widest">06 Contact_Phone</label>
                    <input value={form.contactPhone} onChange={(e) => onChange('contactPhone', e.target.value)} className={fieldCls} />
                </div>

                <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-primaryred text-xs tracking-widest">07 Description</label>
                    <textarea value={form.description} onChange={(e) => onChange('description', e.target.value)} className={fieldCls} rows={4} />
                </div>

                <div className="md:col-span-2 flex items-center gap-4 pt-2">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="bg-primaryred text-white text-xs py-3 px-7 tracking-widest hover:bg-primaryred-muted transition-colors duration-300 disabled:opacity-50"
                    >
                        {isSubmitting ? 'ADDING_COMPANY...' : 'ADD_COMPANY'}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setForm({ ...EMPTY_FORM, userId })
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
