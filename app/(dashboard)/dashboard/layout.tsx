import { Metadata } from "next";
import { Suspense } from "react";
import DashboardNav from "./components/DashboardNav";
import DashboardStatsGate from "./components/DashboardStatsGate";
import ErrorBoundary from "@/components/ErrorBoundary";

export const metadata: Metadata = {
    title: "DevDay '26 Portal - Dashboard",
    description: "",
};

export default function DashboardLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="min-h-screen text-white flex flex-col">
            <Suspense fallback={
                <div className="bg-[#191111] border-b border-primaryred-muted h-30 animate-pulse" />
            }>
                <DashboardNav />
            </Suspense>
            <main className="flex-1 px-4 sm:px-6 md:px-8 py-6 sm:py-8">
                <div className="flex flex-col gap-8">
                    <DashboardStatsGate />
                    <ErrorBoundary>
                        {children}
                    </ErrorBoundary>
                </div>
            </main>
        </div>
    );
}