"use client";

import AuthFormLayout from "@/features/auth/components/AuthFormLayout";
import PhotoUpload from "@/features/auth/components/PhotoUpload";
import SubmitButton from "@/features/auth/components/SubmitButton";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { api } from "@/services/api";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function UploadPhotoPage() {
    const [photo, setPhoto] = useState<File | null>(null);

    const { refreshUser } = useAuth();
    const router = useRouter();

    async function onSubmit() {
        if (!photo) {
            console.log("sem foto");
            return;
        }

        const formData = new FormData();

        formData.append("photo", photo);

        const response = await api.post("/users/me/avatar", formData);

        await refreshUser();

        router.push("/test-private");
    }

    return (
        <AuthFormLayout
            title="Adicione uma foto de perfil"
            description="Essa foto será exibida para os membros da sua casa e ajuda a personalizar sua conta"
            onSubmit={onSubmit}
        >
            <PhotoUpload onChange={setPhoto} />
            <SubmitButton text="Continuar" />
            <button
                type="button"
                onClick={() => router.push("/test-private")}
                className="text-secondary font-bold text-sm hover:underline"
            >
                Pular por enquanto
            </button>
        </AuthFormLayout>
    );
}
