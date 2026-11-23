import { useForm } from "react-hook-form";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import FormTextField from "../FormTextField";

function TestForm({ type }: { type?: string }) {
    const form = useForm<{ email: string }>();
    return (
        <FormTextField
            name="email"
            label="Email"
            type={type}
            placeholder="Email address"
            form={form}
        />
    );
}

describe("FormTextField", () => {
    it("registers its input with react-hook-form", async () => {
        const user = userEvent.setup();
        render(<TestForm />);
        const input = screen.getByLabelText("Email");
        await user.type(input, "user@example.com");
        expect(input).toHaveValue("user@example.com");
        expect(input).toHaveAttribute("name", "email");
    });

    it("passes the requested input type through to the field", () => {
        render(<TestForm type="email" />);
        expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
    });
});
