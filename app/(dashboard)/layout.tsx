import { Metadata } from "next";

export const metadata: Metadata = {
    title: "DevDay 26 Portal - Dashboard",
    description: "",
};

export default function DashboardLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="">
            {children}
        </div>
    );
}