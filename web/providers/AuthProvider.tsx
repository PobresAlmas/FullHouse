"use client";

import { getMe, logout as logoutRequest } from "@/features/auth/api/auth.api";
import { useRouter } from "next/navigation";
import React, { createContext, useEffect, useState } from "react";

interface User {
    id: string;
    email: string;
}

interface AuthContextData {
    user: User | null;
    loading: boolean;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextData | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const router = useRouter();

    useEffect(() => {
        async function loadUser() {
            try {
                const user = await getMe();
                setUser(user);
            } catch (error) {
                void error;

                setUser(null);
            } finally {
                setLoading(false);
            }
        }

        loadUser();
    }, []);

    async function logout() {
        await logoutRequest();

        setUser(null);

        router.push("/login");
    }

    async function refreshUser() {
        const user = await getMe();

        setUser(user);
    }

    return (
        <AuthContext.Provider value={{ user, loading, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}
