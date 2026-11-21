import { Fragment } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SystemSelect } from "../system-select";

describe("SystemSelect", () => {
    it("opens, selects an option, updates the hidden native select, and closes", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(
            <SystemSelect
                aria-label="Permissão"
                name="permission"
                defaultValue="edit"
                onChange={onChange}
            >
                <option value="edit">Pode editar</option>
                <option value="read">Somente leitura</option>
            </SystemSelect>
        );

        const trigger = screen.getByRole("combobox", { name: "Permissão" });
        await user.click(trigger);
        expect(screen.getByRole("listbox")).toBeInTheDocument();
        await user.click(screen.getByRole("option", { name: "Somente leitura" }));

        expect(onChange).toHaveBeenCalledOnce();
        expect(onChange.mock.calls[0][0].target.value).toBe("read");
        expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
        expect(trigger).toHaveTextContent("Somente leitura");
        expect(document.querySelector('select[name="permission"]')).toHaveValue("read");
    });

    it("handles fragments, option groups, disabled options, and keyboard navigation", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(
            <SystemSelect aria-label="Prazo" defaultValue="one" onChange={onChange}>
                <Fragment>
                    <option value="one">1 dia</option>
                    <option value="blocked" disabled>
                        3 dias indisponível
                    </option>
                    <optgroup label="Mais prazos">
                        <option value="seven">7 dias</option>
                    </optgroup>
                </Fragment>
            </SystemSelect>
        );

        await user.click(screen.getByRole("combobox", { name: "Prazo" }));
        expect(screen.getByRole("option", { name: "3 dias indisponível" })).toBeDisabled();
        expect(screen.getByText("Mais prazos")).toBeInTheDocument();
        const selected = screen.getByRole("option", { name: "1 dia" });
        selected.focus();
        await user.keyboard("{ArrowDown}");
        expect(screen.getByRole("option", { name: "7 dias" })).toHaveFocus();
        await user.keyboard("{Enter}");
        expect(onChange.mock.calls[0][0].target.value).toBe("seven");
        expect(screen.getByRole("combobox", { name: "Prazo" })).toHaveTextContent("7 dias");
    });

    it("updates a controlled value only when the parent changes it", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        const { rerender } = render(
            <SystemSelect aria-label="Acesso" value="edit" onChange={onChange}>
                <option value="edit">Pode editar</option>
                <option value="read">Somente leitura</option>
            </SystemSelect>
        );
        await user.click(screen.getByRole("combobox", { name: "Acesso" }));
        await user.click(screen.getByRole("option", { name: "Somente leitura" }));
        expect(onChange).toHaveBeenCalledOnce();
        expect(screen.getByRole("combobox", { name: "Acesso" })).toHaveTextContent("Pode editar");

        rerender(
            <SystemSelect aria-label="Acesso" value="read" onChange={onChange}>
                <option value="edit">Pode editar</option>
                <option value="read">Somente leitura</option>
            </SystemSelect>
        );
        await waitFor(() =>
            expect(screen.getByRole("combobox", { name: "Acesso" })).toHaveTextContent(
                "Somente leitura"
            )
        );
    });

    it("keeps a multiple selector open and reports selected options", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(
            <SystemSelect aria-label="Categorias" multiple defaultValue={["a"]} onChange={onChange}>
                <option value="a">Bebidas</option>
                <option value="b">Grãos</option>
            </SystemSelect>
        );
        await user.click(screen.getByRole("combobox", { name: "Categorias" }));
        await user.click(screen.getByRole("option", { name: "Grãos" }));
        expect(screen.getByRole("listbox")).toBeInTheDocument();
        expect(onChange.mock.calls[0][0].target.options[0].selected).toBe(true);
        expect(onChange.mock.calls[0][0].target.options[1].selected).toBe(true);
        expect(screen.getByRole("combobox", { name: "Categorias" })).toHaveTextContent(
            "Bebidas, Grãos"
        );
    });

    it("closes when a pointer event occurs outside the selector", async () => {
        const user = userEvent.setup();
        render(
            <>
                <SystemSelect aria-label="Acesso" defaultValue="edit">
                    <option value="edit">Pode editar</option>
                </SystemSelect>
                <button type="button">Fora</button>
            </>
        );
        await user.click(screen.getByRole("combobox", { name: "Acesso" }));
        expect(screen.getByRole("listbox")).toBeInTheDocument();
        fireEvent.pointerDown(screen.getByRole("button", { name: "Fora" }));
        expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });

    it("keeps the list closed and the trigger disabled when disabled", async () => {
        const user = userEvent.setup();
        render(
            <SystemSelect aria-label="Acesso" disabled defaultValue="edit">
                <option value="edit">Pode editar</option>
            </SystemSelect>
        );
        const trigger = screen.getByRole("combobox", { name: "Acesso" });
        expect(trigger).toBeDisabled();
        await user.click(trigger);
        expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });

    it("supports Home, End, Escape, and an empty option list without committing", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(
            <SystemSelect aria-label="Estado" defaultValue="middle" onChange={onChange}>
                <option value="first">Primeiro</option>
                <option value="blocked" disabled>
                    Indisponível
                </option>
                <option value="middle">Meio</option>
                <option value="last">Último</option>
            </SystemSelect>
        );
        const trigger = screen.getByRole("combobox", { name: "Estado" });
        await user.click(trigger);
        await user.keyboard("{End}");
        expect(screen.getByRole("option", { name: "Último" })).toHaveFocus();
        await user.keyboard("{Home}");
        expect(screen.getByRole("option", { name: "Primeiro" })).toHaveFocus();
        await user.keyboard("{Escape}");
        expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
        expect(trigger).toHaveFocus();
        expect(onChange).not.toHaveBeenCalled();
    });

    it("renders a safe placeholder for an empty option collection", async () => {
        const user = userEvent.setup();
        render(<SystemSelect aria-label="Sem opções" />);
        const trigger = screen.getByRole("combobox", { name: "Sem opções" });
        expect(trigger).toHaveTextContent("Selecione");
        await user.click(trigger);
        expect(screen.getByRole("listbox")).toBeInTheDocument();
        expect(screen.queryAllByRole("option")).toHaveLength(0);
    });
});
