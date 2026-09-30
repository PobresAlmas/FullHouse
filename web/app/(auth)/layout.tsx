import LoginSection from "@/features/auth/components/LoginSection";
import React from "react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <main className="flex flex-col items-center justify-center min-h-screen w-full gap-6">
            <LoginSection />
            {children}
        </main>
    )
}