"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { AppPageHeader } from "@/components/layout/AppPageHeader";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { updateProfile, uploadProfilePhoto } from "../api/profile.api";

const inputClass =
    "mt-1 min-h-11 w-full rounded-lg border border-[#d8d5dc] bg-white px-3 text-sm outline-none focus:border-[#4e812f] focus:ring-2 focus:ring-[#4e812f]/20";

function errorText(error: unknown) {
    if (typeof error === "object" && error && "message" in error) {
        const message = error.message;
        return Array.isArray(message) ? message.join(" ") : String(message);
    }
    return "Não foi possível salvar as alterações. Tente novamente.";
}

export function ProfilePage() {
    const { user, loading: authLoading, refreshUser } = useAuth();
    const [name, setName] = useState(user?.name ?? "");
    const [nickname, setNickname] = useState(user?.nickname ?? "");
    const [email, setEmail] = useState(user?.email ?? "");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPasswordFields, setShowPasswordFields] = useState(false);
    const [photo, setPhoto] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState(user?.photo ?? "");
    const [saving, setSaving] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    useEffect(() => {
        if (!photoPreview.startsWith("blob:")) return;
        return () => URL.revokeObjectURL(photoPreview);
    }, [photoPreview]);

    async function saveProfile(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!user) return;
        setError("");
        setNotice("");

        if (newPassword && newPassword !== confirmPassword) {
            setError("A confirmação da nova senha não corresponde.");
            return;
        }

        const update: {
            name?: string;
            nickname?: string;
            email?: string;
            currentPassword?: string;
            newPassword?: string;
        } = {};
        const nextName = name.trim();
        const nextNickname = nickname.trim();
        const nextEmail = email.trim();
        const emailChanged = nextEmail.toLowerCase() !== user.email.toLowerCase();

        if (nextName !== (user.name ?? "")) update.name = nextName;
        if (nextNickname !== (user.nickname ?? "")) update.nickname = nextNickname;
        if (emailChanged) update.email = nextEmail;
        if (newPassword) update.newPassword = newPassword;

        if (emailChanged || newPassword) {
            if (!currentPassword) {
                setError("Informe sua senha atual para alterar o e-mail ou a senha.");
                return;
            }
            update.currentPassword = currentPassword;
        }
        if (Object.keys(update).length === 0) {
            setNotice("Seu perfil já está atualizado.");
            return;
        }

        setSaving(true);
        try {
            await updateProfile(update);
            await refreshUser();
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setShowPasswordFields(false);
            setNotice("Perfil atualizado.");
        } catch (cause: unknown) {
            setError(errorText(cause));
        } finally {
            setSaving(false);
        }
    }

    async function savePhoto() {
        if (!photo) return;
        setError("");
        setNotice("");
        setUploadingPhoto(true);
        try {
            await uploadProfilePhoto(photo);
            await refreshUser();
            setPhoto(null);
            setPhotoPreview("");
            setNotice("Foto de perfil atualizada.");
        } catch (cause: unknown) {
            setError(errorText(cause));
        } finally {
            setUploadingPhoto(false);
        }
    }

    return (
        <div className="min-h-screen bg-[#f7f8fa] text-[#24232a] md:flex">
            <AppSidebar activeSection="profile" />
            <div className="min-w-0 flex-1">
                <AppPageHeader
                    greetingName={user?.nickname || user?.name || "Perfil"}
                    subtitle="Gerencie seus dados pessoais"
                />
                <main className="mx-auto max-w-3xl p-5 md:p-10">
                    <h2 className="mb-6 text-2xl font-bold">Meu perfil</h2>
                    {authLoading ? (
                        <p role="status">Carregando perfil...</p>
                    ) : (
                        <div className="grid gap-6">
                            <section
                                aria-labelledby="profile-photo-heading"
                                className="rounded-2xl border bg-white p-5"
                            >
                                <h3 id="profile-photo-heading" className="font-semibold">
                                    Foto de perfil
                                </h3>
                                <div className="mt-4 flex flex-wrap items-center gap-5">
                                    {photoPreview || user?.photo ? (
                                        <Image
                                            src={photoPreview || user?.photo || ""}
                                            alt="Foto do perfil"
                                            width={96}
                                            height={96}
                                            unoptimized
                                            className="size-24 rounded-full object-cover"
                                        />
                                    ) : (
                                        <span className="grid size-24 place-items-center rounded-full bg-[#e8f3e8] text-3xl font-semibold text-[#315f35]">
                                            {(user?.nickname || user?.name || "?")
                                                .slice(0, 1)
                                                .toLocaleUpperCase("pt-BR")}
                                        </span>
                                    )}
                                    <div className="grid gap-2">
                                        <label className="text-sm">
                                            Escolher foto (PNG ou JPG, até 5 MB)
                                            <input
                                                aria-label="Escolher foto de perfil"
                                                className="mt-2 block text-sm"
                                                type="file"
                                                accept="image/png,image/jpeg"
                                                onChange={(event) => {
                                                    const file = event.target.files?.[0] ?? null;
                                                    if (
                                                        file &&
                                                        !["image/png", "image/jpeg"].includes(
                                                            file.type
                                                        )
                                                    ) {
                                                        setError("Use uma imagem PNG ou JPG.");
                                                        setPhoto(null);
                                                        setPhotoPreview("");
                                                        return;
                                                    }
                                                    if (file && file.size > 5 * 1024 * 1024) {
                                                        setError("A foto deve ter até 5 MB.");
                                                        setPhoto(null);
                                                        setPhotoPreview("");
                                                        return;
                                                    }
                                                    setError("");
                                                    setPhoto(file);
                                                    setPhotoPreview(
                                                        file ? URL.createObjectURL(file) : ""
                                                    );
                                                }}
                                            />
                                        </label>
                                        <Button
                                            type="button"
                                            disabled={!photo || uploadingPhoto || authLoading}
                                            onClick={() => void savePhoto()}
                                        >
                                            {uploadingPhoto ? "Enviando foto..." : "Salvar foto"}
                                        </Button>
                                    </div>
                                </div>
                            </section>

                            <form
                                onSubmit={(event) => void saveProfile(event)}
                                className="grid gap-5 rounded-2xl border bg-white p-5"
                                aria-label="Editar perfil"
                            >
                                <h3 className="font-semibold">Dados pessoais</h3>
                                <label className="text-sm">
                                    Nome
                                    <input
                                        className={inputClass}
                                        required
                                        minLength={3}
                                        maxLength={150}
                                        value={name}
                                        onChange={(event) => setName(event.target.value)}
                                        autoComplete="name"
                                    />
                                </label>
                                <label className="text-sm">
                                    Apelido
                                    <input
                                        className={inputClass}
                                        maxLength={100}
                                        value={nickname}
                                        onChange={(event) => setNickname(event.target.value)}
                                    />
                                </label>
                                <label className="text-sm">
                                    E-mail
                                    <input
                                        className={inputClass}
                                        required
                                        type="email"
                                        value={email}
                                        onChange={(event) => setEmail(event.target.value)}
                                        autoComplete="email"
                                    />
                                </label>

                                {!showPasswordFields &&
                                    email.trim().toLowerCase() !== user?.email.toLowerCase() && (
                                        <label className="text-sm">
                                            Senha atual
                                            <input
                                                className={inputClass}
                                                type="password"
                                                value={currentPassword}
                                                onChange={(event) =>
                                                    setCurrentPassword(event.target.value)
                                                }
                                                autoComplete="current-password"
                                            />
                                        </label>
                                    )}
                                <div className="border-t pt-5">
                                    <button
                                        type="button"
                                        className="text-sm font-semibold text-[#315f35] underline-offset-4 hover:underline"
                                        aria-expanded={showPasswordFields}
                                        aria-controls="profile-password-fields"
                                        onClick={() => setShowPasswordFields((shown) => !shown)}
                                    >
                                        {showPasswordFields
                                            ? "Cancelar alteração de senha"
                                            : "Alterar senha"}
                                    </button>
                                    {showPasswordFields && (
                                        <div
                                            id="profile-password-fields"
                                            className="mt-4 grid gap-4"
                                        >
                                            <label className="text-sm">
                                                Senha atual
                                                <input
                                                    className={inputClass}
                                                    type="password"
                                                    value={currentPassword}
                                                    onChange={(event) =>
                                                        setCurrentPassword(event.target.value)
                                                    }
                                                    autoComplete="current-password"
                                                />
                                            </label>
                                            <label className="text-sm">
                                                Nova senha (mínimo 8 caracteres)
                                                <input
                                                    className={inputClass}
                                                    type="password"
                                                    minLength={8}
                                                    value={newPassword}
                                                    onChange={(event) =>
                                                        setNewPassword(event.target.value)
                                                    }
                                                    autoComplete="new-password"
                                                />
                                            </label>
                                            <label className="text-sm">
                                                Confirmar nova senha
                                                <input
                                                    className={inputClass}
                                                    type="password"
                                                    value={confirmPassword}
                                                    onChange={(event) =>
                                                        setConfirmPassword(event.target.value)
                                                    }
                                                    autoComplete="new-password"
                                                />
                                            </label>
                                            <p className="text-xs text-[#77717c]">
                                                A senha atual é necessária para alterar o e-mail ou
                                                a senha.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {error && (
                                    <p role="alert" className="text-sm text-red-700">
                                        {error}
                                    </p>
                                )}
                                {notice && (
                                    <p role="status" className="text-sm text-[#285a2e]">
                                        {notice}
                                    </p>
                                )}
                                <Button type="submit" disabled={saving || authLoading}>
                                    {saving ? "Salvando..." : "Salvar alterações"}
                                </Button>
                            </form>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
