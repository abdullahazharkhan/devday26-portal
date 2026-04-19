'use client'

import { useEffect, useState } from 'react'
import DataTable, { type Column } from '../components/DataTable'
import { apiFetch } from '@/lib/apiClient'

type CompanyStatus = 'ACTIVE' | 'PENDING' | 'ON_HOLD' | string

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
        contactPhone: '0301-1112233',
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
        contactPhone: '0321-1118899',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: 'cmp-03',
        userId: 'usr-12',
        name: 'Silicon Forge',
        categoryId: null,
        description: null,
        website: null,
        contactEmail: 'muneeba@siliconforge.pk',
        contactPhone: '0331-8899001',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
]

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    })
}

export default function ViewAllCompaniesTab() {
    const [rows, setRows] = useState<Company[]>(COMPANIES)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const load = async () => {
            setIsLoading(true)
            setError(null)
            try {
                const res = await apiFetch('/api/companies')
                const json = await res.json()

                if (!res.ok || !json.success) {
                    setError(json.message ?? 'Failed to load companies.')
                    return
                }

                const data = Array.isArray(json.data) ? json.data : []
                setRows(data)
            } catch {
                setError('Could not reach the server.')
            } finally {
                setIsLoading(false)
            }
        }

        load()
    }, [])

    const columns: Column<Company>[] = [
        { key: 'name', header: 'COMPANY', minWidth: '12rem' },
        { key: 'userId', header: 'USER_ID', minWidth: '11rem' },
        {
            key: 'categoryId',
            header: 'CATEGORY_ID',
            minWidth: '11rem',
            render: (row) => row.categoryId || '—',
        },
        {
            key: 'contactEmail',
            header: 'CONTACT_EMAIL',
            minWidth: '14rem',
            render: (row) => row.contactEmail || '—',
        },
        {
            key: 'contactPhone',
            header: 'CONTACT_PHONE',
            minWidth: '10rem',
            render: (row) => row.contactPhone || '—',
        },
        {
            key: 'updatedAt',
            header: 'UPDATED_AT',
            minWidth: '9rem',
            render: (row) => fmtDate(row.updatedAt),
        },
    ]

    return (
        <div className="flex flex-col gap-5">
            <div className="border border-primaryred-muted bg-[#271C1C] px-4 py-3 sm:px-5 sm:py-4">
                <p className="text-[11px] tracking-[0.14rem] text-[#C4C4C4] uppercase">
                    Company partnership ledger with current booth allocation status.
                </p>
            </div>

            <DataTable
                columns={columns}
                rows={rows}
                keyExtractor={(row) => row.id}
                emptyMessage="// NO_COMPANIES_FOUND"
                loading={isLoading}
            />

            {error && (
                <p className="text-xs tracking-wider border border-red-500/40 bg-red-500/10 text-red-400 px-4 py-3">
                    {error}
                </p>
            )}
        </div>
    )
}
