import { Metadata } from "next";
import Image from "next/image";

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
        <div className="flex h-screen flex-col md:flex-row">
            <div className="md:w-1/2 flex justify-center items-center flex-col p-10">
                <div className="">
                    <div className="border border-primaryred text-primaryred bg-primaryred/20 p-4 tracking-[0.4rem] w-fit">PORTAL_READY: VERSION_20.26</div>
                    <h1 className="font-bold text-6xl sm:text-7xl md:text-9xl lg:text-[10rem] text-white text-center">DEVDAY</h1>
                    <h1 className="font-bold text-6xl sm:text-7xl md:text-9xl lg:text-[10rem] text-white">{"\u2018"}26</h1>
                    <div className="border-t-8 border-primaryred w-1/2 mt-4"></div>
                </div>
            </div>
            <div className="md:w-1/2 flex justify-center items-center p-10">
                {children}
            </div>
        </div>
    );
}