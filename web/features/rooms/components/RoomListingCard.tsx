import type { ReactNode } from "react";
import Image from "next/image";
import { BedDouble, MapPin, PawPrint } from "lucide-react";
import type { RoomListing } from "../api/rooms.api";
import { typeLabels } from "./RoomListingForm";

export function RoomListingCard({
    listing,
    children,
}: {
    listing: RoomListing;
    children: ReactNode;
}) {
    return (
        <article className="h-full min-w-0 overflow-hidden rounded-xl border border-[#d7d8de] bg-white shadow-sm">
            <div className="relative h-48 bg-gradient-to-br from-[#e4e2dc] to-[#c7ccc6]">
                {listing.fotos[0] ? (
                    <Image
                        src={listing.fotos[0]}
                        alt={`Foto do anúncio ${listing.titulo}`}
                        fill
                        unoptimized
                        className="object-cover"
                    />
                ) : (
                    <div className="grid h-full place-items-center text-[#788076]">
                        <BedDouble size={48} aria-hidden="true" />
                        <span className="sr-only">Anúncio sem foto</span>
                    </div>
                )}
                <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-sm font-semibold">
                    {listing.status === "ABERTO" ? "Disponível" : "Fechado"}
                </span>
            </div>
            <div className="p-4">
                <h3 className="wrap-anywhere font-bold">{listing.titulo}</h3>
                <p className="mt-2 flex items-center gap-1 text-xs text-[#77717c]">
                    <MapPin size={13} aria-hidden="true" className="shrink-0 text-red-500" />
                    {[listing.bairro, listing.cidade].filter(Boolean).join(", ")}
                </p>
                <p className="mt-3 text-xl font-bold text-[#315f35]">
                    R${" "}
                    {listing.preco.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                    })}
                    <span className="ml-1 text-xs font-normal text-[#77717c]">/mês</span>
                </p>
                <div className="my-3 flex flex-wrap gap-2">
                    {listing.aceitaPets && (
                        <span className="rounded bg-[#f0f1f3] px-2 py-1 text-xs">
                            <PawPrint size={12} className="mr-1 inline" />
                            Aceita Pets
                        </span>
                    )}
                    <span className="rounded bg-[#f0f1f3] px-2 py-1 text-xs">
                        {typeLabels[listing.tipoMoradia]}
                    </span>
                </div>
                {children}
            </div>
        </article>
    );
}
