'use client'

import { useEffect, useState } from 'react'
import DataTable, { type Column } from '../components/DataTable'
import { apiFetch } from '@/lib/apiClient'

type StallStatus = 'OPEN' | 'PREPARING' | 'CLOSED' | string

type Stall = {
    id: string
    userId: string
    stallName: string
    menuDetails: string | null
    paymentStatus: StallStatus
    stallLocation: string | null
    createdAt: string
    updatedAt: string
}

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
    {
        id: 'st-03',
        userId: 'usr-03',
        stallName: 'Stacked Sips',
        menuDetails: 'Beverages',
        paymentStatus: 'ONHOLD',
        stallLocation: 'Innovation Street',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
]

function StatusBadge({ status }: { status: string }) {
    const cls =
        status === 'VERIFIED'
            ? 'text-green-400 border-green-700 bg-green-900/20'
            : status === 'PENDING_PAYMENT'
                ? 'text-yellow-300 border-yellow-700 bg-yellow-900/20'
                : 'text-[#C4C4C4] border-primaryred-muted bg-[#1F1515]'

    return <span className={`text-[10px] tracking-widest border px-2 py-1 ${cls}`}>{status}</span>
}

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    })
}

export default function ViewStallDetailsTab() {
    const [rows, setRows] = useState<Stall[]>(STALLS)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const load = async () => {
            setIsLoading(true)
            setError(null)
            try {
                const res = await apiFetch('/api/stalls')
                const json = await res.json()

                if (!res.ok || !json.success) {
                    setError(json.message ?? 'Failed to load stalls.')
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

    const columns: Column<Stall>[] = [
        { key: 'stallName', header: 'STALL_NAME', minWidth: '12rem' },
        { key: 'userId', header: 'USER_ID', minWidth: '11rem' },
        { key: 'stallLocation', header: 'STALL_LOCATION', minWidth: '13rem' },
        {
            key: 'menuDetails',
            header: 'MENU_DETAILS',
            minWidth: '16rem',
            render: (row) => row.menuDetails || '—',
        },
        {
            key: 'paymentStatus',
            header: 'PAYMENT_STATUS',
            minWidth: '10rem',
            render: (row) => <StatusBadge status={row.paymentStatus} />,
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
                    Live operational snapshot of all food stalls for DevDay venue teams.
                </p>
            </div>

            <DataTable
                columns={columns}
                rows={rows}
                keyExtractor={(row) => row.id}
                emptyMessage="// NO_STALLS_FOUND"
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
