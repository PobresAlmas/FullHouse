"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { isValidElement } from "react";
import { usePathname } from "next/navigation";
import { AppPageHeader } from "./AppPageHeader";
import { AppSidebar, type AppSection } from "./AppSidebar";
import { AppShellContext } from "./AppShellContext";
import { AppHeaderControlContext, type AppHeaderPageState } from "./AppHeaderControlContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { getResidences, type Residence } from "@/features/residences/api/residences.api";

const routes: [string, AppSection, string][] = [
    ["/tasks", "tasks", "Tarefas da casa"],
    ["/finance", "finance", "Organize as finanças da casa e pessoais."],
    ["/pantry", "pantry", "Organize os itens, categorias e validades da casa."],
    ["/shopping-list", "shopping-list", "Listas de compras pessoais e da casa"],
    ["/pets", "pets", "Cuidados e informações dos pets da casa."],
    ["/chat", "chat", "Converse com os moradores da residência."],
    ["/rules", "rules", "Regras da residência"],
    ["/meetings", "meetings", "Reuniões da casa"],
    ["/rooms", "rooms", "Quartos disponíveis"],
    ["/settings", "settings", "Configurações da conta e da casa"],
];

function routeInfo(pathname: string): { section: AppSection; subtitle?: string } {
    const match = routes.find(
        ([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );
    return match
        ? { section: match[1], subtitle: match[2] }
        : { section: "home", subtitle: "Seu espaço para organizar a vida em casa." };
}

function sameHeaderNode(left: ReactNode, right: ReactNode): boolean {
    if (Object.is(left, right)) return true;
    if (Array.isArray(left) && Array.isArray(right)) {
        return (
            left.length === right.length &&
            left.every((item, index) => sameHeaderNode(item, right[index]))
        );
    }
    if (!isValidElement(left) || !isValidElement(right)) return false;
    if (left.type !== right.type || left.key !== right.key) return false;
    const leftProps = left.props as Record<string, unknown>;
    const rightProps = right.props as Record<string, unknown>;
    const keys = new Set([...Object.keys(leftProps), ...Object.keys(rightProps)]);
    for (const key of keys) {
        if (key === "children") {
            if (!sameHeaderNode(leftProps.children as ReactNode, rightProps.children as ReactNode))
                return false;
        } else if (typeof leftProps[key] === "function" && typeof rightProps[key] === "function") {
            continue;
        } else if (!Object.is(leftProps[key], rightProps[key])) {
            return false;
        }
    }
    return true;
}

export function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { user } = useAuth();
    const [residences, setResidences] = useState<Residence[]>([]);
    const [residenceId, setResidenceId] = useState("");
    const [residencesLoaded, setResidencesLoaded] = useState(false);
    const [pageControl, setPageControl] = useState<ReactNode | null>(null);
    const [pageState, setPageState] = useState<AppHeaderPageState | null>(null);
    const { section, subtitle } = routeInfo(pathname);
    const residence = residences.find((item) => item.id === residenceId) ?? residences[0];

    useEffect(() => {
        let active = true;
        void getResidences()
            .then((items) => {
                if (!active) return;
                setResidences(items);
                setResidenceId((current) =>
                    items.some((item) => item.id === current) ? current : (items[0]?.id ?? "")
                );
            })
            .catch(() => setResidences([]))
            .finally(() => setResidencesLoaded(true));
        return () => {
            active = false;
        };
    }, []);

    const noResidence = residencesLoaded ? residences.length === 0 : undefined;
    const greetingName = user?.name?.trim() || user?.nickname?.trim() || user?.email || "Morador";
    const registerControl = useCallback((control: ReactNode | null) => {
        setPageControl((current) => (sameHeaderNode(current, control) ? current : control));
    }, []);
    const registerPageState = useCallback(
        (state: AppHeaderPageState | null) =>
            setPageState((current) =>
                current?.residenceName === state?.residenceName &&
                sameHeaderNode(current?.subtitle, state?.subtitle)
                    ? current
                    : state
            ),
        []
    );
    const headerControlContext = useMemo(
        () => ({ registerControl, registerPageState }),
        [registerControl, registerPageState]
    );

    return (
        <AppShellContext.Provider value={false}>
            <div className="min-h-screen bg-[#f6f3f7] md:flex">
                <AppSidebar
                    global
                    activeSection={section}
                    residenceName={residence?.name}
                    noResidence={noResidence}
                />
                <div className="min-w-0 flex-1">
                    <AppPageHeader
                        global
                        greetingName={greetingName}
                        profileName={user?.nickname?.trim() || greetingName}
                        profilePhoto={user?.photo}
                        profileBackgroundColor={user?.avatarBackgroundColor}
                        residenceName={pageState ? pageState.residenceName : residence?.name}
                        subtitle={pageState?.subtitle ?? subtitle}
                        residenceControl={
                            pageControl ??
                            (residences.length > 1 ? (
                                <select
                                    aria-label="Residência atual"
                                    value={residenceId}
                                    onChange={(event) => setResidenceId(event.target.value)}
                                    className="max-w-52 cursor-pointer rounded-lg border border-[#d8d1da] bg-white px-3 py-2 text-sm"
                                >
                                    {residences.map((item) => (
                                        <option key={item.id} value={item.id}>
                                            {item.name}
                                        </option>
                                    ))}
                                </select>
                            ) : undefined)
                        }
                    />
                    <AppShellContext.Provider value>
                        <AppHeaderControlContext.Provider value={headerControlContext}>
                            {children}
                        </AppHeaderControlContext.Provider>
                    </AppShellContext.Provider>
                </div>
            </div>
        </AppShellContext.Provider>
    );
}
