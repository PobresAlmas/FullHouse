"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Residence } from "@/features/residences/api/residences.api";
import {
    getHouseRoomListings,
    getRoomInterests,
    permanentlyDeleteRoomListing,
    updateRoomInterest,
} from "../api/rooms.api";
import type { HouseRoomListing, RoomInterest } from "../api/rooms.api";
import { RoomListingCard } from "./RoomListingCard";
import { RoomListingDialog } from "./RoomListingDialog";
import { typeLabels } from "./RoomListingForm";

type View = "preview" | "edit" | "interests";
const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const interestStatus = { PENDENTE: "Pendente", ACEITO: "Aceito", RECUSADO: "Recusado" };

function message(error: unknown, fallback: string) {
    if (typeof error === "object" && error && "message" in error) {
        if (typeof error.message === "string") return error.message;
        if (Array.isArray(error.message)) return error.message.join(" ");
    }
    return fallback;
}

function ListingInterests({
    listingId,
    onDecision,
}: {
    listingId: string;
    onDecision: () => void;
}) {
    const [items, setItems] = useState<RoomInterest[] | null>(null);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [retry, setRetry] = useState(0);
    const [pending, setPending] = useState<string | null>(null);
    const deciding = useRef(false);

    useEffect(() => {
        let active = true;
        void getRoomInterests(listingId).then(
            (data) => {
                if (active) setItems(data);
            },
            (cause) => {
                if (active) setError(message(cause, "Não foi possível consultar os interessados."));
            }
        );
        return () => {
            active = false;
        };
    }, [listingId, retry]);

    async function decide(interest: RoomInterest, status: "ACEITO" | "RECUSADO") {
        if (deciding.current) return;
        deciding.current = true;
        setPending(interest.id);
        setError("");
        setNotice("");
        try {
            const result = await updateRoomInterest(listingId, interest.id, status);
            setItems(
                (current) =>
                    current?.map((item) =>
                        item.id === result.id
                            ? {
                                  ...item,
                                  status: result.status,
                                  negotiationId: result.negotiationId,
                              }
                            : item
                    ) ?? null
            );
            setNotice(
                status === "ACEITO"
                    ? "Interesse aceito. Abra a conversa para enviar o convite da casa."
                    : "Interesse recusado."
            );
            onDecision();
        } catch (cause) {
            setError(message(cause, "Não foi possível responder ao interesse."));
        } finally {
            deciding.current = false;
            setPending(null);
        }
    }

    return (
        <div className="space-y-3">
            {error && (
                <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
                    <p>{error}</p>
                    {!items && (
                        <button
                            type="button"
                            className="mt-2 underline"
                            onClick={() => {
                                setError("");
                                setRetry((value) => value + 1);
                            }}
                        >
                            Tentar novamente
                        </button>
                    )}
                </div>
            )}
            {notice && (
                <p role="status" className="text-sm text-[#315f35]">
                    {notice}
                </p>
            )}
            {!items && !error && (
                <p role="status" className="text-sm text-[#625c66]">
                    Carregando interessados…
                </p>
            )}
            {items?.length === 0 && (
                <p className="text-sm text-[#625c66]">Ainda não há interessados neste anúncio.</p>
            )}
            {items?.length ? (
                <ul className="grid gap-3">
                    {items.map((interest) => (
                        <li
                            key={interest.id}
                            className="min-w-0 space-y-2 rounded-lg border border-[#d9d0dc] bg-white p-3 text-sm"
                        >
                            <p className="wrap-anywhere font-semibold">{interest.usuario.nome}</p>
                            {interest.mensagem && (
                                <p className="wrap-anywhere whitespace-pre-wrap">
                                    {interest.mensagem}
                                </p>
                            )}
                            <p className="text-xs text-[#625c66]">
                                {interestStatus[interest.status]}
                            </p>
                            {interest.status === "PENDENTE" && (
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        type="button"
                                        disabled={pending !== null}
                                        onClick={() => void decide(interest, "ACEITO")}
                                    >
                                        Aceitar
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={pending !== null}
                                        onClick={() => void decide(interest, "RECUSADO")}
                                    >
                                        Recusar
                                    </Button>
                                </div>
                            )}
                            {interest.status === "ACEITO" && interest.negotiationId && (
                                <Link
                                    className="inline-block font-medium text-[#315f35] underline"
                                    href={`/rooms/negotiations/${interest.negotiationId}`}
                                >
                                    Abrir conversa
                                </Link>
                            )}
                        </li>
                    ))}
                </ul>
            ) : null}
        </div>
    );
}

function Preview({ listing }: { listing: HouseRoomListing }) {
    return (
        <div className="space-y-4 text-sm">
            {listing.fotos.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                    {listing.fotos.map((url, index) => (
                        <Image
                            key={url}
                            src={url}
                            alt={`Foto do quarto ${index + 1}`}
                            width={480}
                            height={320}
                            unoptimized
                            className="aspect-[3/2] w-full rounded-lg object-cover"
                        />
                    ))}
                </div>
            )}
            <p className="font-semibold text-[#315f35]">{currency.format(listing.preco)} / mês</p>
            <p className="wrap-anywhere whitespace-pre-wrap">
                {listing.descricao || "Sem descrição."}
            </p>
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 wrap-anywhere">
                <dt>Localização</dt>
                <dd>{[listing.bairro, listing.cidade].filter(Boolean).join(", ")}</dd>
                <dt>Tipo de moradia</dt>
                <dd>{typeLabels[listing.tipoMoradia]}</dd>
                <dt>Aceita pets</dt>
                <dd>{listing.aceitaPets ? "Sim" : "Não"}</dd>
                <dt>Endereço completo</dt>
                <dd>{(listing.exibeEnderecoCompleto && listing.enderecoCompleto) || "Oculto"}</dd>
                <dt>Contato</dt>
                <dd>{(listing.exibeContato && listing.contato) || "Oculto"}</dd>
            </dl>
            <div>
                <h4 className="font-semibold">Convivência</h4>
                <p className="wrap-anywhere whitespace-pre-wrap">
                    {listing.perfilConvivencia || "Não informada."}
                </p>
            </div>
        </div>
    );
}

export function HouseRoomListings({
    residence,
    refreshKey,
    requestedListingId,
    canUpload,
}: {
    residence: Residence;
    refreshKey: number;
    requestedListingId?: string;
    canUpload: boolean;
}) {
    const router = useRouter();
    const [listings, setListings] = useState<HouseRoomListing[] | null>(null);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [revision, setRevision] = useState(0);
    const [selection, setSelection] = useState<{ id: string; view: View } | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<HouseRoomListing | null>(null);
    const [deleteError, setDeleteError] = useState("");
    const [deleting, setDeleting] = useState(false);
    const [dismissed, setDismissed] = useState<string>();
    if (!requestedListingId && dismissed !== undefined) setDismissed(undefined);
    const trigger = useRef<HTMLElement>(null);
    const heading = useRef<HTMLHeadingElement>(null);
    const modalHeading = useRef<HTMLHeadingElement>(null);
    const notificationTarget = requestedListingId && requestedListingId !== dismissed;
    const target =
        selection ?? (notificationTarget ? { id: requestedListingId, view: "interests" } : null);
    const selected = listings?.find((listing) => listing.id === target?.id);
    const view = target?.view;
    const canOpen = selected && (view === "preview" || selected.canManage);

    useEffect(() => {
        let active = true;
        void getHouseRoomListings(residence.id).then(
            (data) => {
                if (active) {
                    setListings(data);
                    setError("");
                }
            },
            (cause) => {
                if (active) setError(message(cause, "Não foi possível carregar os anúncios."));
            }
        );
        return () => {
            active = false;
        };
    }, [residence.id, revision, refreshKey, requestedListingId]);

    function open(id: string, mode: View, button: HTMLElement) {
        trigger.current = button;
        setNotice("");
        setSelection({ id, view: mode });
    }

    function close() {
        setSelection(null);
        if (requestedListingId) {
            setDismissed(requestedListingId);
            router.replace("/settings?section=members#anuncios-da-casa", { scroll: false });
        }
    }

    function returnFocus() {
        return trigger.current?.isConnected ? trigger.current : heading.current;
    }

    function reload() {
        setError("");
        setRevision((current) => current + 1);
    }

    async function confirmDelete() {
        if (!deleteTarget || deleting) return;
        setDeleting(true);
        setDeleteError("");
        try {
            await permanentlyDeleteRoomListing(deleteTarget.id);
            setListings(
                (current) => current?.filter((listing) => listing.id !== deleteTarget.id) ?? null
            );
            setSelection((current) => (current?.id === deleteTarget.id ? null : current));
            setNotice(`Anúncio “${deleteTarget.titulo}” excluído.`);
            setDeleteTarget(null);
        } catch (cause) {
            setDeleteError(message(cause, "Não foi possível excluir o anúncio. Tente novamente."));
        } finally {
            setDeleting(false);
        }
    }

    return (
        <section
            id="anuncios-da-casa"
            aria-labelledby="house-listings-title"
            className="mt-4 rounded-xl border border-[#d9d0dc] bg-[#fffaff]"
        >
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#d9d0dc] px-4 py-3.5">
                <div>
                    <h2
                        id="house-listings-title"
                        ref={heading}
                        tabIndex={-1}
                        className="text-sm font-semibold"
                    >
                        Anúncios da casa
                    </h2>
                    <p className="mt-0.5 text-xs text-[#625c66]">
                        Consulte os quartos anunciados nesta residência.
                    </p>
                </div>
                <Button type="button" variant="outline" onClick={reload}>
                    Atualizar anúncios
                </Button>
            </header>
            {error && (
                <p role="alert" className="px-4 pt-3 text-sm text-red-800">
                    {error}
                </p>
            )}
            {notice && (
                <p role="status" className="px-4 pt-3 text-sm text-[#315f35]">
                    {notice}
                </p>
            )}
            {!listings && !error && (
                <p role="status" className="p-4 text-sm text-[#625c66]">
                    Carregando anúncios…
                </p>
            )}
            {listings && !canOpen && notificationTarget && !selection && (
                <p role="status" className="px-4 pt-3 text-sm text-[#625c66]">
                    O anúncio da notificação não está disponível para gestão nesta casa.
                </p>
            )}
            {listings?.length === 0 && (
                <p className="p-4 text-sm text-[#625c66]">
                    A casa ainda não tem anúncios de quartos.
                </p>
            )}
            {listings?.length ? (
                <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,16rem),1fr))] gap-4 p-4">
                    {listings.map((listing) => (
                        <li key={listing.id} className="min-w-0">
                            <RoomListingCard listing={listing}>
                                <p className="mb-2 wrap-anywhere text-xs text-[#625c66]">
                                    Anunciado por {listing.autorNome}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={(event) =>
                                            open(listing.id, "preview", event.currentTarget)
                                        }
                                    >
                                        Ver anúncio
                                    </Button>
                                    {listing.canManage && (
                                        <>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={(event) =>
                                                    open(listing.id, "edit", event.currentTarget)
                                                }
                                            >
                                                Editar
                                            </Button>
                                            <Button
                                                type="button"
                                                onClick={(event) =>
                                                    open(
                                                        listing.id,
                                                        "interests",
                                                        event.currentTarget
                                                    )
                                                }
                                            >
                                                Interessados
                                                {listing.pendingInterestCount
                                                    ? ` (${listing.pendingInterestCount})`
                                                    : ""}
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                aria-label={`Excluir anúncio ${listing.titulo}`}
                                                onClick={() => {
                                                    setDeleteError("");
                                                    setDeleteTarget(listing);
                                                }}
                                            >
                                                <Trash2 aria-hidden="true" />
                                                Excluir
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </RoomListingCard>
                        </li>
                    ))}
                </ul>
            ) : null}
            {canOpen && view === "edit" && (
                <RoomListingDialog
                    key={selected.id}
                    residence={residence}
                    editing={selected}
                    canUpload={canUpload}
                    onCancel={close}
                    returnFocus={returnFocus}
                    onPublished={() => {
                        close();
                        reload();
                        setNotice("Anúncio atualizado.");
                    }}
                />
            )}
            {canOpen && view !== "edit" && (
                <Dialog.Root
                    key={`${selected.id}:${view}`}
                    open
                    onOpenChange={(open) => {
                        if (!open) close();
                    }}
                >
                    <Dialog.Portal>
                        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40" />
                        <Dialog.Popup
                            initialFocus={modalHeading}
                            finalFocus={returnFocus}
                            className="fixed inset-x-3 top-1/2 z-50 mx-auto max-h-[calc(100dvh-1.5rem)] max-w-xl -translate-y-1/2 space-y-4 overflow-y-auto rounded-xl border border-[#d9d0dc] bg-[#fffaff] p-4 text-[#26232a] shadow-xl sm:p-5"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <Dialog.Title
                                    ref={modalHeading}
                                    tabIndex={-1}
                                    className="min-w-0 wrap-anywhere text-lg font-semibold"
                                >
                                    {view === "interests"
                                        ? "Pessoas interessadas"
                                        : selected.titulo}
                                </Dialog.Title>
                                <Dialog.Close render={<Button type="button" variant="outline" />}>
                                    Fechar
                                </Dialog.Close>
                            </div>
                            <Dialog.Description className="wrap-anywhere text-sm text-[#625c66]">
                                {view === "interests"
                                    ? selected.titulo
                                    : `Anunciado por ${selected.autorNome}`}
                            </Dialog.Description>
                            {view === "interests" ? (
                                <ListingInterests listingId={selected.id} onDecision={reload} />
                            ) : (
                                <Preview listing={selected} />
                            )}
                        </Dialog.Popup>
                    </Dialog.Portal>
                </Dialog.Root>
            )}
            <Dialog.Root
                open={deleteTarget !== null}
                onOpenChange={(open) => {
                    if (!open && !deleting) {
                        setDeleteTarget(null);
                        setDeleteError("");
                    }
                }}
            >
                <Dialog.Portal>
                    <Dialog.Backdrop className="fixed inset-0 z-[60] bg-black/45" />
                    <Dialog.Popup className="fixed left-1/2 top-1/2 z-[60] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[#e4dce6] bg-white p-5 text-[#29252d] shadow-xl sm:p-6">
                        <div className="mb-4 flex items-start gap-3">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-700">
                                <Trash2 size={19} aria-hidden="true" />
                            </span>
                            <div>
                                <Dialog.Title className="font-semibold">
                                    Excluir anúncio?
                                </Dialog.Title>
                                <Dialog.Description className="mt-1 text-sm leading-relaxed text-[#625c66]">
                                    {deleteTarget
                                        ? `“${deleteTarget.titulo}” será removido permanentemente, junto com o histórico de interesses e conversas. Convites pendentes desta vaga serão cancelados.`
                                        : "O anúncio será removido permanentemente."}
                                </Dialog.Description>
                            </div>
                        </div>
                        {deleteError && (
                            <p
                                role="alert"
                                className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800"
                            >
                                {deleteError}
                            </p>
                        )}
                        <div className="flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                disabled={deleting}
                                onClick={() => setDeleteTarget(null)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="button"
                                variant="destructive"
                                disabled={deleting}
                                onClick={() => void confirmDelete()}
                            >
                                {deleting ? "Excluindo…" : "Excluir anúncio"}
                            </Button>
                        </div>
                    </Dialog.Popup>
                </Dialog.Portal>
            </Dialog.Root>
        </section>
    );
}
