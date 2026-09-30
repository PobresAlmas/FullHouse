"use client"

import { useAuth } from "@/features/auth/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();

    const router = useRouter();

    useEffect(() => {
        if (!loading && !user)
            router.push("/login");
    }, [loading, user, router]);

    if (loading)
        return (
            <p>Carregando...</p>
        )

    if (!user) return null;

    return children;
}