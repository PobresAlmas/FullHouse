import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppPageHeader } from "../AppPageHeader";
import { AppShellContext } from "../AppShellContext";

describe("AppPageHeader", () => {
    it("renders the shared house and settings icons with a residence selector slot", () => {
        const { container } = render(
            <AppPageHeader
                greetingName="Ana Silva"
                residenceName="Casa do Vale"
                residenceControl={<button type="button">Trocar residência</button>}
                settingsHref="/settings"
            />
        );

        expect(
            screen.getByRole("heading", { name: /^(Bom dia|Boa tarde|Boa noite), Ana$/ })
        ).toBeInTheDocument();
        expect(screen.getByText("Casa do Vale")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Trocar residência" })).toBeInTheDocument();
        expect(
            screen.getByRole("link", { name: "Configurações" }).querySelector("svg")
        ).toBeInTheDocument();
        expect(screen.getByLabelText("Notificações").querySelector("svg")).toBeInTheDocument();
        const header = container.querySelector("header");
        expect(header).toHaveClass("md:fixed", "md:left-[220px]", "z-40");
        expect(container.querySelector("div[aria-hidden='true']")).toHaveClass("h-[72px]");
    });

    it.each([
        ["Ana Apelido Sobrenome", "Ana"],
        ["", "Morador"],
        ["   ", "Morador"],
    ])("greets %j using only the first available name", (greetingName, firstName) => {
        render(<AppPageHeader greetingName={greetingName} />);

        expect(
            screen.getByRole("heading", {
                name: new RegExp(`^(Bom dia|Boa tarde|Boa noite), ${firstName}$`),
            })
        ).toBeInTheDocument();
    });

    it("always renders a working, pointer-enabled settings link", () => {
        render(<AppPageHeader greetingName="Ana" />);

        const settings = screen.getByRole("link", { name: "Configurações" });
        expect(settings).toHaveAttribute("href", "/settings");
        expect(settings).toHaveClass("cursor-pointer");
    });

    it("does not render a page-specific header inside the shared app shell", () => {
        render(
            <AppShellContext.Provider value>
                <AppPageHeader greetingName="Ana" />
            </AppShellContext.Provider>
        );

        expect(screen.queryByRole("banner")).not.toBeInTheDocument();
    });
});
