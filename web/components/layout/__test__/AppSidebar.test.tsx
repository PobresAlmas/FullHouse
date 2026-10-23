import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppSidebar } from "../AppSidebar";

describe("AppSidebar", () => {
    it("keeps unfinished sections visible but inactive", () => {
        render(<AppSidebar activeSection="finance" />);

        const navigation = screen.getByRole("navigation", { name: "Navegação principal" });
        expect(navigation.querySelectorAll("a")).toHaveLength(3);
        for (const label of ["Início", "Tarefas", "Configurações"]) {
            expect(screen.getByText(label).closest("[aria-disabled='true']")).toBeInTheDocument();
        }
        expect(screen.queryByRole("link", { name: "Início" })).not.toBeInTheDocument();
        expect(screen.queryByRole("link", { name: "Tarefas" })).not.toBeInTheDocument();
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

    it("shows the selected residence name", () => {
        render(<AppSidebar activeSection="pantry" residenceName="Casa do Vale" />);

        expect(screen.getByText("Casa Casa do Vale")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Despensa" })).toHaveAttribute(
            "aria-current",
            "page"
        );
    });
});
