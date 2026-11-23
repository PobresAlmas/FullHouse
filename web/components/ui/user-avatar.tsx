"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import Image from "next/image";

export const avatarGradients: Record<string, string> = {
    "#e8f3e8": "linear-gradient(135deg, #3d7628 0%, #285a27 100%)",
    "#e8e4f4": "linear-gradient(135deg, #7850ab 0%, #52318d 100%)",
    "#e2eff7": "linear-gradient(135deg, #256fa3 0%, #294c92 100%)",
    "#f8eadb": "linear-gradient(135deg, #a45618 0%, #793c17 100%)",
    "#f5e1e7": "linear-gradient(135deg, #a83e72 0%, #80274e 100%)",
    "#ece9e2": "linear-gradient(135deg, #716756 0%, #514a40 100%)",
};

export function getAvatarGradient(backgroundColor: string) {
    const color = backgroundColor.toLowerCase();
    const preset = avatarGradients[color];
    if (preset) return preset;
    if (!/^#[0-9a-f]{6}$/.test(color)) return avatarGradients["#e8f3e8"];
    return `linear-gradient(135deg, color-mix(in srgb, ${color} 40%, #17121e), color-mix(in srgb, ${color} 30%, #17121e))`;
}

export function UserAvatar({
    name,
    photo,
    backgroundColor = "#e8f3e8",
    size = "sm",
    shape,
    showInitial = true,
    className = "",
}: {
    name?: string | null;
    photo?: string | null;
    backgroundColor?: string;
    size?: "xs" | "sm" | "md" | "lg";
    shape?: "circle" | "rounded";
    showInitial?: boolean;
    className?: string;
}) {
    const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
    const initial = name?.trim().charAt(0).toLocaleUpperCase("pt-BR") || "?";
    const sizeClass =
        size === "lg"
            ? "size-24 text-3xl"
            : size === "md"
              ? "size-12 text-lg"
              : size === "xs"
                ? "size-8 text-xs"
                : "size-10 text-sm";
    const shapeClass =
        shape === "circle" || (!shape && size === "lg") ? "rounded-full" : "rounded-xl";
    const pixelSize = size === "lg" ? 96 : size === "md" ? 48 : size === "xs" ? 32 : 40;

    if (photo && photo !== failedPhoto) {
        return (
            <Image
                src={photo}
                alt={name ? `Foto de ${name}` : "Foto do perfil"}
                width={pixelSize}
                height={pixelSize}
                unoptimized
                onError={() => setFailedPhoto(photo)}
                className={`${sizeClass} ${shapeClass} shrink-0 object-cover ${className}`}
            />
        );
    }

    const style: CSSProperties = { background: getAvatarGradient(backgroundColor) };
    return (
        <span
            aria-hidden="true"
            style={style}
            className={`grid ${sizeClass} ${shapeClass} shrink-0 place-items-center font-semibold text-white ${className}`}
        >
            {showInitial ? initial : null}
        </span>
    );
}
