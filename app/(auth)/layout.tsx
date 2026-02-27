import { Metadata } from "next";

export const metadata: Metadata = {
    title: "DevDay '26 Portal - Authentication",
    description: "",
};

export default function AuthLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="min-h-screen flex flex-col md:flex-row">
            <div className="md:w-1/2 flex justify-center items-center flex-col px-5 py-8 md:p-10">
                <div className="w-full max-w-xl">
                    <div className="mb-4 border border-primaryred text-primaryred bg-primaryred/20 hidden sm:p-2 md:p-4 sm:flex tracking-[0.1rem] sm:tracking-[0.3rem] text-xs sm:text-sm w-fit">PORTAL_READY: VERSION_20.26</div>
                    <h1 className="font-bold text-5xl sm:text-6xl md:text-8xl lg:text-[9rem] leading-none text-white text-center inline md:block">DEVDAY</h1>
                    <h1 className="font-bold text-5xl sm:text-6xl md:text-8xl lg:text-[9rem] leading-none text-white text-center md:text-left inline md:block">{"\u2018"}26</h1>
                    <div className="border-t-2 sm:border-t-8 border-primaryred w-full md:w-1/2 mt-4"></div>
                </div>
            </div>
            <div className="md:w-1/2 flex justify-center items-start md:items-center px-4 pb-8 sm:px-8 md:p-10">
                {children}
            </div>
        </div>
    );
}