"use client";

import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import SubmitButton from "./SubmitButton";
import AuthFormLayout from "./AuthFormLayout";
import PasswordField from "./PasswordField";
import { loginSchema, type LoginFormData } from "./schemas/login.schema";
import FormTextField from "@/components/form/FormTextField";
import { login } from "../api/auth.api";
import { useRouter } from "next/navigation";
import { useAuth } from "../hooks/useAuth";
import { isApiError } from "@/services/api-error.utils";
import { useEffect, useState } from "react";
import { useAuthForm } from "../hooks/useAuthForm";

export default function LoginForm() {
    const [errorMessage, setErrorMessage] = useState("");

    const form = useAuthForm(loginSchema);

    const {
        register,
        formState: { errors },
    } = form;

    const router = useRouter();
    const { user, loading, refreshUser } = useAuth();

    useEffect(() => {
        if (!loading && user) router.replace("/test-private");
    }, [loading, router, user]);

    async function onSubmit(data: LoginFormData) {
        try {
            const response = await login(data);
            console.log(response);

            await refreshUser();
            router.push("/test-private");
        } catch (error: unknown) {
            if (isApiError(error)) setErrorMessage(error.message);
        }
    }

    if (loading || user) return null;

    return (
        <AuthFormLayout
            title="Entrar na sua conta"
            description="Bem-vindo de volta!"
            onSubmit={form.handleSubmit(onSubmit)}
        >
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

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Checkbox id="remember" {...register("rememberMe")} />
                    <Label htmlFor="remember">Lembrar de mim</Label>
                </div>
                <a
                    href="/forgot-password"
                    className="text-sm text-secondary font-bold hover:underline"
                >
                    Esqueceu sua senha?
                </a>
            </div>

            {errorMessage && <p className="text-red-500 text-sm text-center">{errorMessage}</p>}

            <SubmitButton text="Entrar" />

            <div className="flex items-center gap-3 w-full">
                <Separator className="flex-1" />
                <span className="text-sm text-muted-foreground">ou</span>
                <Separator className="flex-1" />
            </div>

            <p className="text-center text-sm text-muted-foreground">
                Não tem uma conta?{" "}
                <a href="/register" className="text-secondary font-bold wl-1">
                    {" "}
                    Cadastre-se!
                </a>
            </p>
        </AuthFormLayout>
    );
}
