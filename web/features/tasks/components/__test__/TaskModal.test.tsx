import type { FormEvent } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { initialForm } from "../../lib/tasks.utils";
import { TaskModal } from "../TaskModal";
import userEvent from "@testing-library/user-event";
import { selectSystemOption } from "@/test/utils/render";

describe("TaskModal", () => {
    it("renders personal mode without residence assignment controls", () => {
        const onClose = vi.fn();
        render(
            <TaskModal
                form={initialForm}
                members={[]}
                editing={false}
                saving
                error="Could not save"
                hasResidence={false}
                onChange={vi.fn()}
                onClose={onClose}
                onSubmit={vi.fn()}
            />
        );

        expect(screen.getByRole("dialog", { name: "Nova tarefa" })).toBeInTheDocument();
        expect(screen.getByRole("status")).toHaveTextContent("Modo pessoal");
        expect(screen.queryByLabelText("Atribuição")).not.toBeInTheDocument();
        expect(screen.queryByLabelText("Responsável")).not.toBeInTheDocument();
        expect(screen.getByRole("alert")).toHaveTextContent("Could not save");
        expect(screen.getByRole("button", { name: "Salvando…" })).toBeDisabled();

        fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
        expect(onClose).toHaveBeenCalledOnce();
    });

    it("exposes home assignment, recurrence, reminder, and submit actions", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        const onSubmit = vi.fn((event: FormEvent<HTMLFormElement>) => event.preventDefault());
        const form = {
            ...initialForm,
            assignmentType: "RODIZIO" as const,
            dueAt: "2026-12-10T18:00",
        };
        const { rerender } = render(
            <TaskModal
                form={form}
                members={[
                    { id: "member-1", name: "Ana", role: "MORADOR" },
                    { id: "member-2", name: "Bruno", role: "ADMINISTRADOR" },
                ]}
                editing
                saving={false}
                error=""
                hasResidence
                onChange={onChange}
                onClose={vi.fn()}
                onSubmit={onSubmit}
            />
        );

        const rotationSelect = screen.getByRole("combobox", { name: /Ordem do rodízio/ });
        expect(rotationSelect).toBeInTheDocument();
        await user.click(rotationSelect);
        expect(screen.getByRole("option", { name: "Ana" })).toBeInTheDocument();
        expect(screen.getByRole("option", { name: "Bruno" })).toBeInTheDocument();
        await user.click(screen.getByRole("option", { name: "Bruno" }));
        expect(onChange).toHaveBeenCalledWith("assigneeIds", ["member-2"]);
        await selectSystemOption(
            user,
            screen.getByRole("combobox", { name: "Repetição" }),
            "Semanalmente"
        );
        expect(onChange).toHaveBeenCalledWith("repeats", true);
        expect(onChange).toHaveBeenCalledWith("periodicity", "SEMANAL");
        await user.click(
            screen.getByRole("switch", { name: "Notificar os responsáveis antes do prazo" })
        );
        expect(onChange).toHaveBeenCalledWith("hasReminder", false);

        rerender(
            <TaskModal
                form={{ ...form, hasReminder: false }}
                members={[]}
                editing
                saving={false}
                error=""
                hasResidence
                onChange={onChange}
                onClose={vi.fn()}
                onSubmit={onSubmit}
            />
        );
        expect(screen.queryByLabelText("Avisar com antecedência")).not.toBeInTheDocument();
        const formElement = screen
            .getByRole("button", { name: "Salvar alterações" })
            .closest("form");
        expect(formElement).not.toBeNull();
        fireEvent.submit(formElement!);
        expect(onSubmit).toHaveBeenCalledOnce();
    });
});
