import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PantryPage from "../page";
import {
    getPantryItems,
    getPantryMembers,
    registerPantryMovement,
} from "@/features/pantry/api/pantry.api";
import type { PantryItem, PantryMember } from "@/features/pantry/api/pantry.api";
import { getPetResidences } from "@/features/pets/api/pets.api";
import type { PetResidence } from "@/features/pets/api/pets.api";

vi.mock("@/features/pantry/api/pantry.api", () => ({
    getPantryItems: vi.fn(),
    getPantryMembers: vi.fn(),
    registerPantryMovement: vi.fn(),
}));

vi.mock("@/features/pets/api/pets.api", () => ({ getPetResidences: vi.fn() }));
vi.mock("@/features/auth/hooks/useAuth", () => ({
    useAuth: () => ({ user: { id: "user-1", email: "emilson@example.com" }, loading: false }),
}));

const residence: PetResidence = {
    id: "00000000-0000-4000-8000-000000000002",
    name: "Casa do Vale",
    city: "Fortaleza",
    neighborhood: "Centro",
    status: "ATIVA",
    membership: { id: "member-1", role: "ADMINISTRADOR" },
    creationEditPolicy: "TODOS",
};

const member: PantryMember = { id: "member-1", name: "Emilson" };
const item: PantryItem = {
    id: "00000000-0000-4000-8000-000000000001",
    name: "Arroz",
    category: "Grãos",
    property: "COMUNITARIO",
    ownerMemberId: null,
    ownerName: "Casa",
    isMine: false,
    unit: "KG",
    quantity: 2,
    minimumQuantity: null,
    expirationDate: null,
};

describe("PantryPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getPetResidences).mockResolvedValue([residence]);
        vi.mocked(getPantryMembers).mockResolvedValue([member]);
        vi.mocked(getPantryItems).mockResolvedValue([item]);
    });

    it("registers the exact decimal movement quantity entered by the user", async () => {
        const user = userEvent.setup();
        vi.mocked(registerPantryMovement).mockResolvedValue({ ...item, quantity: 1.25 });
        render(<PantryPage />);

        await user.click(await screen.findByRole("button", { name: "Registrar consumo de Arroz" }));
        const quantity = screen.getByPlaceholderText("Ex.: 0,5");
        await user.clear(quantity);
        await user.type(quantity, "0,75");
        await user.click(screen.getByRole("button", { name: "Confirmar" }));

        await waitFor(() =>
            expect(registerPantryMovement).toHaveBeenCalledWith(
                residence.id,
                item.id,
                "CONSUMO",
                0.75
            )
        );
        expect(
            await screen.findByText("Consumo de 0,75 kg registrado para Arroz.")
        ).toBeInTheDocument();
    });

    it("rejects movement quantities with more than two decimal places before sending", async () => {
        const user = userEvent.setup();
        render(<PantryPage />);

        await user.click(
            await screen.findByRole("button", { name: "Registrar entrada para Arroz" })
        );
        const quantity = screen.getByPlaceholderText("Ex.: 0,5");
        await user.clear(quantity);
        await user.type(quantity, "0,123");
        await user.click(screen.getByRole("button", { name: "Confirmar" }));

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Informe uma quantidade positiva com até duas casas decimais."
        );
        expect(registerPantryMovement).not.toHaveBeenCalled();
    });
});
