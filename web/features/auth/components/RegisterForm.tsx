"use client"

import { Separator } from "@/components/ui/separator";
import SubmitButton from "./SubmitButton";
import AuthFormLayout from "./AuthFormLayout";
import PasswordField from "./PasswordField";
import { RegisterFormData, registerSchema } from "./schemas/register.schema";
import FormTextField from "@/components/form/FormTextField";
import { useRouter } from "next/navigation";
import { register as registerUser } from "../api/auth.api";
import { useState } from "react";
import { isApiError } from "@/services/api-error.utils";
import { useAuthForm } from "../hooks/useAuthForm";

export default function RegisterForm() {
    const [errorMessage, setErrorMessage] = useState("");

    const form = useAuthForm(registerSchema);
    
    const {
        register,
        formState: { errors }
    } = form;

    const router = useRouter();

    async function onSubmit(data: RegisterFormData) {
        try {
            await registerUser(data);
            router.push("/upload-photo");
        } catch (error: unknown) {
            if (isApiError(error))
                setErrorMessage(error.message);
        }
    }

    return (
        <AuthFormLayout
            title="Criar sua conta"
            description="Vamos começar!"
            onSubmit={form.handleSubmit(onSubmit)}
        >
            <FormTextField
                name="name"
                label="Nome"
                placeholder="Seu nome"
                form={form}
            />
            <FormTextField
                name="nickname"
                label="Apelido"
                form={form}
                placeholder="Como podemos te chamar?"
            />
            <FormTextField
                name="email"
                label="E-mail"
                type="email"
                placeholder="seuemail@email.com"
                form={form}
            />
            <PasswordField
                id="password"
                label="Senha"
                helperText="Use pelo menos 8 caracteres"
                {...register("password")}
                error={errors.password?.message}
            />
    
            {errorMessage && (
                <p className="text-destructive text-sm text-center">
                    {errorMessage}
                </p>
            )}
            <SubmitButton text="Criar conta" />

            <div className="flex items-center gap-3 w-full">
                <Separator className="flex-1" />
                <span className="text-sm text-muted-foreground">ou</span>
                <Separator className="flex-1" />
            </div>

            <p className="text-center text-sm text-muted-foreground">
                Já possui uma conta? <a href="/login" className="text-secondary font-bold wl-1">Entrar</a>
            </p>
        </AuthFormLayout>
    )
}
