import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TextField from "../TextField";

describe("TextField", () => {
    it("connects its label and forwards input props", () => {
        render(<TextField id="email" label="Email" type="email" placeholder="name@example.com" />);
        expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
        expect(screen.getByPlaceholderText("name@example.com")).toBeRequired();
    });

    it("renders a field error", () => {
        render(<TextField id="email" label="Email" error="Invalid email" />);
        expect(screen.getByText("Invalid email")).toBeInTheDocument();
        expect(screen.getByLabelText("Email").className).toContain("border-red-500");
    });
});
