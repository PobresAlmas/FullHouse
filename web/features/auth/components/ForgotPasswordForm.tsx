"use client"

import AuthFormLayout from "./AuthFormLayout";
import SubmitButton from "./SubmitButton";
import TextField from "./TextField";

import { ArrowLeft } from "lucide-react";
import { forgotPassword } from "../api/auth.api";
import { ForgotPasswordFormData, forgotPasswordSchema } from "./schemas/forgot-passowrd.schema";
import { useRouter } from "next/navigation";
import { useAuthForm } from "../hooks/useAuthForm";

export default function ForgotPasswordForm() {
    const router = useRouter();

    const form = useAuthForm(forgotPasswordSchema);

    async function onSubmit(data: ForgotPasswordFormData) {
        await forgotPassword(data.email);

        router.push(`/verify-email?email=${data.email}`);
    }

    return (
        <AuthFormLayout
            title="Esqueceu sua senha?"
            description="Informe o seu e-mail para receber um código de verificação e redefinir sua senha."
            onSubmit={form.handleSubmit(onSubmit)}
        >
            <TextField
                id="email"
                label="E-mail"
                type="email"
                placeholder="seuemail@email.com"
                {...form.register("email")}
            />

            <SubmitButton text="Enviar código" />

            <a href="/login" className="text-secondary font-bold flex justify-center items-center w-full gap-2 hover:underline">
                <ArrowLeft className="text-secondary" />
                Voltar para o login
            </a>
        </AuthFormLayout>
    )    
}

