import type {Metadata} from "next";
import {Nunito_Sans, Roboto} from "next/font/google";
import "./globals.css";
import React from "react";
import { AuthProvider } from "@/providers/AuthProvider";

const nunito = Nunito_Sans({
    variable: "--font-nunito",
    subsets: ["latin"],
});

const roboto = Roboto({
    variable: "--font-roboto",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "FullHouse",
    description: "Organização de casas compartilhadas",
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode; }>) {
    return (
        <html
            lang="pt-BR"
            className={`${nunito.variable} ${roboto.variable}`}
        >
            <body>
                <AuthProvider>
                    {children}
                </AuthProvider>
            </body>
        </html>
    );
}