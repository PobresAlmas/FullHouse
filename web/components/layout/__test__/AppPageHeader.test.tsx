import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppPageHeader } from "../AppPageHeader";

describe("AppPageHeader", () => {
    it("renders the shared house and settings icons with a residence selector slot", () => {
        render(
            <AppPageHeader
                greetingName="Ana Silva"
                residenceName="Casa do Vale"
                residenceControl={<button type="button">Trocar residência</button>}
                settingsHref="/settings"
            />
        );

        expect(screen.getByRole("heading", { name: "Bom dia, Ana" })).toBeInTheDocument();
        expect(screen.getByText("Casa do Vale")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Trocar residência" })).toBeInTheDocument();
        expect(
            screen.getByRole("link", { name: "Configurações" }).querySelector("svg")
        ).toBeTruthy();
        expect(screen.getByLabelText("Notificações").querySelector("svg")).toBeTruthy();
    });

    it.each([
        ["Ana Apelido Sobrenome", "Ana"],
        ["", "Morador"],
        ["   ", "Morador"],
    ])("greets %j using only the first available name", (greetingName, firstName) => {
        render(<AppPageHeader greetingName={greetingName} />);

        expect(screen.getByRole("heading", { name: `Bom dia, ${firstName}` })).toBeInTheDocument();
    });
});
