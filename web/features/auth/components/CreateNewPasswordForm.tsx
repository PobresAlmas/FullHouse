"use client"

import { useRouter, useSearchParams } from "next/navigation";
import AuthFormLayout from "./AuthFormLayout";
import PasswordField from "./PasswordField";
import SubmitButton from "./SubmitButton";
import { resetPassword } from "../api/auth.api";
import { useForm } from "react-hook-form";
import { ResetPasswordFormData, resetPasswordSchema } from "./schemas/reset-password.schema";
import { zodResolver } from "@hookform/resolvers/zod";

export default function CreateNewPasswordForm() {
    const router = useRouter();
    
    const searchParams = useSearchParams();

    const email = searchParams.get("email");
    const code = searchParams.get("code");

    const form = useForm<ResetPasswordFormData>({
        resolver: zodResolver(resetPasswordSchema)
    });

    const {
        register,
        formState: { errors }
    } = form;

    async function onSubmit(data: ResetPasswordFormData) {
        if (!email || !code)
            return;

        await resetPassword({ 
            email: email, 
            code: code,
            password: data.password 
        });

        router.push("/password-success");
    }

    return (
        <AuthFormLayout
            title="Criar nova senha"
            description="Defina uma nova senha para sua conta"
            onSubmit={form.handleSubmit(onSubmit)}
        >
            <div className="grid gap-6">
                <PasswordField
                    id="password"
                    label="Nova senha"
                    helperText="Use pelo menos 8 caracteres"
                    {...register("password")}
                    error={errors.password?.message}
                />
                <PasswordField
                    id="confirm-password"
                    label="Confirmar nova senha"
                    {...register("confirmPassword")}
                    error={errors.confirmPassword?.message}
                />
                <SubmitButton text="Alterar senha" />
            </div>
        </AuthFormLayout>
    )
}