import DashboardPageContent from '../components/DashboardPageContent'

type Props = { searchParams: Promise<{ tab?: string }> }

export default async function CompetitionsPage({ searchParams }: Props) {
    const { tab } = await searchParams
    return <DashboardPageContent tabParam={tab} />
}
