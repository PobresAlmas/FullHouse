"use client";

import { createContext } from "react";
import type { ReactNode } from "react";

export type AppHeaderPageState = {
    residenceName?: string | null;
    subtitle?: ReactNode;
};

export const AppHeaderControlContext = createContext<{
    registerControl: (control: ReactNode | null) => void;
    registerPageState: (state: AppHeaderPageState | null) => void;
} | null>(null);
