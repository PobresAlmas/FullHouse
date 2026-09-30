"use client";

import { useAuth } from "@/features/auth/hooks/useAuth";


export default function TestPrivatePage(){

    const {
        user,
        logout
    } = useAuth();


    return (
        <main>

            <h1>
                Área privada
            </h1>

            <p>
                {user?.email}
            </p>


            <button
                onClick={logout}
            >
                Sair
            </button>

        </main>
    );
}