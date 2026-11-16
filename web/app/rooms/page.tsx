"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
    getResidences,
    RESIDENCE_MEMBERSHIP_CHANGED_EVENT,
} from "@/features/residences/api/residences.api";
import { RoomsPage } from "@/features/rooms/components/RoomsPage";

type RouteAccess = {
    userId: string | null;
    status: "checking" | "allowed";
};

export default function RoomsRoute() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const userId = user?.id ?? null;
    const [access, setAccess] = useState<RouteAccess>({
        userId: null,
        status: "checking",
    });

    useEffect(() => {
        if (loading) return;
        let active = true;
        let latestRequest = 0;

        const verifyAccess = async () => {
            const request = ++latestRequest;
            setAccess({ userId, status: "checking" });

            if (!userId) {
                router.replace("/login");
                return;
            }

            try {
                const residences = await getResidences();
                if (!active || request !== latestRequest) return;
                if (residences.length > 0) {
                    router.replace("/");
                    return;
                }
                setAccess({ userId, status: "allowed" });
            } catch {
                if (!active || request !== latestRequest) return;
                router.replace("/");
            }
        };

        void verifyAccess();
        window.addEventListener(RESIDENCE_MEMBERSHIP_CHANGED_EVENT, verifyAccess);
        return () => {
            active = false;
            window.removeEventListener(RESIDENCE_MEMBERSHIP_CHANGED_EVENT, verifyAccess);
        };
    }, [loading, router, userId]);

    const matchesCurrentUser = access.userId === userId;
    if (loading || !matchesCurrentUser || access.status === "checking") {
        return null;
    }

    return <RoomsPage />;
}
