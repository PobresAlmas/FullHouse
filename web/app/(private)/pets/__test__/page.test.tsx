import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PetsPage from "../page";
import {
    createPet,
    createPetCareLog,
    deletePet,
    getPet,
    getPetResidenceMembers,
    getPetResidences,
    getPets,
    updatePet,
} from "@/features/pets/api/pets.api";
import type { Pet, PetResidence } from "@/features/pets/api/pets.api";
import { getExpenses } from "@/features/expenses/api/expenses.api";
import { createResidenceFixture } from "@/test/fixtures/residence";

vi.mock("@/features/pets/api/pets.api", () => ({
    createPet: vi.fn(),
    createPetCareLog: vi.fn(),
    deletePet: vi.fn(),
    deletePetCareLog: vi.fn(),
    getPet: vi.fn(),
    getPetCareLogs: vi.fn(),
    getPetResidenceMembers: vi.fn(),
    getPetResidences: vi.fn(),
    getPets: vi.fn(),
    updatePet: vi.fn(),
    updatePetCareLog: vi.fn(),
}));

vi.mock("@/features/expenses/api/expenses.api", () => ({ getExpenses: vi.fn() }));
vi.mock("@/features/auth/hooks/useAuth", () => ({
    useAuth: () => ({
        user: { id: "user-1", email: "emilson@example.com", name: "Emilson Apelido Silva" },
        loading: false,
    }),
}));

const residence: PetResidence = createResidenceFixture({
    membership: { id: "participation-1", role: "ADMINISTRADOR" },
});
const pet: Pet = {
    id: "00000000-0000-4000-8000-000000000001",
    name: "Mel",
    species: "Cachorro",
    breed: "Golden Retriever",
    birthDate: "2022-03-15",
    residenceId: residence.id,
    photoUrl: null,
    createdById: "participation-1",
    createdAt: "2026-10-11T12:00:00.000Z",
    careLogs: [],
};

describe("PetsPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getPetResidences).mockResolvedValue([residence]);
        vi.mocked(getPetResidenceMembers).mockResolvedValue([
            { id: "participation-1", name: "Emilson", role: "ADMINISTRADOR" },
            { id: "participation-2", name: "Ana", role: "MORADOR" },
        ]);
        vi.mocked(getPets).mockResolvedValue([]);
        vi.mocked(getExpenses).mockResolvedValue([]);
        vi.mocked(getPet).mockResolvedValue(pet);
    });

    it("shows the linked residence and creates a pet", async () => {
        const user = userEvent.setup();
        vi.mocked(createPet).mockResolvedValue(pet);
        render(<PetsPage />);

        expect(await screen.findAllByText("Casa do Vale")).not.toHaveLength(0);
        expect(screen.getByRole("heading", { name: "Bom dia, Emilson" })).toBeInTheDocument();
        expect(
            screen.queryByRole("combobox", { name: "Trocar residência" })
        ).not.toBeInTheDocument();
        await user.type(screen.getByLabelText(/Nome do pet/), "Mel");
        await user.selectOptions(screen.getByLabelText(/Espécie/), "Cachorro");
        await user.click(screen.getByRole("button", { name: /Salvar pet/ }));

        await waitFor(() =>
            expect(createPet).toHaveBeenCalledWith(
                residence.id,
                expect.objectContaining({
                    name: "Mel",
                    species: "Cachorro",
                })
            )
        );
    }, 10_000);

    it("shows a residence selector only when the user has multiple residences", async () => {
        const user = userEvent.setup();
        const otherResidence = { ...residence, id: "residence-2", name: "Casa da Praia" };
        vi.mocked(getPetResidences).mockResolvedValue([residence, otherResidence]);
        render(<PetsPage />);

        const selector = await screen.findByRole("combobox", { name: "Trocar residência" });
        await user.selectOptions(selector, otherResidence.id);

        await waitFor(() => expect(getPets).toHaveBeenCalledWith(otherResidence.id));
    });

    it("shows pet details and registers a care history record", async () => {
        const user = userEvent.setup();
        vi.mocked(getPets).mockResolvedValue([pet]);
        vi.mocked(createPetCareLog).mockResolvedValue({
            id: "care-1",
            petId: pet.id,
            type: "VACCINE",
            title: "Vacina anual",
            description: null,
            date: "2026-10-11",
            cost: null,
            paidById: null,
            expenseId: null,
            createdById: "participation-1",
            createdAt: "2026-10-11T12:00:00.000Z",
        });
        render(<PetsPage />);
        await user.click(await screen.findByRole("button", { name: /Mel.*Golden Retriever/ }));
        await screen.findByText("Histórico de cuidados e gastos");
        await user.click(screen.getByRole("button", { name: /Registrar cuidado/ }));
        await user.type(screen.getByLabelText(/Título/), "Vacina anual");
        fireEvent.change(screen.getByLabelText("Data do cuidado *"), {
            target: { value: "2026-10-11" },
        });
        await user.click(screen.getByRole("button", { name: "Salvar registro" }));

        await waitFor(() =>
            expect(createPetCareLog).toHaveBeenCalledWith(
                pet.id,
                expect.objectContaining({
                    type: "VACCINE",
                    title: "Vacina anual",
                    date: "2026-10-11",
                })
            )
        );
    });

    it("updates a pet and confirms its authorized deletion", async () => {
        const user = userEvent.setup();
        vi.mocked(getPets).mockResolvedValue([pet]);
        vi.mocked(updatePet).mockResolvedValue({ ...pet, name: "Thor" });
        vi.mocked(deletePet).mockResolvedValue(undefined);
        render(<PetsPage />);
        await user.click(await screen.findByRole("button", { name: /Mel.*Golden Retriever/ }));
        const name = screen.getByLabelText(/Nome do pet/);
        await user.clear(name);
        await user.type(name, "Thor");
        await user.click(screen.getByRole("button", { name: "Salvar alterações" }));
        await waitFor(() =>
            expect(updatePet).toHaveBeenCalledWith(
                residence.id,
                pet.id,
                expect.objectContaining({ name: "Thor" })
            )
        );

        await user.click(screen.getByRole("button", { name: /Excluir pet/ }));
        expect(screen.getByRole("alertdialog")).toHaveTextContent("Thor");
        await user.click(screen.getAllByRole("button", { name: "Excluir pet" })[1]);
        await waitFor(() => expect(deletePet).toHaveBeenCalledWith(residence.id, pet.id));
    });
});
