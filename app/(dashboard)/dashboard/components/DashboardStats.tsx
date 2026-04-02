'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/lib/stores/authStore'

interface DashboardStats {
    totalRegistrations: number
    verifiedPayments: number
    pendingPayments: number
    attendancePercentage: number
}

function StatCard({
    title,
    value,
    subtitle,
    color,
    icon,
}: {
    title: string
    value: string | number
    subtitle?: string
    color: string
    icon: string
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`border border-primaryred-muted bg-[#271C1C] p-5 sm:p-6 flex flex-col gap-3 ${color}`}
        >
            <div className="flex items-center justify-between">
                <span className="text-[10px] tracking-[0.2em] text-primaryred/70 uppercase font-bold">
                    {title}
                </span>
                <span className="text-2xl opacity-60">{icon}</span>
            </div>
            <div className="flex flex-col gap-1">
                <span className="text-2xl sm:text-3xl font-bold text-white tabular-nums">
                    {value}
                </span>
                {subtitle && (
                    <span className="text-[10px] tracking-widest text-[#C4C4C4]/70 uppercase">
                        {subtitle}
                    </span>
                )}
            </div>
        </motion.div>
    )
}

function StatsSkeleton() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="border border-primaryred-muted bg-[#271C1C] p-5 sm:p-6">
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <div className="h-2 w-16 animate-pulse bg-[#3a2525] rounded-sm" />
                            <div className="h-6 w-6 animate-pulse bg-[#3a2525] rounded-sm" />
                        </div>
                        <div className="flex flex-col gap-1">
                            <div className="h-8 w-20 animate-pulse bg-[#3a2525] rounded-sm" />
                            <div className="h-2 w-12 animate-pulse bg-[#3a2525] rounded-sm" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}

export default function DashboardStats() {
    const user = useAuthStore((s) => s.user)
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const canView = user?.staffRole === 'EXCOM' || user?.staffRole === 'SUPERADMIN'

    useEffect(() => {
        if (!canView) {
            setIsLoading(false)
            return
        }

        const fetchStats = async () => {
            setIsLoading(true)
            setError(null)
            try {
                const res = await fetch('/api/dashboard/stats')
                const json = await res.json()
                if (json.success) {
                    setStats(json.data)
                } else {
                    setError(json.message ?? 'Failed to load stats.')
                }
            } catch {
                setError('Could not reach the server.')
            } finally {
                setIsLoading(false)
            }
        }

        fetchStats()
    }, [canView])

    if (isLoading) return <StatsSkeleton />

    // Non-EXCOM / non-SUPERADMIN roles don't see stats at all
    if (!canView) return null

    if (error) {
        return (
            <div className="border border-red-500/40 bg-red-500/10 p-5 text-red-400 text-xs tracking-wide">
                {error}
            </div>
        )
    }

    if (!stats) return null

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <StatCard
                title="Total Registrations"
                value={stats.totalRegistrations}
                subtitle="Teams"
                color=""
                icon="👥"
            />
            <StatCard
                title="Verified Payments"
                value={stats.verifiedPayments}
                subtitle="Confirmed"
                color=""
                icon="✅"
            />
            <StatCard
                title="Pending Payments"
                value={stats.pendingPayments}
                subtitle="Awaiting"
                color=""
                icon="⏳"
            />
            <StatCard
                title="Attendance"
                value={`${stats.attendancePercentage}%`}
                subtitle="Present"
                color=""
                icon="📊"
            />
        </div>
    )
}