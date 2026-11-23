"use client";

import type { RefObject } from "react";
import { SystemSelect } from "@/components/ui/system-select";
import type { Residence } from "@/features/residences/api/residences.api";
import type { RoomListing, RoomListingInput, RoomType } from "../api/rooms.api";

export const typeLabels: Record<RoomType, string> = {
    QUARTO_INDIVIDUAL: "Quarto individual",
    VAGA_COMPARTILHADA: "Vaga compartilhada",
    REPUBLICA: "República",
};
export const roomListingInputClass =
    "min-h-11 w-full rounded-lg border border-[#d8d5dc] bg-white px-3 text-sm outline-none focus:border-[#4e812f] focus:ring-2 focus:ring-[#4e812f]/20";

function formatBrazilianMobilePhone(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits ? `(${digits}` : "";

    const areaCode = digits.slice(0, 2);
    const number = digits.slice(2);
    if (number.length <= 5) return `(${areaCode}) ${number}`;
    return `(${areaCode}) ${number.slice(0, 5)}-${number.slice(5)}`;
}

export function readRoomListingInput(
    form: FormData,
    residenceId: string,
    fotos: string[] = []
): RoomListingInput {
    return {
        casaId: residenceId,
        titulo: String(form.get("titulo") ?? "").trim(),
        descricao: String(form.get("descricao") ?? "").trim(),
        preco: Number(form.get("preco")),
        cidade: String(form.get("cidade") ?? "").trim(),
        bairro: String(form.get("bairro") ?? "").trim(),
        enderecoCompleto: String(form.get("enderecoCompleto") ?? "").trim(),
        exibeEnderecoCompleto: form.get("exibeEnderecoCompleto") === "on",
        contato: String(form.get("contato") ?? "").trim(),
        exibeContato: form.get("exibeContato") === "on",
        perfilConvivencia: String(form.get("perfilConvivencia") ?? "").trim(),
        tipoMoradia: String(form.get("tipoMoradia") ?? "QUARTO_INDIVIDUAL") as RoomType,
        aceitaPets: ["on", "sim"].includes(String(form.get("aceitaPets"))),
        fotos,
    };
}

export function RoomListingFields({
    residence,
    editing,
    requireDescription = false,
    allowEmptyContact = false,
    titleRef,
}: {
    residence?: Pick<Residence, "city" | "neighborhood"> | null;
    editing?: RoomListing | null;
    requireDescription?: boolean;
    allowEmptyContact?: boolean;
    titleRef?: RefObject<HTMLInputElement | null>;
}) {
    const inputClass = roomListingInputClass;
    return (
        <>
            <label className="text-sm">
                Título
                <input
                    name="titulo"
                    required
                    maxLength={150}
                    defaultValue={editing?.titulo ?? ""}
                    ref={titleRef}
                    autoFocus={!requireDescription}
                    className={`${inputClass} mt-1`}
                />
            </label>
            <label className="text-sm">
                Preço mensal (R$)
                <input
                    name="preco"
                    type="number"
                    min="0.01"
                    step="0.01"
                    max={requireDescription ? 99999999.99 : undefined}
                    required
                    defaultValue={editing?.preco ?? ""}
                    className={`${inputClass} mt-1`}
                />
            </label>
            <label className="text-sm">
                Cidade
                <input
                    name="cidade"
                    required
                    maxLength={100}
                    defaultValue={editing?.cidade ?? residence?.city ?? ""}
                    className={`${inputClass} mt-1`}
                />
            </label>
            <label className="text-sm">
                Bairro
                <input
                    name="bairro"
                    maxLength={100}
                    defaultValue={editing?.bairro ?? residence?.neighborhood ?? ""}
                    className={`${inputClass} mt-1`}
                />
            </label>
            <label className="text-sm md:col-span-2">
                Descrição
                <textarea
                    name="descricao"
                    maxLength={5000}
                    rows={3}
                    required={requireDescription}
                    defaultValue={editing?.descricao ?? ""}
                    className={`${inputClass} mt-1 h-auto py-2`}
                />
            </label>
            <label className="text-sm">
                Tipo
                <SystemSelect
                    name="tipoMoradia"
                    defaultValue={editing?.tipoMoradia ?? "QUARTO_INDIVIDUAL"}
                    className={`${inputClass} mt-1`}
                >
                    {Object.entries(typeLabels).map(([key, value]) => (
                        <option key={key} value={key}>
                            {value}
                        </option>
                    ))}
                </SystemSelect>
            </label>
            <label className="text-sm">
                Contato
                <input
                    name="contato"
                    required={!allowEmptyContact}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="(99) 99999-9999"
                    minLength={requireDescription ? 3 : undefined}
                    maxLength={16}
                    defaultValue={editing?.contato ?? ""}
                    onChange={(event) => {
                        event.currentTarget.value = formatBrazilianMobilePhone(
                            event.currentTarget.value
                        );
                    }}
                    className={`${inputClass} mt-1`}
                />
            </label>
            <label className="text-sm md:col-span-2">
                Endereço completo
                <input
                    name="enderecoCompleto"
                    maxLength={255}
                    defaultValue={editing?.enderecoCompleto ?? ""}
                    className={`${inputClass} mt-1`}
                />
            </label>
            <label className="flex items-start gap-2 text-sm">
                <input
                    name="exibeEnderecoCompleto"
                    type="checkbox"
                    defaultChecked={editing?.exibeEnderecoCompleto ?? false}
                    className="mt-1"
                />{" "}
                Exibir endereço completo publicamente
            </label>
            <label className="flex items-start gap-2 text-sm">
                <input
                    name="exibeContato"
                    type="checkbox"
                    defaultChecked={editing?.exibeContato ?? false}
                    className="mt-1"
                />{" "}
                Exibir contato publicamente
            </label>
        </>
    );
}
