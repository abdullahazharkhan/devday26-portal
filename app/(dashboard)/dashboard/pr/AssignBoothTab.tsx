'use client'

import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '@/lib/apiClient'

type Company = {
    id: string
    userId: string
    name: string
}

const COMPANIES: Company[] = [
    { id: 'cmp-01', userId: 'usr-10', name: 'TechNova Labs' },
    { id: 'cmp-02', userId: 'usr-11', name: 'Codestream AI' },
    { id: 'cmp-03', userId: 'usr-12', name: 'Silicon Forge' },
]

const BOOTH_OPTIONS = ['A-01', 'A-02', 'A-03', 'A-04', 'B-01', 'B-02', 'B-03', 'B-04'] as const

const fieldCls =
    'bg-[#191111] border border-primaryred-muted focus:border-primaryred focus:ring-primaryred p-3 text-white text-xs tracking-wider transition-all duration-200 focus:outline-none focus:ring-2 w-full'

export default function AssignBoothTab() {
    const [companies, setCompanies] = useState<Company[]>(COMPANIES)
    const [companyId, setCompanyId] = useState(COMPANIES[0]?.id ?? '')
    const [boothCode, setBoothCode] = useState('A-01')
    const [isSaving, setIsSaving] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [message, setMessage] = useState('')

    const selectedCompany = useMemo(
        () => companies.find((company) => company.id === companyId) ?? null,
        [companyId, companies]
    )

    useEffect(() => {
        const load = async () => {
            setIsLoading(true)
            try {
                const res = await apiFetch('/api/companies')
                const json = await res.json()

                if (res.ok && json.success && Array.isArray(json.data) && json.data.length > 0) {
                    const list = json.data as Company[]
                    setCompanies(list)
                    setCompanyId(list[0].id)
                }
            } finally {
                setIsLoading(false)
            }
        }

        load()
    }, [])

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!selectedCompany) return

        setIsSaving(true)
        setMessage('')
        try {
            const res = await apiFetch(`/api/companies/${companyId}/assign-booth`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ boothCode }),
            })
            const json = await res.json()

            if (!res.ok || !json.success) {
                setMessage(json.message ?? 'Failed to assign booth.')
                return
            }

            setCompanies((prev) => prev.map((company) => (
                company.id === companyId ? { ...company, boothCode } : company
            )))
            setMessage(`Booth assigned successfully: ${selectedCompany.name} -> ${boothCode}.`)
        } catch {
            setMessage('Could not reach the server.')
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="border border-primaryred-muted bg-[#271C1C] p-5 sm:p-8 flex flex-col gap-6">
            <div className="border border-primaryred-muted bg-[#1A1212] px-4 py-3">
                <p className="text-[11px] tracking-[0.12rem] text-[#C4C4C4] uppercase">
                    Assign or re-assign exhibition booth codes for company partners.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                <div className="flex flex-col gap-1.5">
                    <label className="text-primaryred text-xs tracking-widest">SELECT_COMPANY</label>
                    <select className={fieldCls} value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
                        {companies.map((company) => (
                            <option key={company.id} value={company.id}>
                                {company.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-primaryred text-xs tracking-widest">SELECT_BOOTH</label>
                    <select className={fieldCls} value={boothCode} onChange={(e) => setBoothCode(e.target.value)}>
                        {BOOTH_OPTIONS.map((booth) => (
                            <option key={booth} value={booth}>
                                {booth}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="md:col-span-2 border border-primaryred-muted bg-[#1A1212] px-4 py-3 text-xs tracking-wider text-[#C4C4C4]">
                    SELECTED_COMPANY: {selectedCompany?.name ?? '—'} ({selectedCompany?.userId ?? '—'})
                </div>

                <div className="md:col-span-2">
                    <button
                        type="submit"
                        disabled={isSaving || isLoading}
                        className="bg-primaryred text-white text-xs py-3 px-7 tracking-widest hover:bg-primaryred-muted transition-colors duration-300 disabled:opacity-50"
                    >
                        {isSaving ? 'ASSIGNING...' : 'ASSIGN_BOOTH'}
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
