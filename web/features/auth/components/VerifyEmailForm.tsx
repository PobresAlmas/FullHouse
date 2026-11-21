"use client";

import { ArrowLeft } from "lucide-react";
import AuthFormLayout from "./AuthFormLayout";
import OtpInput from "./OtpInput";
import SubmitButton from "./SubmitButton";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { forgotPassword, verifyResetCode } from "../api/auth.api";
import { isApiError } from "@/services/api-error.utils";

export default function VerifyEmailForm() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const email = searchParams.get("email")?.trim() ?? "";

    const [code, setCode] = useState("");
    const [seconds, setSeconds] = useState(60);
    const [errorMessage, setErrorMessage] = useState("");

    const canResend = seconds === 0;

    useEffect(() => {
        if (seconds === 0) return;

        const timer = setTimeout(() => setSeconds((prev) => prev - 1), 1000);

        return () => clearTimeout(timer);
    }, [seconds]);

    async function onSubmit() {
        const response = await verifyResetCode(email, code);

        if (response.valid) router.push(`/create-new-password?email=${email}&code=${code}`);
    }

    async function resendCode() {
        if (!email) return;
        setErrorMessage("");
        try {
            await forgotPassword(email);
            setSeconds(60);
        } catch (error: unknown) {
            setErrorMessage(
                isApiError(error) ? error.message : "Não foi possível reenviar o código."
            );
        }
    }

    return (
        <AuthFormLayout
            title="Verifique o seu email"
            description={
                email
                    ? `Enviamos um código de 6 dígitos para ${email}`
                    : "Informe o e-mail para receber um código de 6 dígitos."
            }
            onSubmit={onSubmit}
        >
            <OtpInput length={6} onChange={setCode} />
            <SubmitButton text="Confirmar código" />
            {errorMessage && (
                <p role="alert" className="text-center text-sm text-red-500">
                    {errorMessage}
                </p>
            )}
            <p className="text-center text-muted-foreground">
                Não recebeu o código? <br />
                {canResend ? (
                    <button
                        type="button"
                        onClick={resendCode}
                        className="font-bold text-primary hover:underline"
                    >
                        Reenviar código
                    </button>
                ) : (
                    <span>
                        Reenviar código em{" "}
                        <span className="font-bold text-primary">
                            00:{seconds.toString().padStart(2, "0")}
                        </span>
                    </span>
                )}
            </p>
            <a
                href="/forgot-password"
                className="text-secondary font-bold flex justify-center items-center w-full gap-2 hover:underline"
            >
                <ArrowLeft className="text-secondary" />
                Voltar
            </a>
        </AuthFormLayout>
    );
}
