"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Residence } from "@/features/residences/api/residences.api";
import { isApiError } from "@/services/api-error.utils";
import {
    createRoomListing,
    updateRoomListing,
    uploadRoomPhoto,
    type RoomListing,
} from "../api/rooms.api";
import { readRoomListingInput, RoomListingFields } from "./RoomListingForm";
import { RoomListingPhotos, roomPhotoError, type RoomPhoto } from "./RoomListingPhotos";
import { RoomListingRules } from "./RoomListingRules";

type ListingResidence = Pick<Residence, "id" | "name" | "city" | "neighborhood">;

function errorMessage(error: unknown, fallback: string) {
    if (!isApiError(error)) return fallback;
    if (Array.isArray(error.message)) return error.message.join(" ");
    return error.message || fallback;
}

export function RoomListingDialog({
    residence,
    onCancel,
    onPublished,
    returnFocus,
    editing,
    canUpload = true,
}: {
    residence: ListingResidence;
    onCancel: () => void;
    onPublished: () => void;
    returnFocus: () => HTMLElement | null;
    editing?: RoomListing;
    canUpload?: boolean;
}) {
    const [photos, setPhotos] = useState<RoomPhoto[]>([]);
    const [storedPhotos, setStoredPhotos] = useState(editing?.fotos ?? []);
    const [progress, setProgress] = useState("");
    const [error, setError] = useState("");
    const titleRef = useRef<HTMLInputElement>(null);
    const active = useRef(false);
    const submitting = useRef(false);
    const nextPhotoId = useRef(0);
    const previews = useRef(new Set<string>());
    const busy = progress !== "";

    useLayoutEffect(() => {
        active.current = true;
        const urls = previews.current;
        return () => {
            active.current = false;
            for (const url of urls) URL.revokeObjectURL(url);
            urls.clear();
        };
    }, []);

    function addPhotos(files: File[]) {
        let count = storedPhotos.length + photos.filter((photo) => !photo.invalid).length;
        const additions = files.map((file): RoomPhoto => {
            const id = nextPhotoId.current++;
            const invalid = roomPhotoError(file, count);
            if (invalid) return { id, file, invalid };

            count += 1;
            const preview = URL.createObjectURL(file);
            previews.current.add(preview);
            return { id, file, preview };
        });
        setPhotos((current) => [...current, ...additions]);
    }

    function removePhoto(photo: RoomPhoto) {
        if (photo.preview) {
            URL.revokeObjectURL(photo.preview);
            previews.current.delete(photo.preview);
        }
        setPhotos((current) => current.filter((selected) => selected.id !== photo.id));
        setError("");
    }

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (submitting.current) return;
        const form = event.currentTarget;
        if (!form.reportValidity()) return;

        const { casaId, ...payload } = readRoomListingInput(new FormData(form), residence.id);
        const checks = [
            { name: "titulo", invalid: !payload.titulo, text: "Informe o título do anúncio." },
            {
                name: "descricao",
                invalid: !editing && !payload.descricao,
                text: "Descreva o quarto.",
            },
            { name: "cidade", invalid: !payload.cidade, text: "Informe a cidade." },
            {
                name: "contato",
                invalid:
                    (!editing || Boolean(editing.contato) || Boolean(payload.contato)) &&
                    payload.contato.length < 3,
                text: "Informe um contato válido.",
            },
            {
                name: "perfilConvivencia",
                invalid: !editing && !payload.perfilConvivencia,
                text: "Preencha e revise o perfil de convivência.",
            },
        ];
        const invalidField = checks.find((field) => field.invalid);
        if (invalidField) {
            setError(invalidField.text);
            const field = form.elements.namedItem(invalidField.name);
            if (field instanceof HTMLElement) field.focus();
            return;
        }
        if (photos.some((photo) => photo.invalid)) {
            setError("Remova os arquivos inválidos da seleção antes de publicar.");
            return;
        }

        submitting.current = true;
        setError("");
        const urls = [...storedPhotos];
        try {
            for (const [index, photo] of photos.entries()) {
                if (photo.url) {
                    urls.push(photo.url);
                    continue;
                }
                setProgress(`Enviando fotos (${index + 1}/${photos.length})…`);
                setPhotos((current) =>
                    current.map((item) =>
                        item.id === photo.id ? { ...item, uploadError: undefined } : item
                    )
                );
                let url: string;
                try {
                    url = await uploadRoomPhoto(casaId, photo.file);
                } catch (cause) {
                    if (!active.current) return;
                    const message = errorMessage(cause, "Não foi possível enviar a imagem.");
                    setPhotos((current) =>
                        current.map((item) =>
                            item.id === photo.id ? { ...item, uploadError: message } : item
                        )
                    );
                    setError(
                        `Falha ao enviar ${photo.file.name}. Revise a seleção ou tente publicar novamente.`
                    );
                    return;
                }
                if (!active.current) return;
                urls.push(url);
                setPhotos((current) =>
                    current.map((item) => (item.id === photo.id ? { ...item, url } : item))
                );
            }

            setProgress(editing ? "Salvando alterações…" : "Publicando anúncio…");
            if (editing) {
                await updateRoomListing(editing.id, {
                    ...payload,
                    contato: payload.contato || undefined,
                    fotos: urls,
                });
            } else {
                await createRoomListing({ casaId, ...payload, fotos: urls });
            }
            if (active.current) onPublished();
        } catch (cause) {
            if (active.current)
                setError(
                    errorMessage(cause, "Não foi possível salvar o anúncio. Tente novamente.")
                );
        } finally {
            submitting.current = false;
            if (active.current) setProgress("");
        }
    }

    return (
        <Dialog.Root
            open
            onOpenChange={(open, details) => {
                if (open) return;
                if (submitting.current) details.cancel();
                else onCancel();
            }}
        >
            <Dialog.Portal>
                <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40" />
                <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center p-3 sm:p-5">
                    <Dialog.Popup
                        initialFocus={titleRef}
                        finalFocus={returnFocus}
                        aria-modal="true"
                        className="pointer-events-auto flex max-h-[calc(100dvh-1.5rem)] w-full min-w-0 max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#d9d0dc] bg-[#fffaff] p-4 text-[#26232a] shadow-2xl sm:max-h-[calc(100dvh-2.5rem)] sm:p-6"
                    >
                        <div className="mb-3 flex shrink-0 flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                                <Dialog.Title className="text-xl font-bold">
                                    {editing ? "Editar anúncio" : "Anunciar quarto"}
                                </Dialog.Title>
                                <Dialog.Description className="wrap-anywhere text-sm text-[#625c66]">
                                    Casa: {residence.name}
                                </Dialog.Description>
                            </div>
                            <Dialog.Close
                                disabled={busy}
                                aria-label="Fechar formulário"
                                render={<Button type="button" variant="ghost" size="icon" />}
                            >
                                <X aria-hidden="true" />
                            </Dialog.Close>
                        </div>
                        <form className="flex min-h-0 flex-col gap-3" onSubmit={submit}>
                            <div className="-mx-1 min-h-0 overflow-y-auto overscroll-contain px-1 py-1">
                                <fieldset
                                    disabled={busy}
                                    className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2"
                                >
                                    <RoomListingFields
                                        residence={residence}
                                        requireDescription={!editing}
                                        allowEmptyContact={Boolean(editing && !editing.contato)}
                                        editing={editing}
                                        titleRef={titleRef}
                                    />
                                    <p className="text-xs text-[#625c66] md:col-span-2">
                                        O endereço completo e o contato ficam ocultos enquanto suas
                                        opções de exibição estiverem desmarcadas.
                                    </p>
                                    <RoomListingPhotos
                                        photos={photos}
                                        onAdd={addPhotos}
                                        onRemove={removePhoto}
                                        storedPhotos={storedPhotos}
                                        onRemoveStored={(url) =>
                                            setStoredPhotos((current) =>
                                                current.filter((photo) => photo !== url)
                                            )
                                        }
                                        canUpload={canUpload}
                                    />
                                    <RoomListingRules
                                        residenceId={residence.id}
                                        initialProfile={editing?.perfilConvivencia ?? ""}
                                        initialAcceptsPets={editing?.aceitaPets}
                                        required={!editing}
                                    />
                                </fieldset>
                            </div>
                            {error && (
                                <p
                                    role="alert"
                                    className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                                >
                                    {error}
                                </p>
                            )}
                            {progress && (
                                <p role="status" className="text-sm text-[#625c66]">
                                    {progress}
                                </p>
                            )}
                            <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-[#d9d0dc] pt-3">
                                <Dialog.Close
                                    disabled={busy}
                                    render={<Button type="button" variant="outline" />}
                                >
                                    Cancelar
                                </Dialog.Close>
                                <Button type="submit" disabled={busy}>
                                    {editing ? "Salvar alterações" : "Publicar anúncio"}
                                </Button>
                            </div>
                        </form>
                    </Dialog.Popup>
                </div>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
