"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type ThemePreference = "light" | "dark" | "system";
type ThemeContextValue = { theme: ThemePreference; setTheme: (theme: ThemePreference) => void };
const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = "fullhouse.theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<ThemePreference>("light");

    useEffect(() => {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        // Restore the persisted choice after mount so the provider remains SSR-safe.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (stored === "light" || stored === "dark" || stored === "system") setThemeState(stored);
    }, []);

    useEffect(() => {
        const media = window.matchMedia("(prefers-color-scheme: dark)");
        const applyTheme = () => {
            const isDark = theme === "dark" || (theme === "system" && media.matches);
            document.documentElement.classList.toggle("dark", isDark);
            document.documentElement.style.colorScheme = isDark ? "dark" : "light";
        };
        applyTheme();
        media.addEventListener("change", applyTheme);
        return () => media.removeEventListener("change", applyTheme);
    }, [theme]);

    const setTheme = useCallback((next: ThemePreference) => {
        window.localStorage.setItem(STORAGE_KEY, next);
        setThemeState(next);
    }, []);

    return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
    const value = useContext(ThemeContext);
    if (!value) throw new Error("useTheme deve ser usado dentro de ThemeProvider.");
    return value;
}
