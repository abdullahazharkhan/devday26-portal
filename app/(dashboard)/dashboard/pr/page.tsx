const tabs = [
    { id: 'view-all-registrations', title: 'VIEW_ALL_REGISTRATIONS' },
    { id: 'create-new-registration', title: 'CREATE_NEW_REGISTRATION' },
    { id: 'update-attendance', title: 'UPDATE_ATTENDANCE' },
] as const

type Props = {
    searchParams: Promise<{ tab?: string }>
}

export default async function PRPage({ searchParams }: Props) {
    const { tab } = await searchParams
    const activeTab = tabs.find((item) => item.id === tab) ?? tabs[0]

    return (
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="text-2xl font-bold tracking-widest text-white">{activeTab.title}</h1>
                <div className="w-12 h-0.5 bg-primaryred mt-2" />
            </div>
            <div className="border border-primaryred-muted bg-[#271C1C] p-5 sm:p-8 md:p-10 min-h-64 sm:min-h-80 flex items-center justify-center">
                <p className="text-[#C4C4C4] text-xs tracking-widest">// CONTENT_COMING_SOON</p>
            </div>
        </div>
    )
}