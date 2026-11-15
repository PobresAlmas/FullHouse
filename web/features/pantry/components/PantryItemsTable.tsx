import { Minus, Package, Pencil, Plus, Trash2, UsersRound } from "lucide-react";
import type { PantryItem, PantryMovementType } from "../api/pantry.api";
import {
    dateToString,
    formatQuantity,
    isExpiringSoon,
    itemIsLow,
    localDateString,
} from "../lib/pantry.utils";

type PantryItemsTableProps = {
    items: PantryItem[];
    totalItems: number;
    loading: boolean;
    busy: boolean;
    canManageHouse: boolean;
    onMovement: (item: PantryItem, type: PantryMovementType) => void;
    onEdit: (item: PantryItem) => void;
    onRemove: (item: PantryItem) => void;
};

export function PantryItemsTable({
    items,
    totalItems,
    loading,
    busy,
    canManageHouse,
    onMovement,
    onEdit,
    onRemove,
}: PantryItemsTableProps) {
    return (
        <>
            <div className="overflow-x-auto">
                <table className="w-full min-w-[790px] border-collapse text-left text-sm">
                    <thead className="bg-[#fcfaff] text-xs text-[#6e6872]">
                        <tr className="border-b border-[#e2dbe5]">
                            <th scope="col" className="px-2 py-3 font-medium">
                                Item
                            </th>
                            <th scope="col" className="px-2 py-3 font-medium">
                                Categoria
                            </th>
                            <th scope="col" className="px-2 py-3 font-medium">
                                Tipo
                            </th>
                            <th scope="col" className="px-2 py-3 font-medium">
                                Responsável
                            </th>
                            <th scope="col" className="px-2 py-3 font-semibold text-[#29252d]">
                                Quantidade
                            </th>
                            <th scope="col" className="px-2 py-3 font-medium">
                                Validade
                            </th>
                            <th scope="col" className="w-24 px-2 py-3">
                                <span className="sr-only">Gerenciar</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td
                                    colSpan={7}
                                    className="px-5 py-12 text-center text-sm text-[#77717c]"
                                >
                                    Carregando itens da despensa…
                                </td>
                            </tr>
                        ) : items.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-5 py-12 text-center">
                                    <Package className="mx-auto mb-2 text-[#8b858e]" size={28} />
                                    <p className="font-medium">
                                        {totalItems
                                            ? "Nenhum item corresponde aos filtros."
                                            : "Sua despensa ainda está vazia."}
                                    </p>
                                    {totalItems === 0 && (
                                        <p className="mt-1 text-sm text-[#77717c]">
                                            Adicione o primeiro item para começar a organizar o
                                            estoque.
                                        </p>
                                    )}
                                </td>
                            </tr>
                        ) : (
                            items.map((item) => (
                                <tr
                                    key={item.id}
                                    className="border-b border-[#e7e0e9] last:border-b-0 hover:bg-[#fdfbfe]"
                                >
                                    <td className="px-2 py-3 font-semibold">{item.name}</td>
                                    <td className="px-2 py-3 text-[#6e6872]">{item.category}</td>
                                    <td className="px-2 py-3">
                                        <span
                                            className={`rounded-full px-2 py-1 text-[11px] ${item.property === "COMUNITARIO" ? "bg-[#e7f0e9] text-[#46754e]" : item.property === "PRIVADO" ? "bg-[#e2effb] text-[#3478ad]" : "bg-[#f3e9d5] text-[#8a6324]"}`}
                                        >
                                            {item.property === "COMUNITARIO"
                                                ? "Comunitário"
                                                : item.property === "PRIVADO"
                                                  ? "Privado"
                                                  : "Dono específico"}
                                        </span>
                                    </td>
                                    <td className="px-2 py-3 text-[#6e6872]">
                                        <span className="inline-flex items-center gap-2">
                                            {item.property === "COMUNITARIO" ? (
                                                <UsersRound size={17} className="text-[#514c56]" />
                                            ) : (
                                                <span className="grid size-5 place-items-center rounded bg-[#86b89b] text-[10px] font-bold text-white">
                                                    {item.ownerName.slice(0, 1).toUpperCase()}
                                                </span>
                                            )}
                                            {item.ownerName}
                                        </span>
                                    </td>
                                    <td className="px-2 py-3">
                                        <span
                                            className={
                                                itemIsLow(item)
                                                    ? "font-semibold text-amber-700"
                                                    : "text-[#6e6872]"
                                            }
                                        >
                                            {formatQuantity(item.quantity, item.unit)}
                                        </span>
                                        {itemIsLow(item) && (
                                            <span className="ml-2 rounded-full bg-amber-50 px-2 py-1 text-[10px] text-amber-700">
                                                Estoque baixo
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-2 py-3 text-xs">
                                        <span
                                            className={
                                                item.expirationDate &&
                                                (item.expirationDate < localDateString() ||
                                                    isExpiringSoon(item.expirationDate))
                                                    ? "font-medium text-amber-700"
                                                    : "text-[#6e6872]"
                                            }
                                        >
                                            {dateToString(item.expirationDate)}
                                        </span>
                                    </td>
                                    <td className="px-2 py-2">
                                        <div className="flex items-center justify-end gap-1">
                                            {item.property === "COMUNITARIO" || item.isMine ? (
                                                <button
                                                    type="button"
                                                    disabled={busy}
                                                    onClick={() => onMovement(item, "CONSUMO")}
                                                    aria-label={`Registrar consumo de ${item.name}`}
                                                    className="grid size-8 place-items-center rounded-md text-[#625c66] hover:bg-[#f1edf3] disabled:opacity-40"
                                                >
                                                    <Minus size={15} />
                                                </button>
                                            ) : null}
                                            {item.property === "COMUNITARIO" || item.isMine ? (
                                                <button
                                                    type="button"
                                                    disabled={busy}
                                                    onClick={() => onMovement(item, "ENTRADA")}
                                                    aria-label={`Registrar entrada para ${item.name}`}
                                                    className="grid size-8 place-items-center rounded-md text-[#4e812f] hover:bg-[#e7f0e9] disabled:opacity-40"
                                                >
                                                    <Plus size={15} />
                                                </button>
                                            ) : null}
                                            {item.property === "COMUNITARIO" ||
                                            item.isMine ||
                                            canManageHouse ? (
                                                <button
                                                    type="button"
                                                    disabled={busy}
                                                    onClick={() => onEdit(item)}
                                                    aria-label={`Editar ${item.name}`}
                                                    className="grid size-8 place-items-center rounded-md text-[#625c66] hover:bg-[#f1edf3] disabled:opacity-40"
                                                >
                                                    <Pencil size={15} />
                                                </button>
                                            ) : null}
                                            {item.property === "COMUNITARIO" ||
                                            item.isMine ||
                                            canManageHouse ? (
                                                <button
                                                    type="button"
                                                    disabled={busy}
                                                    onClick={() => void onRemove(item)}
                                                    aria-label={`Excluir ${item.name}`}
                                                    className="grid size-8 place-items-center rounded-md text-[#9a5555] hover:bg-red-50 disabled:opacity-40"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            ) : null}
                                            {item.property === "DONO_ESPECIFICO" &&
                                                !item.isMine &&
                                                !canManageHouse && (
                                                    <span className="px-1 text-[10px] text-[#77717c]">
                                                        Somente responsável
                                                    </span>
                                                )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            <footer className="border-t border-[#e2dbe5] px-4 py-3 text-xs text-[#77717c]">
                {items.length} {items.length === 1 ? "item" : "itens"}
            </footer>
        </>
    );
}
