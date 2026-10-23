import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppSidebar } from "../AppSidebar";

describe("AppSidebar", () => {
    it("links the implemented home and module sections", () => {
        render(<AppSidebar activeSection="finance" />);

        const navigation = screen.getByRole("navigation", { name: "Navegação principal" });
        expect(navigation.querySelectorAll("a")).toHaveLength(5);
        expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
        expect(screen.getByRole("link", { name: "Tarefas" })).toHaveAttribute("href", "/tasks");
        expect(screen.queryByRole("link", { name: "Configurações" })).not.toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Financeiro" })).toHaveAttribute(
            "aria-current",
            "page"
        );
        expect(screen.getByRole("link", { name: "Despensa" })).toHaveAttribute("href", "/pantry");
        expect(screen.getByRole("link", { name: "Pets" })).toHaveAttribute("href", "/pets");
        expect(screen.queryByText("Perfil")).not.toBeInTheDocument();
        expect(screen.getByText("Nenhuma casa associada")).toBeInTheDocument();
    });

    it("shows only home and profile navigation when no residence is linked", () => {
        render(<AppSidebar activeSection="profile" noResidence />);

        expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
        expect(screen.getByRole("button", { name: "Perfil" })).toHaveAttribute(
            "aria-current",
            "page"
        );
        expect(screen.queryByRole("link", { name: "Financeiro" })).not.toBeInTheDocument();
    });

    it("shows the selected residence name", () => {
        render(<AppSidebar activeSection="pantry" residenceName="Casa do Vale" />);

        expect(screen.getByText("Casa do Vale")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Despensa" })).toHaveAttribute(
            "aria-current",
            "page"
        );
    });
});
