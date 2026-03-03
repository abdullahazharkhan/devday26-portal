import CreateAccountForm from './CreateAccountForm'
import AssignActionsForm from './AssignActionsForm'
import teamConfig from '../components/tabsConfig'

const tabs = teamConfig['super-admin'].tabs.map((t) => ({ id: t.action, title: t.label.toUpperCase() }))

type Props = {
    searchParams: Promise<{ tab?: string }>
}

export default async function SuperAdminPage({ searchParams }: Props) {
    const { tab } = await searchParams
    const activeTab = tabs.find((item) => item.id === tab) ?? tabs[0]

    return (
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="text-2xl font-bold tracking-widest text-white">{activeTab.title}</h1>
                <div className="w-12 h-0.5 bg-primaryred mt-2" />
            </div>

            {activeTab.id === 'create-accounts' ? (
                <CreateAccountForm />
            ) : activeTab.id === 'assign-actions-to-users' ? (
                <AssignActionsForm />
            ) : (
                <div className="border border-primaryred-muted bg-[#271C1C] p-5 sm:p-8 md:p-10 min-h-64 sm:min-h-80 flex items-center justify-center">
                    <p className="text-[#C4C4C4] text-xs tracking-widest">// CONTENT_COMING_SOON</p>
                </div>
            )}
        </div>
    )
}