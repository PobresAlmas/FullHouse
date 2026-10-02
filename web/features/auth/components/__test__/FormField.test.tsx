import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import FormField from "../FormField";

describe("FormField", () => {
    it("labels the child control and shows helper text", () => {
        render(
            <FormField id="name" label="Name" helperText="Your public name">
                <input id="name" />
            </FormField>
        );
        expect(screen.getByLabelText("Name")).toBeInTheDocument();
        expect(screen.getByText("Your public name")).toBeInTheDocument();
    });

    it("renders errors instead of helper text", () => {
        render(
            <FormField id="name" label="Name" helperText="Hint" error="Required">
                <input id="name" />
            </FormField>
        );
        expect(screen.getByText("Required")).toBeInTheDocument();
        expect(screen.queryByText("Hint")).not.toBeInTheDocument();
    });
});
