'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import DashboardStats from './DashboardStats'

export default function DashboardStatsGate() {
    const searchParams = useSearchParams()
    const tab = searchParams.get('tab')

    if (tab !== 'view-registration-details') {
        return null
    }

    return (
        <Suspense fallback={<div />}>
            <DashboardStats />
        </Suspense>
    )
}
