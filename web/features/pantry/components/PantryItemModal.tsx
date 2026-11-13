import type { Dispatch, FormEvent, SetStateAction } from "react";
import { X } from "lucide-react";
import type { PantryCategory, PantryMember, PantryUnit } from "../api/pantry.api";
import {
    formatQuantity,
    unitLabels,
    type ItemFormState,
    type ItemModalState,
} from "../lib/pantry.utils";
import { FormField } from "./FormField";

export function PantryItemModal({
    itemModal,
    form,
    setForm,
    categories,
    members,
    busy,
    formError,
    onClose,
    onSubmit,
}: {
    itemModal: ItemModalState;
    form: ItemFormState;
    setForm: Dispatch<SetStateAction<ItemFormState>>;
    categories: PantryCategory[];
    members: PantryMember[];
    busy: boolean;
    formError: string;
    onClose: () => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
    return (
        <>
            {itemModal && (
                <div
                    className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) onClose();
                    }}
                >
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="pantry-item-title"
                        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#e1d9e5] bg-[#fffaff] p-5 shadow-xl"
                    >
                        <div className="mb-5 flex items-start justify-between gap-3">
                            <div>
                                <h2 id="pantry-item-title" className="text-lg font-bold">
                                    {itemModal.mode === "edit" ? "Editar item" : "Adicionar item"}
                                </h2>
                                <p className="mt-1 text-sm text-[#77717c]">
                                    Organize o estoque da sua casa.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => onClose()}
                                aria-label="Fechar"
                                className="grid size-9 place-items-center rounded-lg hover:bg-[#f1edf3]"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={(event) => onSubmit(event)} className="grid gap-4">
                            <FormField label="Nome do item">
                                <input
                                    autoFocus
                                    required
                                    maxLength={150}
                                    value={form.name}
                                    onChange={(event) =>
                                        setForm({ ...form, name: event.target.value })
                                    }
                                    className="h-10 rounded-lg border border-[#d9d1de] bg-white px-3 text-sm outline-none focus:border-[#4e812f]"
                                    placeholder="Ex.: Arroz"
                                />
                            </FormField>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <FormField label="Categoria">
                                    <select
                                        required
                                        value={form.categoryId}
                                        onChange={(event) =>
                                            setForm({ ...form, categoryId: event.target.value })
                                        }
                                        className="h-10 rounded-lg border border-[#d9d1de] bg-white px-3 text-sm outline-none focus:border-[#4e812f]"
                                    >
                                        <option value="">Selecione uma categoria</option>
                                        {categories.map((category) => (
                                            <option key={category.id} value={category.id}>
                                                {category.name}
                                            </option>
                                        ))}
                                    </select>
                                </FormField>
                                <fieldset className="grid gap-2 sm:col-span-2">
                                    <legend className="mb-2 text-xs font-medium">
                                        Tipo de item
                                    </legend>
                                    {(
                                        [
                                            [
                                                "COMUNITARIO",
                                                "Comunitário",
                                                "Disponível para todos os moradores da casa",
                                            ],
                                            [
                                                "PRIVADO",
                                                "Privado",
                                                "Apenas você pode ver e utilizar",
                                            ],
                                            [
                                                "DONO_ESPECIFICO",
                                                "Dono específico",
                                                "Pertence a um morador da casa",
                                            ],
                                        ] as const
                                    ).map(([value, label, description]) => (
                                        <label
                                            key={value}
                                            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${form.property === value ? "border-[#4e812f] bg-[#edf5e9]" : "border-[#e1d9e5] bg-white"}`}
                                        >
                                            <input
                                                type="radio"
                                                name="property"
                                                value={value}
                                                checked={form.property === value}
                                                onChange={() =>
                                                    setForm({ ...form, property: value })
                                                }
                                                className="mt-0.5 accent-[#4e812f]"
                                            />
                                            <span>
                                                <span className="block text-sm font-semibold">
                                                    {label}
                                                </span>
                                                <span className="block text-xs text-[#77717c]">
                                                    {description}
                                                </span>
                                            </span>
                                        </label>
                                    ))}
                                </fieldset>
                            </div>
                            {form.property === "DONO_ESPECIFICO" && (
                                <FormField label="Responsável">
                                    <select
                                        required
                                        value={form.ownerMemberId}
                                        onChange={(event) =>
                                            setForm({ ...form, ownerMemberId: event.target.value })
                                        }
                                        className="h-10 rounded-lg border border-[#d9d1de] bg-white px-3 text-sm outline-none focus:border-[#4e812f]"
                                    >
                                        {members.map((member) => (
                                            <option key={member.id} value={member.id}>
                                                {member.name}
                                            </option>
                                        ))}
                                    </select>
                                </FormField>
                            )}
                            <div className="grid gap-4 sm:grid-cols-2">
                                <FormField
                                    label={
                                        itemModal.mode === "edit"
                                            ? "Quantidade atual"
                                            : "Quantidade inicial"
                                    }
                                >
                                    <div className="flex gap-2">
                                        <input
                                            required={itemModal.mode === "create"}
                                            disabled={itemModal.mode === "edit"}
                                            inputMode="decimal"
                                            value={
                                                itemModal.mode === "edit"
                                                    ? formatQuantity(
                                                          Number(form.quantity),
                                                          form.unit
                                                      )
                                                    : form.quantity
                                            }
                                            onChange={(event) =>
                                                setForm({ ...form, quantity: event.target.value })
                                            }
                                            className="h-10 min-w-0 flex-1 rounded-lg border border-[#d9d1de] bg-white px-3 text-sm outline-none focus:border-[#4e812f] disabled:bg-[#f5f2f6]"
                                            placeholder="0"
                                        />
                                        <select
                                            value={form.unit}
                                            onChange={(event) =>
                                                setForm({
                                                    ...form,
                                                    unit: event.target.value as PantryUnit,
                                                })
                                            }
                                            className="h-10 rounded-lg border border-[#d9d1de] bg-white px-2 text-sm outline-none focus:border-[#4e812f]"
                                        >
                                            {Object.entries(unitLabels).map(([value, label]) => (
                                                <option key={value} value={value}>
                                                    {label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </FormField>
                                <FormField label="Quantidade mínima (opcional)">
                                    <input
                                        inputMode="decimal"
                                        value={form.minimumQuantity}
                                        onChange={(event) =>
                                            setForm({
                                                ...form,
                                                minimumQuantity: event.target.value,
                                            })
                                        }
                                        className="h-10 rounded-lg border border-[#d9d1de] bg-white px-3 text-sm outline-none focus:border-[#4e812f]"
                                        placeholder="Sem alerta"
                                    />
                                </FormField>
                            </div>
                            <FormField label="Validade (opcional)">
                                <input
                                    type="date"
                                    value={form.expirationDate}
                                    onChange={(event) =>
                                        setForm({ ...form, expirationDate: event.target.value })
                                    }
                                    className="h-10 rounded-lg border border-[#d9d1de] bg-white px-3 text-sm outline-none focus:border-[#4e812f]"
                                />
                            </FormField>
                            {formError && (
                                <p
                                    role="alert"
                                    className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
                                >
                                    {formError}
                                </p>
                            )}
                            <div className="mt-1 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => onClose()}
                                    className="h-10 rounded-lg border border-[#d9d1de] px-4 text-sm hover:bg-[#f6f2f7]"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={busy}
                                    className="h-10 rounded-lg bg-[#4e812f] px-5 text-sm font-medium text-white hover:bg-[#3f6c26] disabled:opacity-60"
                                >
                                    {busy ? "Salvando…" : "Salvar"}
                                </button>
                            </div>
                        </form>
                    </section>
                </div>
            )}
        </>
    );
}
