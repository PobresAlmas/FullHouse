"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";

export default function PasswordSucessPage() {
    const router = useRouter();

    return (
        <Card className="w-full max-w-md p-8 gap-6 rounded-sm">
            <CardContent className="flex flex-col justify-center items-center text-center gap-4">
                <div className="bg-success-light w-16 h-16 rounded-full flex justify-center items-center mx-auto">
                    <Check className="mx-auto" />
                </div>
                <h2 className="text-2xl font-heading font-bold">Senha alterada!</h2>
                <p className="text-muted-foreground max-w-40 text-center">
                    Sua senha foi atualizada com sucesso.
                </p>
                <button
                    onClick={() => router.push("/login")}
                    className="w-full bg-secondary text-white rounded-md py-2 font-bold cursor-pointer"
                >
                    Ir para o login
                </button>
            </CardContent>
        </Card>
    );
}
