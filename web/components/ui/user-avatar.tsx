import type { CSSProperties } from "react";

export const avatarGradients: Record<string, string> = {
    "#e8f3e8": "linear-gradient(135deg, #7dcc45 0%, #347b2b 100%)",
    "#e8e4f4": "linear-gradient(135deg, #aa82df 0%, #563395 100%)",
    "#e2eff7": "linear-gradient(135deg, #54b9e8 0%, #294c92 100%)",
    "#f8eadb": "linear-gradient(135deg, #f4b75c 0%, #b76225 100%)",
    "#f5e1e7": "linear-gradient(135deg, #ec8eaf 0%, #a63868 100%)",
    "#ece9e2": "linear-gradient(135deg, #aaa49a 0%, #625e58 100%)",
};

export function getAvatarGradient(backgroundColor: string) {
    return avatarGradients[backgroundColor.toLowerCase()] ?? avatarGradients["#e8f3e8"];
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

    if (photo) {
        return (
            <img
                src={photo}
                alt={name ? `Foto de ${name}` : "Foto do perfil"}
                className={`${sizeClass} ${shapeClass} shrink-0 object-cover ${className}`}
            />
        );
    }

    const style = { background: getAvatarGradient(backgroundColor) } as CSSProperties;
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
