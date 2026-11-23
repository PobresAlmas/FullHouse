import type { FormEvent } from "react";
import { X } from "lucide-react";
import {
    formatQuantity,
    pantryQuantityStep,
    pantryUnitRequiresInteger,
    unitLabels,
    type MovementModalState,
} from "../lib/pantry.utils";
import { FormField } from "./FormField";

export function PantryMovementModal({
    movementModal,
    busy,
    movementQuantity,
    setMovementQuantity,
    movementError,
    setMovementError,
    onClose,
    onSubmit,
}: {
    movementModal: MovementModalState;
    busy: boolean;
    movementQuantity: string;
    setMovementQuantity: (value: string) => void;
    movementError: string;
    setMovementError: (value: string) => void;
    onClose: () => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
    return (
        <>
            {movementModal && (
                <div
                    className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget && !busy) onClose();
                    }}
                >
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="pantry-movement-title"
                        className="w-full max-w-md rounded-2xl border border-[#e1d9e5] bg-[#fffaff] p-5 shadow-xl"
                    >
                        <div className="mb-5 flex items-start justify-between gap-3">
                            <div>
                                <h2 id="pantry-movement-title" className="text-lg font-bold">
                                    {movementModal.type === "ENTRADA"
                                        ? "Adicionar ao estoque"
                                        : "Registrar consumo"}
                                </h2>
                                <p className="mt-1 text-sm text-[#77717c]">
                                    {movementModal.item.name} · estoque atual:{" "}
                                    {formatQuantity(
                                        movementModal.item.quantity,
                                        movementModal.item.unit
                                    )}
                                </p>
                            </div>
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => onClose()}
                                aria-label="Fechar"
                                className="grid size-9 place-items-center rounded-lg hover:bg-[#f1edf3] disabled:opacity-50"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <form
                            noValidate
                            onSubmit={(event) => onSubmit(event)}
                            className="grid gap-4"
                        >
                            <FormField
                                label={`Quantidade (${unitLabels[movementModal.item.unit]})`}
                            >
                                <input
                                    autoFocus
                                    required
                                    type="number"
                                    min={
                                        pantryUnitRequiresInteger(movementModal.item.unit)
                                            ? "1"
                                            : "0.1"
                                    }
                                    step={pantryQuantityStep(movementModal.item.unit)}
                                    value={movementQuantity}
                                    onChange={(event) => {
                                        setMovementQuantity(event.target.value);
                                        setMovementError("");
                                    }}
                                    aria-describedby="pantry-movement-help"
                                    className="h-10 w-full rounded-lg border border-[#d9d1de] bg-white px-3 text-sm outline-none focus:border-[#4e812f]"
                                    placeholder={
                                        pantryUnitRequiresInteger(movementModal.item.unit)
                                            ? "Ex.: 1"
                                            : "Ex.: 0,5"
                                    }
                                />
                                <span
                                    id="pantry-movement-help"
                                    className="mt-1 block text-xs text-[#77717c]"
                                >
                                    {pantryUnitRequiresInteger(movementModal.item.unit)
                                        ? "Informe um número inteiro."
                                        : "Use frações em passos de 0,1."}
                                </span>
                            </FormField>
                            {movementError && (
                                <p
                                    role="alert"
                                    className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
                                >
                                    {movementError}
                                </p>
                            )}
                            <div className="mt-1 flex justify-end gap-2">
                                <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => onClose()}
                                    className="h-10 rounded-lg border border-[#d9d1de] px-4 text-sm hover:bg-[#f6f2f7] disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={busy}
                                    className="h-10 rounded-lg bg-[#4e812f] px-5 text-sm font-medium text-white hover:bg-[#3f6c26] disabled:opacity-60"
                                >
                                    {busy ? "Salvando…" : "Confirmar"}
                                </button>
                            </div>
                        </form>
                    </section>
                </div>
            )}
        </>
    );
}
