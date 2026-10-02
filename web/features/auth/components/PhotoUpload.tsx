"use client";

import { Camera } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

interface PhotoUploadProps {
    onChange?: (file: File | null) => void;
}

export default function PhotoUpload({ onChange }: PhotoUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    const [preview, setPreview] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const MAX_SIZE = 5 * 1024 * 1024;
    const ALLOWED_TYPES = ["image/png", "image/jpeg"];

    useEffect(() => {
        return () => {
            if (preview) URL.revokeObjectURL(preview);
        };
    }, [preview]);

    function handleFile(file: File) {
        setError(null);

        if (!ALLOWED_TYPES.includes(file.type)) {
            setPreview(null);
            setError("Formato inválido. Use PNG ou JPG");
            onChange?.(null);
            return;
        }

        if (file.size > MAX_SIZE) {
            setPreview(null);
            setError("A imagem deve ter no mínimo 5 MB");
            onChange?.(null);
            return;
        }

        setPreview(URL.createObjectURL(file));
        onChange?.(file);
    }

    return (
        <div className="flex flex-col items-center gap-2">
            <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="w-35 h-35 rounded-full bg-success-light flex flex-col gap-2 items-center justify-center overflow-hidden cursor-pointer"
            >
                {preview ? (
                    <Image
                        src={preview}
                        alt="Preview da foto"
                        width={96}
                        height={96}
                        unoptimized
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <>
                        <Camera className="text-primary" size={32} />
                        <span className="text-sm text-secondary">Selecionar foto</span>
                    </>
                )}
            </button>

            <span className="text-xs text-gray text-center">
                PNG, JPG ou JPEG <br />
                Máx. 5 MB
            </span>

            {error && <span className="text-xs text-destructive text-center">{error}</span>}

            <input
                ref={inputRef}
                type="file"
                accept="image/png,image/jpeg"
                hidden
                onChange={(e) => {
                    const file = e.target.files?.[0];

                    if (file) handleFile(file);
                }}
            />
        </div>
    );
}
