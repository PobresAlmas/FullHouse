"use client";

import AuthFormLayout from "./AuthFormLayout";
import SubmitButton from "./SubmitButton";
import TextField from "./TextField";

import { ArrowLeft } from "lucide-react";
import { forgotPassword } from "../api/auth.api";
import { ForgotPasswordFormData, forgotPasswordSchema } from "./schemas/forgot-passowrd.schema";
import { useRouter } from "next/navigation";
import { useAuthForm } from "../hooks/useAuthForm";
import { useState } from "react";
import { isApiError } from "@/services/api-error.utils";

export default function ForgotPasswordForm() {
    const router = useRouter();
    const [errorMessage, setErrorMessage] = useState("");

    const form = useAuthForm(forgotPasswordSchema);

    async function onSubmit(data: ForgotPasswordFormData) {
        setErrorMessage("");
        try {
            await forgotPassword(data.email);
            router.push(`/verify-email?email=${encodeURIComponent(data.email)}`);
        } catch (error: unknown) {
            setErrorMessage(
                isApiError(error)
                    ? error.message
                    : "Não foi possível enviar o código. Tente novamente."
            );
        }
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

            {errorMessage && (
                <p role="alert" className="text-center text-sm text-red-500">
                    {errorMessage}
                </p>
            )}

            <a
                href="/login"
                className="text-secondary font-bold flex justify-center items-center w-full gap-2 hover:underline"
            >
                <ArrowLeft className="text-secondary" />
                Voltar para o login
            </a>
        </AuthFormLayout>
    );
}
