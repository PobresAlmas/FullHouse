import type { FormEvent } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import type { PantryCategory } from "../api/pantry.api";
import { FormField } from "./FormField";

export function PantryCategoryModal({
    categoryModalOpen,
    categories,
    canManageCategories,
    busy,
    categoryDraft,
    setCategoryDraft,
    editingCategoryId,
    categoryError,
    onClose,
    onSave,
    onEdit,
    onRemove,
    onCancelEdit,
}: {
    categoryModalOpen: boolean;
    categories: PantryCategory[];
    canManageCategories: boolean;
    busy: boolean;
    categoryDraft: string;
    setCategoryDraft: (value: string) => void;
    editingCategoryId: string | null;
    categoryError: string;
    onClose: () => void;
    onSave: (event: FormEvent<HTMLFormElement>) => void;
    onEdit: (category: PantryCategory) => void;
    onRemove: (category: PantryCategory) => void;
    onCancelEdit: () => void;
}) {
    return (
        <>
            {categoryModalOpen && (
                <div
                    className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget && !busy) onClose();
                    }}
                >
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="pantry-categories-title"
                        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#e1d9e5] bg-[#fffaff] p-5 shadow-xl"
                    >
                        <div className="mb-5 flex items-start justify-between gap-3">
                            <div>
                                <h2 id="pantry-categories-title" className="text-lg font-bold">
                                    Categorias da despensa
                                </h2>
                                <p className="mt-1 text-sm text-[#77717c]">
                                    Os itens existentes acompanham as alterações de nome.
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
                        {canManageCategories ? (
                            <form onSubmit={(event) => onSave(event)} className="mb-4 grid gap-3">
                                <FormField
                                    label={
                                        editingCategoryId ? "Renomear categoria" : "Nova categoria"
                                    }
                                >
                                    <input
                                        autoFocus
                                        required
                                        maxLength={80}
                                        value={categoryDraft}
                                        onChange={(event) => setCategoryDraft(event.target.value)}
                                        className="h-10 rounded-lg border border-[#d9d1de] bg-white px-3 text-sm outline-none focus:border-[#4e812f]"
                                        placeholder="Ex.: Temperos"
                                    />
                                </FormField>
                                {categoryError && (
                                    <p
                                        role="alert"
                                        className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
                                    >
                                        {categoryError}
                                    </p>
                                )}
                                <div className="flex justify-end gap-2">
                                    {editingCategoryId && (
                                        <button
                                            type="button"
                                            disabled={busy}
                                            onClick={() => {
                                                onCancelEdit();
                                            }}
                                            className="h-9 rounded-lg border border-[#d9d1de] px-3 text-sm"
                                        >
                                            Cancelar edição
                                        </button>
                                    )}
                                    <button
                                        type="submit"
                                        disabled={busy || !categoryDraft.trim()}
                                        className="h-9 rounded-lg bg-[#4e812f] px-4 text-sm font-medium text-white disabled:opacity-50"
                                    >
                                        {busy
                                            ? "Salvando…"
                                            : editingCategoryId
                                              ? "Salvar nome"
                                              : "Adicionar categoria"}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <p className="mb-4 rounded-lg bg-[#f1edf3] p-3 text-sm text-[#625c66]">
                                A política desta casa permite que apenas líderes e administradores
                                alterem categorias.
                            </p>
                        )}
                        <ul className="divide-y divide-[#e7e0e9] rounded-xl border border-[#e1d9e5] bg-white">
                            {categories.map((category) => (
                                <li
                                    key={category.id}
                                    className="flex items-center justify-between gap-3 px-3 py-2.5"
                                >
                                    <span className="text-sm">{category.name}</span>
                                    {canManageCategories && (
                                        <span className="flex shrink-0 gap-1">
                                            <button
                                                type="button"
                                                disabled={busy}
                                                onClick={() => onEdit(category)}
                                                aria-label={`Renomear ${category.name}`}
                                                className="grid size-8 place-items-center rounded-md text-[#625c66] hover:bg-[#f1edf3] disabled:opacity-40"
                                            >
                                                <Pencil size={15} />
                                            </button>
                                            <button
                                                type="button"
                                                disabled={busy}
                                                onClick={() => onRemove(category)}
                                                aria-label={`Excluir ${category.name}`}
                                                className="grid size-8 place-items-center rounded-md text-[#9a5555] hover:bg-red-50 disabled:opacity-40"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </section>
                </div>
            )}
        </>
    );
}
