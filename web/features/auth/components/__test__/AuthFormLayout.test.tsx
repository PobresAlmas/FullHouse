import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import AuthFormLayout from "../AuthFormLayout";

describe("AuthFormLayout", () => {
    it("renders the card and prevents native submission before calling its handler", async () => {
        const user = userEvent.setup();
        const onSubmit = vi.fn();
        render(
            <AuthFormLayout title="Register" description="Create an account" onSubmit={onSubmit}>
                <button type="submit">Submit</button>
            </AuthFormLayout>
        );
        await user.click(screen.getByRole("button", { name: "Submit" }));
        expect(screen.getByText("Register")).toBeInTheDocument();
        expect(onSubmit).toHaveBeenCalledOnce();
        expect(onSubmit.mock.calls[0][0].defaultPrevented).toBe(true);
    });
});
