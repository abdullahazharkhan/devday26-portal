// Shown automatically by Next.js while any dashboard page is loading

export default function DashboardLoading() {
    return (
        <div className="flex flex-col gap-6 animate-pulse">
            {/* Page title placeholder */}
            <div className="flex flex-col gap-2">
                <div className="h-4 w-48 bg-[#3a2525] rounded-sm" />
                <div className="h-0.5 w-10 bg-[#3a2525] rounded-sm" />
            </div>

            {/* Card row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div
                        key={i}
                        className="border border-primaryred-muted bg-[#271C1C] p-5 flex flex-col gap-3"
                    >
                        <div className="h-4 w-32 bg-[#3a2525] rounded-sm" />
                        <div className="h-3 w-48 bg-[#3a2525] rounded-sm" />
                        <div className="h-3 w-40 bg-[#3a2525] rounded-sm" />
                        <div className="h-8 w-full bg-[#3a2525] rounded-sm mt-2" />
                    </div>
                ))}
            </div>

            {/* Wide content block */}
            <div className="border border-primaryred-muted bg-[#271C1C] p-5 flex flex-col gap-4">
                <div className="h-4 w-40 bg-[#3a2525] rounded-sm" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-10 bg-[#3a2525] rounded-sm" />
                    ))}
                </div>
            </div>
        </div>
    )
}
