import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HomePage } from "../HomePage";
import { createResidence, getResidences } from "@/features/residences/api/residences.api";
import { getTasks, getTaskMembers } from "@/features/tasks/api/tasks.api";
import { getExpenses } from "@/features/expenses/api/expenses.api";
import { getPersonalHome } from "../../api/home.api";
import { dayInBusinessTime } from "../../lib/home-metrics";
import { createResidenceFixture } from "@/test/fixtures/residence";

const { logout } = vi.hoisted(() => ({ logout: vi.fn() }));

vi.mock("@/features/auth/hooks/useAuth", () => ({
    useAuth: () => ({
        user: {
            id: "user-1",
            email: "person@example.com",
            name: "Pessoa Apelido Sobrenome",
        },
        logout,
    }),
}));
vi.mock("@/features/residences/api/residences.api", () => ({
    createResidence: vi.fn(),
    getResidences: vi.fn(),
}));
vi.mock("@/features/tasks/api/tasks.api", () => ({
    getTasks: vi.fn(),
    getTaskMembers: vi.fn(),
}));
vi.mock("@/features/expenses/api/expenses.api", () => ({ getExpenses: vi.fn() }));
vi.mock("../../api/home.api", () => ({ getPersonalHome: vi.fn() }));

const residence = createResidenceFixture({
    id: "residence-1",
    name: "Casa da Família",
    city: null,
    neighborhood: null,
    membership: { id: "member-1", role: "LIDER" },
});

describe("HomePage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        logout.mockResolvedValue(undefined);
        window.localStorage.clear();
        vi.mocked(getResidences).mockResolvedValue([]);
        vi.mocked(getTasks).mockResolvedValue([]);
        vi.mocked(getTaskMembers).mockResolvedValue([]);
        vi.mocked(getExpenses).mockResolvedValue([]);
        vi.mocked(getPersonalHome).mockResolvedValue({ tasks: [], expenses: [] });
    });

    it("shows creation only after confirming the user has no residence", async () => {
        render(<HomePage />);
        expect(await screen.findByRole("heading", { name: "Crie sua casa" })).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "Bom dia, Pessoa" })).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "Abrir menu da conta de Pessoa Apelido Sobrenome" })
        ).toHaveTextContent("P");
        expect(screen.queryByText("Casa da Família")).not.toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
    });

    it("opens the account menu and logs out from the menu action", async () => {
        const user = userEvent.setup();
        render(<HomePage />);
        await user.click(
            await screen.findByRole("button", {
                name: "Abrir menu da conta de Pessoa Apelido Sobrenome",
            })
        );
        expect(screen.getByRole("menu", { name: "Menu da conta" })).toBeInTheDocument();
        expect(screen.getByText("person@example.com")).toBeInTheDocument();
        await user.click(screen.getByRole("menuitem", { name: "Sair" }));
        expect(logout).toHaveBeenCalledOnce();
    });

    it("validates the residence name and handles successful creation", async () => {
        const user = userEvent.setup();
        render(<HomePage />);
        await user.click(await screen.findByRole("button", { name: "Criar casa" }));
        expect(await screen.findByRole("alert")).toHaveTextContent("Informe o nome da casa.");
        expect(createResidence).not.toHaveBeenCalled();

        vi.mocked(createResidence).mockResolvedValue(residence);
        await user.type(screen.getByLabelText("Nome da casa"), "  Casa da Família  ");
        await user.click(screen.getByRole("button", { name: "Criar casa" }));
        await waitFor(() => expect(createResidence).toHaveBeenCalledWith("Casa da Família"));
        expect(await screen.findByRole("button", { name: "Casa da Família" })).toHaveAttribute(
            "aria-pressed",
            "true"
        );
    });

    it("preserves the name and reports a creation failure", async () => {
        const user = userEvent.setup();
        vi.mocked(createResidence).mockRejectedValue({ message: "Falha no servidor." });
        render(<HomePage />);
        await user.type(await screen.findByLabelText("Nome da casa"), "Casa Teste");
        await user.click(screen.getByRole("button", { name: "Criar casa" }));
        expect(await screen.findByRole("alert")).toHaveTextContent("Falha no servidor.");
        expect(screen.getByLabelText("Nome da casa")).toHaveValue("Casa Teste");
    });

    it("keeps the residence dashboard when one independent card query fails", async () => {
        vi.mocked(getResidences).mockResolvedValue([residence]);
        vi.mocked(getTasks).mockRejectedValue({ message: "Falha ao consultar tarefas." });
        vi.mocked(getTaskMembers).mockResolvedValue([
            { id: "member-1", name: "Pessoa", role: "LIDER" },
        ]);
        render(<HomePage />);
        expect(await screen.findByRole("button", { name: "Casa da Família" })).toBeInTheDocument();
        expect(await screen.findAllByText("Falha ao consultar tarefas.")).toHaveLength(2);
        expect(screen.getByText("Membros da casa")).toBeInTheDocument();
        expect(screen.getByText("Pessoa")).toBeInTheDocument();
    });

    it("loads personal data on context change and omits residence members", async () => {
        const user = userEvent.setup();
        vi.mocked(getResidences).mockResolvedValue([residence]);
        vi.mocked(getPersonalHome).mockResolvedValue({ tasks: [], expenses: [] });
        render(<HomePage />);
        await user.click(await screen.findByRole("button", { name: "Pessoal" }));
        await waitFor(() => expect(getPersonalHome).toHaveBeenCalled());
        expect(screen.getByText("Modo pessoal")).toBeInTheDocument();
        expect(screen.queryByText("Membros da casa")).not.toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: residence.name }));
        expect(await screen.findByText("Membros da casa")).toBeInTheDocument();
    });

    it("shows personal task data when its expense query reports a partial failure", async () => {
        const user = userEvent.setup();
        vi.mocked(getResidences).mockResolvedValue([residence]);
        vi.mocked(getPersonalHome).mockResolvedValue({
            tasks: [
                {
                    id: "personal-task",
                    title: "Ler capítulo",
                    dueAt: "2026-10-23T15:00:00Z",
                    status: "PENDENTE",
                    completedAt: null,
                },
            ],
            expenses: [],
            errors: { expenses: "Não foi possível carregar suas despesas pessoais." },
        });
        render(<HomePage />);
        await user.click(await screen.findByRole("button", { name: "Pessoal" }));
        expect(await screen.findByText("Ler capítulo")).toBeInTheDocument();
        expect(
            await screen.findByText("Não foi possível carregar suas despesas pessoais.")
        ).toBeInTheDocument();
    });

    it("renders real overdue, today's, and due bill records", async () => {
        const today = dayInBusinessTime();
        const yesterday = new Date(`${today}T00:00:00.000Z`);
        yesterday.setUTCDate(yesterday.getUTCDate() - 1);
        const tomorrow = new Date(`${today}T00:00:00.000Z`);
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
        vi.mocked(getResidences).mockResolvedValue([residence]);
        vi.mocked(getTasks).mockResolvedValue([
            {
                id: "late-1",
                definitionId: "d1",
                title: "Tarefa atrasada",
                description: null,
                tags: [],
                color: null,
                assignmentType: "FIXA",
                rotationMemberIds: [],
                residenceId: residence.id,
                assignee: { id: "member-1", name: "Pessoa" },
                dueAt: `${yesterday.toISOString().slice(0, 10)}T12:00:00.000Z`,
                periodicity: "PERSONALIZADA",
                repeats: false,
                reminderAt: null,
                status: "ATRASADA",
                completedAt: null,
            },
            {
                id: "today-1",
                definitionId: "d2",
                title: "Tarefa de hoje",
                description: null,
                tags: [],
                color: null,
                assignmentType: "FIXA",
                rotationMemberIds: [],
                residenceId: residence.id,
                assignee: null,
                dueAt: `${today}T12:00:00.000Z`,
                periodicity: "PERSONALIZADA",
                repeats: false,
                reminderAt: null,
                status: "PENDENTE",
                completedAt: null,
            },
        ]);
        vi.mocked(getExpenses).mockResolvedValue([
            {
                id: "bill-1",
                description: "Água",
                amount: "80.00",
                date: tomorrow.toISOString().slice(0, 10),
                homeId: residence.id,
                homeName: residence.name,
                subgroup: null,
                paymentStatus: "PENDING",
                paidBy: null,
                paidAt: null,
            },
        ]);

        render(<HomePage />);
        expect(await screen.findByText("Tarefa atrasada")).toBeInTheDocument();
        expect(await screen.findByText("Tarefa de hoje")).toBeInTheDocument();
        expect(await screen.findByText("Água")).toBeInTheDocument();
    });

    it("switches to another authorized residence and updates its dynamic name", async () => {
        const user = userEvent.setup();
        const otherResidence = { ...residence, id: "residence-2", name: "Casa da Praia" };
        window.localStorage.setItem("fullhouse.home.residence", "removed-residence");
        vi.mocked(getResidences).mockResolvedValue([residence, otherResidence]);
        render(<HomePage />);
        const selector = await screen.findByRole("combobox", { name: "Residência" });
        expect(selector).toHaveValue(residence.id);
        await user.selectOptions(selector, otherResidence.id);
        await waitFor(() => expect(getTasks).toHaveBeenCalledWith(otherResidence.id));
        expect(screen.getByText("Casa da Praia", { selector: "p" })).toBeInTheDocument();
    });

    it("discards the previous residence data after a new residence query is denied", async () => {
        const user = userEvent.setup();
        const otherResidence = { ...residence, id: "residence-2", name: "Casa da Praia" };
        vi.mocked(getResidences).mockResolvedValue([residence, otherResidence]);
        vi.mocked(getTaskMembers).mockImplementation(async (id) => {
            if (id === residence.id)
                return [{ id: "member-1", name: "Pessoa da primeira casa", role: "LIDER" }];
            throw { message: "A residência não está disponível." };
        });

        render(<HomePage />);
        const selector = await screen.findByRole("combobox", { name: "Residência" });
        expect(await screen.findByText("Pessoa da primeira casa")).toBeInTheDocument();
        await user.selectOptions(selector, otherResidence.id);
        expect(await screen.findByText("A residência não está disponível.")).toBeInTheDocument();
        expect(screen.queryByText("Pessoa da primeira casa")).not.toBeInTheDocument();
    });

    it("distinguishes a residence lookup failure from an empty residence list", async () => {
        vi.mocked(getResidences).mockRejectedValue({ message: "Sem conexão." });
        render(<HomePage />);
        expect(await screen.findByRole("alert")).toHaveTextContent("Sem conexão.");
        expect(screen.queryByRole("heading", { name: "Crie sua casa" })).not.toBeInTheDocument();
    });
});
