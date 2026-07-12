import { Suspense } from 'react'
import DashboardPageContent from './DashboardPageContent'

function DashboardContentFallback() {
    return (
        <div className="flex flex-col gap-8">
            <div>
                <div className="h-8 w-64 animate-pulse bg-[#3a2525] rounded-sm" />
                <div className="w-12 h-0.5 bg-primaryred mt-2" />
            </div>
            <div className="border border-primaryred-muted bg-[#271C1C] p-5 sm:p-8 md:p-10 min-h-64 sm:min-h-80 flex items-center justify-center">
                <div className="w-36 h-4 animate-pulse bg-[#3a2525] rounded-sm" />
            </div>
        </div>
    )
}

export default function DashboardPageShell() {
    return (
        <Suspense fallback={<DashboardContentFallback />}>
            <DashboardPageContent />
        </Suspense>
    )
}
