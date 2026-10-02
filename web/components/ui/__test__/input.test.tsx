import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Input } from "../input";

describe("Input", () => {
    it("forwards type, value, placeholder and attributes", () => {
        render(
            <Input aria-label="Email" type="email" defaultValue="a@b.com" placeholder="email" />
        );
        expect(screen.getByRole("textbox", { name: "Email" })).toHaveAttribute("type", "email");
        expect(screen.getByRole("textbox", { name: "Email" })).toHaveValue("a@b.com");
        expect(screen.getByPlaceholderText("email")).toHaveAttribute("data-slot", "input");
    });

    it("keeps disabled and invalid state on the native input", () => {
        render(<Input aria-label="Senha" disabled aria-invalid="true" />);
        expect(screen.getByLabelText("Senha")).toBeDisabled();
        expect(screen.getByLabelText("Senha")).toHaveAttribute("aria-invalid", "true");
    });
});
