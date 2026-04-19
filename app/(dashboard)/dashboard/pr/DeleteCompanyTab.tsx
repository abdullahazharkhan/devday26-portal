'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/apiClient'

type Company = {
    id: string
    userId: string
    name: string
    categoryId: string | null
    contactEmail: string | null
}

const INITIAL_COMPANIES: Company[] = [
    { id: 'cmp-01', userId: 'usr-10', name: 'TechNova Labs', categoryId: 'cat-software', contactEmail: 'aimen@technova.io' },
    { id: 'cmp-02', userId: 'usr-11', name: 'Codestream AI', categoryId: 'cat-ai', contactEmail: 'umair@codestream.ai' },
    { id: 'cmp-03', userId: 'usr-12', name: 'Silicon Forge', categoryId: null, contactEmail: 'muneeba@siliconforge.pk' },
]

export default function DeleteCompanyTab() {
    const [companies, setCompanies] = useState<Company[]>(INITIAL_COMPANIES)
    const [confirmId, setConfirmId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [message, setMessage] = useState('')

    useEffect(() => {
        const load = async () => {
            setIsLoading(true)
            try {
                const res = await apiFetch('/api/companies')
                const json = await res.json()

                if (res.ok && json.success && Array.isArray(json.data)) {
                    setCompanies(json.data as Company[])
                }
            } finally {
                setIsLoading(false)
            }
        }

        load()
    }, [])

    const handleDelete = async (id: string) => {
        const company = companies.find((item) => item.id === id)
        if (!company) return

        try {
            const res = await apiFetch(`/api/companies/${id}`, { method: 'DELETE' })
            const json = await res.json()

            if (!res.ok || !json.success) {
                setMessage(json.message ?? 'Failed to delete company.')
                return
            }

            setCompanies((prev) => prev.filter((item) => item.id !== id))
            setConfirmId(null)
            setMessage(`Company deleted successfully: ${company.name}.`)
        } catch {
            setMessage('Could not reach the server.')
        }
    }

    return (
        <div className="border border-primaryred-muted bg-[#271C1C] p-5 sm:p-8 flex flex-col gap-5">
            <div className="border border-primaryred-muted bg-[#1A1212] px-4 py-3">
                <p className="text-[11px] tracking-[0.12rem] text-[#C4C4C4] uppercase">
                    Remove companies from the active partner listing after confirmation.
                </p>
            </div>

            {isLoading ? (
                <div className="border border-primaryred-muted bg-[#1A1212] px-4 py-8 text-center text-xs tracking-widest text-[#C4C4C4]">
                    // LOADING_COMPANIES
                </div>
            ) : companies.length === 0 ? (
                <div className="border border-primaryred-muted bg-[#1A1212] px-4 py-8 text-center text-xs tracking-widest text-[#C4C4C4]">
                    // ALL_COMPANIES_REMOVED_FROM_LOCAL_LIST
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {companies.map((company) => {
                        const isConfirming = confirmId === company.id
                        return (
                            <div
                                key={company.id}
                                className="border border-primaryred-muted bg-[#1A1212] px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                            >
                                <div>
                                    <p className="text-white text-sm tracking-wide">{company.name}</p>
                                    <p className="text-[11px] tracking-wider text-[#C4C4C4]">
                                        USER {company.userId} • CATEGORY {company.categoryId ?? '—'}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    {isConfirming ? (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(company.id)}
                                                className="border border-red-500 bg-red-500/20 text-red-300 px-3 py-2 text-[11px] tracking-widest hover:bg-red-500/35 transition-colors"
                                            >
                                                CONFIRM_DELETE
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setConfirmId(null)}
                                                className="border border-primaryred-muted text-[#C4C4C4] px-3 py-2 text-[11px] tracking-widest hover:border-primaryred hover:text-white transition-colors"
                                            >
                                                CANCEL
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setConfirmId(company.id)
                                                setMessage('')
                                            }}
                                            className="border border-primaryred text-primaryred px-3 py-2 text-[11px] tracking-widest hover:bg-primaryred hover:text-white transition-colors"
                                        >
                                            DELETE_COMPANY
                                        </button>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {message && (
                <p className="text-xs tracking-wider border border-primaryred-muted bg-[#1C1313] text-[#C4C4C4] px-4 py-3">
                    {message}
                </p>
            )}
        </div>
    )
}
