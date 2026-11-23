"use client";

import { useId } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export const maxRoomPhotos = 8;
const roomPhotoTypes = ["image/jpeg", "image/png", "image/webp"];
const maxRoomPhotoSize = 8 * 1024 * 1024;

export type RoomPhoto = {
    id: number;
    file: File;
    preview?: string;
    invalid?: string;
    url?: string;
    uploadError?: string;
};

export function roomPhotoError(file: File, selectedCount: number) {
    if (!roomPhotoTypes.includes(file.type)) return "Selecione uma imagem JPEG, PNG ou WebP.";
    if (file.size === 0) return "O arquivo está vazio.";
    if (file.size > maxRoomPhotoSize) return "A imagem deve ter até 8 MiB.";
    if (selectedCount >= maxRoomPhotos) return "O anúncio permite até oito fotos.";
}

export function RoomListingPhotos({
    photos,
    onAdd,
    onRemove,
    storedPhotos = [],
    onRemoveStored,
    canUpload = true,
}: {
    photos: RoomPhoto[];
    onAdd: (files: File[]) => void;
    onRemove: (photo: RoomPhoto) => void;
    storedPhotos?: string[];
    onRemoveStored?: (url: string) => void;
    canUpload?: boolean;
}) {
    const pickerId = useId();
    const helpId = useId();
    const validCount = storedPhotos.length + photos.filter((photo) => !photo.invalid).length;

    return (
        <section className="min-w-0 space-y-2 rounded-xl border border-[#d9d0dc] p-4 md:col-span-2">
            <h3 className="text-sm font-semibold">Fotos do quarto</h3>
            {canUpload ? (
                <>
                    <input
                        id={pickerId}
                        type="file"
                        multiple
                        accept={roomPhotoTypes.join(",")}
                        aria-label="Selecionar fotos do quarto"
                        aria-describedby={helpId}
                        className="peer sr-only"
                        onChange={(event) => {
                            const input = event.currentTarget;
                            onAdd(Array.from(input.files ?? []));
                            input.value = "";
                        }}
                    />
                    <label
                        htmlFor={pickerId}
                        className="inline-flex min-h-9 cursor-pointer items-center rounded-lg border border-[#d8d5dc] bg-white px-3 text-sm font-medium peer-focus-visible:outline-2 peer-focus-visible:outline-[#4e812f] peer-disabled:cursor-not-allowed peer-disabled:opacity-50 hover:bg-[#f4eff6]"
                    >
                        Selecionar fotos
                    </label>
                </>
            ) : (
                <p className="text-xs text-[#625c66]">
                    Líderes e administradores podem adicionar novas fotos.
                </p>
            )}
            <div className="flex flex-wrap justify-between gap-2 text-xs text-[#625c66]">
                {canUpload && <p id={helpId}>Opcional. JPEG, PNG ou WebP, até 8 MiB por foto.</p>}
                <p role="status">
                    {validCount}/{maxRoomPhotos} fotos
                </p>
            </div>
            {(photos.length > 0 || storedPhotos.length > 0) && (
                <ul aria-label="Arquivos selecionados" className="grid gap-2 sm:grid-cols-2">
                    {storedPhotos.map((url, index) => (
                        <li
                            key={url}
                            className="flex min-w-0 items-center gap-2 rounded-lg bg-[#f4eff6] p-2"
                        >
                            <Image
                                src={url}
                                alt={`Foto atual ${index + 1}`}
                                width={64}
                                height={64}
                                unoptimized
                                className="size-16 shrink-0 rounded-md object-cover"
                            />
                            <span className="flex-1 text-xs">Foto atual {index + 1}</span>
                            <Button
                                type="button"
                                size="xs"
                                variant="outline"
                                aria-label={`Remover foto atual ${index + 1}`}
                                onClick={() => onRemoveStored?.(url)}
                            >
                                Remover
                            </Button>
                        </li>
                    ))}
                    {photos.map((photo) => (
                        <li
                            key={photo.id}
                            className="flex min-w-0 flex-wrap items-start gap-2 rounded-lg bg-[#f4eff6] p-2"
                        >
                            {photo.preview && (
                                <Image
                                    src={photo.preview}
                                    alt=""
                                    width={64}
                                    height={64}
                                    className="size-16 shrink-0 rounded-md object-cover"
                                />
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="wrap-anywhere text-xs font-medium">
                                    {photo.file.name}
                                </p>
                                {(photo.invalid || photo.uploadError) && (
                                    <p role="alert" className="mt-1 text-xs text-red-800">
                                        {photo.invalid || photo.uploadError}
                                    </p>
                                )}
                            </div>
                            <Button
                                type="button"
                                size="xs"
                                variant="outline"
                                aria-label={`Remover ${photo.file.name}`}
                                onClick={() => onRemove(photo)}
                            >
                                Remover
                            </Button>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
