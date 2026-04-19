'use client'

import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '@/lib/apiClient'

type Company = {
    id: string
    userId: string
    name: string
    categoryId: string | null
    description: string | null
    website: string | null
    contactEmail: string | null
    contactPhone: string | null
    createdAt: string
    updatedAt: string
}

const COMPANIES: Company[] = [
    {
        id: 'cmp-01',
        userId: 'usr-10',
        name: 'TechNova Labs',
        categoryId: 'cat-software',
        description: 'Campus hiring partner',
        website: 'https://technova.io',
        contactEmail: 'aimen@technova.io',
        contactPhone: '0301-2289912',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: 'cmp-02',
        userId: 'usr-11',
        name: 'Codestream AI',
        categoryId: 'cat-ai',
        description: 'AI startup',
        website: 'https://codestream.ai',
        contactEmail: 'umair@codestream.ai',
        contactPhone: '0321-0087341',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
]

const fieldCls =
    'bg-[#191111] border border-primaryred-muted focus:border-primaryred focus:ring-primaryred p-3 text-white text-xs tracking-wider transition-all duration-200 focus:outline-none focus:ring-2 w-full'

export default function EditCompanyTab() {
    const [companies, setCompanies] = useState<Company[]>(COMPANIES)
    const [selectedId, setSelectedId] = useState(COMPANIES[0]?.id ?? '')
    const [isSaving, setIsSaving] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [message, setMessage] = useState('')

    const selected = useMemo(
        () => companies.find((company) => company.id === selectedId) ?? companies[0] ?? null,
        [selectedId, companies]
    )

    const [form, setForm] = useState({
        userId: selected?.userId ?? '',
        name: selected?.name ?? '',
        categoryId: selected?.categoryId ?? '',
        description: selected?.description ?? '',
        website: selected?.website ?? '',
        contactEmail: selected?.contactEmail ?? '',
        contactPhone: selected?.contactPhone ?? '',
    })

    const handleSelect = (id: string) => {
        const match = companies.find((company) => company.id === id)
        if (!match) return

        setSelectedId(id)
        setMessage('')
        setForm({
            userId: match.userId,
            name: match.name,
            categoryId: match.categoryId ?? '',
            description: match.description ?? '',
            website: match.website ?? '',
            contactEmail: match.contactEmail ?? '',
            contactPhone: match.contactPhone ?? '',
        })
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsSaving(true)
        setMessage('')
        try {
            const res = await apiFetch(`/api/companies/${selectedId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: form.userId,
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
                setMessage(json.message ?? 'Failed to update company.')
                return
            }

            setMessage('Company updated successfully.')
            setCompanies((prev) => prev.map((company) => (
                company.id === selectedId
                    ? {
                        ...company,
                        userId: form.userId,
                        name: form.name,
                        categoryId: form.categoryId || null,
                        description: form.description || null,
                        website: form.website || null,
                        contactEmail: form.contactEmail || null,
                        contactPhone: form.contactPhone || null,
                    }
                    : company
            )))
        } catch {
            setMessage('Could not reach the server.')
        } finally {
            setIsSaving(false)
        }
    }

    useEffect(() => {
        const load = async () => {
            setIsLoading(true)
            try {
                const res = await apiFetch('/api/companies')
                const json = await res.json()

                if (res.ok && json.success && Array.isArray(json.data) && json.data.length > 0) {
                    const list = json.data as Company[]
                    const first = list[0]
                    setCompanies(list)
                    setSelectedId(first.id)
                    setForm({
                        userId: first.userId,
                        name: first.name,
                        categoryId: first.categoryId ?? '',
                        description: first.description ?? '',
                        website: first.website ?? '',
                        contactEmail: first.contactEmail ?? '',
                        contactPhone: first.contactPhone ?? '',
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
                <p className="text-[#C4C4C4] text-xs tracking-widest">// LOADING_COMPANIES</p>
            </div>
        )
    }

    if (!selected) {
        return (
            <div className="border border-primaryred-muted bg-[#271C1C] p-6">
                <p className="text-[#C4C4C4] text-xs tracking-widest">// NO_COMPANIES_AVAILABLE_FOR_EDIT</p>
            </div>
        )
    }

    return (
        <div className="border border-primaryred-muted bg-[#271C1C] p-5 sm:p-8 flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-end gap-4">
                <div className="flex-1 flex flex-col gap-1.5">
                    <label className="text-primaryred text-xs tracking-widest">SELECT_COMPANY</label>
                    <select
                        value={selectedId}
                        onChange={(e) => handleSelect(e.target.value)}
                        className={fieldCls}
                    >
                        {companies.map((company) => (
                            <option key={company.id} value={company.id}>
                                {company.name}
                            </option>
                        ))}
                    </select>
                </div>
                <p className="text-[11px] tracking-wider text-[#C4C4C4] uppercase">ID: {selected.id}</p>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                <div className="flex flex-col gap-1.5">
                    <label className="text-primaryred text-xs tracking-widest">User_ID</label>
                    <input value={form.userId} onChange={(e) => setForm((p) => ({ ...p, userId: e.target.value }))} className={fieldCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                    <label className="text-primaryred text-xs tracking-widest">Company_Name</label>
                    <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className={fieldCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                    <label className="text-primaryred text-xs tracking-widest">Category_ID</label>
                    <input value={form.categoryId} onChange={(e) => setForm((p) => ({ ...p, categoryId: e.target.value }))} className={fieldCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                    <label className="text-primaryred text-xs tracking-widest">Website</label>
                    <input value={form.website} onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))} className={fieldCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                    <label className="text-primaryred text-xs tracking-widest">Contact_Email</label>
                    <input value={form.contactEmail} onChange={(e) => setForm((p) => ({ ...p, contactEmail: e.target.value }))} className={fieldCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                    <label className="text-primaryred text-xs tracking-widest">Contact_Phone</label>
                    <input value={form.contactPhone} onChange={(e) => setForm((p) => ({ ...p, contactPhone: e.target.value }))} className={fieldCls} />
                </div>

                <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-primaryred text-xs tracking-widest">Description</label>
                    <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className={fieldCls} rows={4} />
                </div>

                <div className="md:col-span-2">
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="bg-primaryred text-white text-xs py-3 px-7 tracking-widest hover:bg-primaryred-muted transition-colors duration-300 disabled:opacity-50"
                    >
                        {isSaving ? 'SAVING...' : 'SAVE_CHANGES'}
                    </button>
                </div>
            </form>

            {message && (
                <p className="text-xs tracking-wider border border-primaryred-muted bg-[#1C1313] text-[#C4C4C4] px-4 py-3">
                    {message}
                </p>
            )}
        </div>
    )
}
