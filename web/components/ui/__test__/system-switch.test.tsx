import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SystemSwitch } from "../system-switch";

describe("SystemSwitch", () => {
    it("exposes its checked state accessibly and reports toggles", async () => {
        const user = userEvent.setup();
        const onCheckedChange = vi.fn();
        const { rerender } = render(
            <SystemSwitch label="Novas tarefas" checked={false} onCheckedChange={onCheckedChange} />
        );

        const control = screen.getByRole("switch", { name: "Novas tarefas" });
        expect(control).toHaveAttribute("aria-checked", "false");
        expect(control).toHaveAttribute("data-state", "unchecked");
        expect(control).toHaveAttribute("type", "button");

        await user.click(control);
        expect(onCheckedChange).toHaveBeenCalledWith(true);

        rerender(<SystemSwitch label="Novas tarefas" checked onCheckedChange={onCheckedChange} />);
        expect(screen.getByRole("switch", { name: "Novas tarefas" })).toHaveAttribute(
            "data-state",
            "checked"
        );
    });

    it("uses aria-label when label is omitted and does not toggle while disabled", async () => {
        const user = userEvent.setup();
        const onCheckedChange = vi.fn();
        render(
            <SystemSwitch
                aria-label="Mostrar itens vencidos"
                checked={true}
                disabled
                onCheckedChange={onCheckedChange}
            />
        );

        const control = screen.getByRole("switch", { name: "Mostrar itens vencidos" });
        expect(control).toBeDisabled();
        await user.click(control);
        expect(onCheckedChange).not.toHaveBeenCalled();
    });
});
