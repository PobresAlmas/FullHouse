"use client";

import { Check, ImagePlus } from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { updateProfile, uploadProfilePhoto } from "../api/profile.api";

const inputClass =
    "mt-1 min-h-11 w-full rounded-lg border border-[#d8d5dc] bg-white px-3 text-sm outline-none focus:border-[#4e812f] focus:ring-2 focus:ring-[#4e812f]/20";
const avatarColors = [
    { value: "#e8f3e8", label: "Verde claro" },
    { value: "#e8e4f4", label: "Lilás" },
    { value: "#e2eff7", label: "Azul claro" },
    { value: "#f8eadb", label: "Pêssego" },
    { value: "#f5e1e7", label: "Rosa" },
    { value: "#ece9e2", label: "Areia" },
];

function errorText(error: unknown) {
    if (typeof error === "object" && error && "message" in error) {
        const message = error.message;
        return Array.isArray(message) ? message.join(" ") : String(message);
    }
    return "Não foi possível salvar as alterações. Tente novamente.";
}

export function ProfileSettingsContent() {
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
    const [avatarBackgroundColor, setAvatarBackgroundColor] = useState(
        user?.avatarBackgroundColor ?? "#e8f3e8"
    );
    const [savingAvatarColor, setSavingAvatarColor] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [avatarError, setAvatarError] = useState("");
    const [avatarNotice, setAvatarNotice] = useState("");

    useEffect(() => {
        if (!photoPreview.startsWith("blob:")) return;
        return () => URL.revokeObjectURL(photoPreview);
    }, [photoPreview]);

    useEffect(() => {
        if (!user) return;
        // Keep the editable form synchronized when the authenticated account changes.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setName(user.name ?? "");
        setNickname(user.nickname ?? "");
        setEmail(user.email ?? "");
        setPhotoPreview(user.photo ?? "");
        setAvatarBackgroundColor(user.avatarBackgroundColor ?? "#e8f3e8");
    }, [user]);

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
        setAvatarError("");
        setAvatarNotice("");
        setUploadingPhoto(true);
        try {
            await uploadProfilePhoto(photo);
            await refreshUser();
            setPhoto(null);
            setPhotoPreview("");
            setAvatarNotice("Foto de perfil atualizada.");
        } catch (cause: unknown) {
            setAvatarError(errorText(cause));
        } finally {
            setUploadingPhoto(false);
        }
    }

    async function changeAvatarColor(color: string) {
        setAvatarBackgroundColor(color);
        setSavingAvatarColor(true);
        setError("");
        try {
            await updateProfile({ avatarBackgroundColor: color });
            await refreshUser();
        } catch (cause: unknown) {
            setError(errorText(cause));
        } finally {
            setSavingAvatarColor(false);
        }
    }

    return (
        <div className="min-w-0">
            <main className="grid gap-4">
                {authLoading ? (
                    <p role="status">Carregando perfil...</p>
                ) : (
                    <div className="grid gap-6">
                        <section
                            aria-labelledby="profile-photo-heading"
                            className="rounded-xl border border-[#dfd6e3] bg-[#fffaff] p-5"
                        >
                            <h3 id="profile-photo-heading" className="font-semibold">
                                Foto de perfil
                            </h3>
                            <div className="mt-4 flex flex-wrap items-center gap-5">
                                <UserAvatar
                                    name={user?.nickname || user?.name}
                                    photo={photoPreview || user?.photo}
                                    backgroundColor={avatarBackgroundColor}
                                    size="lg"
                                />
                                <div className="grid min-w-0 flex-1 gap-3">
                                    <label className="grid cursor-pointer justify-items-start gap-2 text-sm font-medium">
                                        <span>Escolher foto (PNG ou JPG, até 5 MB)</span>
                                        <span className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#4e812f] bg-white px-4 font-semibold text-[#315f35] transition-colors hover:bg-[#edf5e9] focus-within:ring-2 focus-within:ring-[#4e812f]/30">
                                            <ImagePlus size={17} aria-hidden="true" />
                                            {photo ? photo.name : "Selecionar arquivo"}
                                        </span>
                                        <input
                                            aria-label="Escolher foto de perfil"
                                            className="sr-only"
                                            type="file"
                                            accept="image/png,image/jpeg"
                                            onChange={(event) => {
                                                const file = event.target.files?.[0] ?? null;
                                                if (
                                                    file &&
                                                    !["image/png", "image/jpeg"].includes(file.type)
                                                ) {
                                                    setAvatarError("Use uma imagem PNG ou JPG.");
                                                    setPhoto(null);
                                                    setPhotoPreview("");
                                                    return;
                                                }
                                                if (file && file.size > 5 * 1024 * 1024) {
                                                    setAvatarError("A foto deve ter até 5 MB.");
                                                    setPhoto(null);
                                                    setPhotoPreview("");
                                                    return;
                                                }
                                                setAvatarError("");
                                                setAvatarNotice("");
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
                                    {!user?.photo && !photoPreview && (
                                        <div className="grid gap-2">
                                            <span className="text-xs text-[#77717c]">
                                                Cor do avatar
                                            </span>
                                            <div
                                                className="flex flex-wrap gap-2"
                                                aria-label="Cor de fundo do avatar"
                                            >
                                                {avatarColors.map(({ value, label }) => (
                                                    <button
                                                        key={value}
                                                        type="button"
                                                        aria-label={label}
                                                        aria-pressed={
                                                            avatarBackgroundColor === value
                                                        }
                                                        disabled={savingAvatarColor}
                                                        onClick={() =>
                                                            void changeAvatarColor(value)
                                                        }
                                                        className="relative grid size-8 cursor-pointer place-items-center overflow-hidden rounded-full border border-[#d8d5dc] transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315f35] disabled:cursor-wait"
                                                    >
                                                        <UserAvatar
                                                            backgroundColor={value}
                                                            size="xs"
                                                            shape="circle"
                                                            showInitial={false}
                                                        />
                                                        {avatarBackgroundColor === value && (
                                                            <Check
                                                                size={15}
                                                                aria-hidden="true"
                                                                className="absolute z-10 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
                                                            />
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {avatarError && (
                                        <p role="alert" className="text-sm text-red-700">
                                            {avatarError}
                                        </p>
                                    )}
                                    {avatarNotice && (
                                        <p role="status" className="text-sm text-[#285a2e]">
                                            {avatarNotice}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </section>

                        <form
                            onSubmit={(event) => void saveProfile(event)}
                            className="grid gap-5 rounded-xl border border-[#dfd6e3] bg-[#fffaff] p-5"
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
                                    <div id="profile-password-fields" className="mt-4 grid gap-4">
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
                                            A senha atual é necessária para alterar o e-mail ou a
                                            senha.
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
    );
}

// Kept as a compatibility export for existing imports; the legacy route now
// redirects into Settings, so this component only renders the profile content.
export const ProfilePage = ProfileSettingsContent;
