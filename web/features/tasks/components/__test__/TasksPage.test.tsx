import type { ReactNode } from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    completePersonalTask,
    createPersonalTask,
    deletePersonalTask,
    getPersonalTasks,
    getTaskExchangeRequests,
    getTaskMembers,
    getTaskResidences,
    getTasks,
} from "../../api/tasks.api";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { Task } from "../../api/tasks.api";
import TasksPage from "../TasksPage";

vi.mock("../../api/tasks.api", () => ({
    completePersonalTask: vi.fn(),
    completeTask: vi.fn(),
    createPersonalTask: vi.fn(),
    createTaskExchangeRequest: vi.fn(),
    createTask: vi.fn(),
    deletePersonalTask: vi.fn(),
    deleteTask: vi.fn(),
    getPersonalTasks: vi.fn(),
    getTaskMembers: vi.fn(),
    getTaskResidences: vi.fn(),
    getTaskExchangeRequests: vi.fn(),
    getTasks: vi.fn(),
    respondToTaskExchange: vi.fn(),
    updatePersonalTask: vi.fn(),
    updateTask: vi.fn(),
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("@/components/layout/AppSidebar", () => ({ AppSidebar: () => null }));
vi.mock("@/components/layout/AppPageHeader", () => ({
    AppPageHeader: ({
        greetingName,
        subtitle,
        residenceControl,
        profile,
    }: {
        greetingName: string;
        subtitle?: string;
        residenceControl?: ReactNode;
        profile?: ReactNode;
    }) => (
        <header>
            <span>{greetingName}</span>
            {subtitle && <span>{subtitle}</span>}
            {residenceControl}
            {profile}
        </header>
    ),
}));

const task: Task = {
    id: "personal-task-1",
    definitionId: "definition-1",
    title: "Ler um capítulo",
    description: "Ler antes de dormir",
    tags: ["Leitura"],
    color: "#4f7f63",
    visibility: "PRIVADA",
    scope: "INDIVIDUAL",
    assignmentType: "FIXA",
    rotationMemberIds: [],
    residenceId: null,
    assignee: null,
    dueAt: "2027-01-02T19:00:00.000Z",
    periodicity: "SEMANAL",
    repeats: false,
    reminderAt: null,
    status: "PENDENTE",
    completedAt: null,
};

describe("TasksPage", () => {
    const logout = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useAuth).mockReturnValue({
            user: { id: "user-1", name: "Ana Silva", email: "ana@example.com" },
            logout,
        } as never);
        vi.mocked(getTaskResidences).mockResolvedValue([]);
        vi.mocked(getPersonalTasks).mockResolvedValue([]);
        vi.mocked(getTaskMembers).mockResolvedValue([]);
        vi.mocked(getTasks).mockResolvedValue([]);
        vi.mocked(getTaskExchangeRequests).mockResolvedValue([]);
        vi.mocked(createPersonalTask).mockResolvedValue(task);
        vi.mocked(completePersonalTask).mockResolvedValue({
            ...task,
            status: "CONCLUIDA",
            completedAt: new Date().toISOString(),
        });
        vi.mocked(deletePersonalTask).mockResolvedValue(undefined);
        logout.mockResolvedValue(undefined);
    });

    it("loads personal tasks when the user has no residence and shows the empty state", async () => {
        render(<TasksPage />);

        expect(await screen.findByText("Nenhuma tarefa pessoal ainda.")).toBeInTheDocument();
        expect(screen.getByText("Tarefas pessoais")).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "Tarefas e Rotina" })).toBeInTheDocument();
        expect(getPersonalTasks).toHaveBeenCalledOnce();
        expect(getTaskMembers).not.toHaveBeenCalled();
    });

    it("creates a personal task without household assignment fields", async () => {
        const user = userEvent.setup();
        render(<TasksPage />);

        await screen.findByText("Nenhuma tarefa pessoal ainda.");
        await user.click(screen.getByRole("button", { name: "Nova tarefa" }));
        const dialog = screen.getByRole("dialog", { name: "Nova tarefa" });
        await user.type(screen.getByLabelText("Título *"), "  Preparar jantar  ");
        await user.click(within(dialog).getByRole("button", { name: "Salvar tarefa" }));

        await waitFor(() =>
            expect(createPersonalTask).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: "Preparar jantar",
                    visibility: "PRIVADA",
                    reminderMinutesBefore: 30,
                })
            )
        );
        const submitted = vi.mocked(createPersonalTask).mock.calls[0][0];
        expect(submitted).not.toHaveProperty("assigneeId");
        expect(submitted).not.toHaveProperty("assigneeIds");
        expect(submitted).not.toHaveProperty("assignmentType");
        expect(await screen.findByRole("status")).toHaveTextContent("Tarefa pessoal criada.");
        expect(screen.getByRole("heading", { name: "Ler um capítulo" })).toBeInTheDocument();
    });

    it("filters tasks by search and completes the selected personal task", async () => {
        const user = userEvent.setup();
        vi.mocked(getPersonalTasks).mockResolvedValue([
            task,
            { ...task, id: "personal-task-2", title: "Organizar a mesa", tags: ["Casa"] },
        ]);
        render(<TasksPage />);

        await screen.findByRole("heading", { name: "Ler um capítulo" });
        await user.type(screen.getByRole("textbox", { name: "Buscar tarefas" }), "organizar");
        expect(screen.getByRole("heading", { name: "Organizar a mesa" })).toBeInTheDocument();
        expect(screen.queryByRole("heading", { name: "Ler um capítulo" })).not.toBeInTheDocument();
        await user.clear(screen.getByRole("textbox", { name: "Buscar tarefas" }));
        await user.click(screen.getByRole("checkbox", { name: "Concluir Ler um capítulo" }));

        await waitFor(() => expect(completePersonalTask).toHaveBeenCalledWith(task.id));
        expect(await screen.findByRole("status")).toHaveTextContent("Tarefa concluída.");
    });

    it("asks for confirmation before deleting a personal task", async () => {
        const user = userEvent.setup();
        vi.mocked(getPersonalTasks).mockResolvedValue([task]);
        render(<TasksPage />);

        await screen.findByRole("heading", { name: task.title });
        await user.click(screen.getByRole("button", { name: `Excluir ${task.title}` }));
        await user.click(screen.getByRole("button", { name: /^Excluir$/ }));

        await waitFor(() => expect(deletePersonalTask).toHaveBeenCalledWith(task.id));
        expect(await screen.findByText("Nenhuma tarefa pessoal ainda.")).toBeInTheDocument();
        expect(screen.getByRole("status")).toHaveTextContent("Tarefa removida.");
    });

    it("shows a load error and retries loading personal tasks", async () => {
        const user = userEvent.setup();
        vi.mocked(getPersonalTasks)
            .mockRejectedValueOnce({ message: "Serviço indisponível." })
            .mockResolvedValueOnce([]);
        render(<TasksPage />);

        expect(
            await screen.findByText("Não foi possível carregar as tarefas.")
        ).toBeInTheDocument();
        expect(screen.getByRole("alert")).toHaveTextContent("Serviço indisponível.");
        await user.click(screen.getByRole("button", { name: "Tentar novamente" }));
        expect(await screen.findByText("Nenhuma tarefa pessoal ainda.")).toBeInTheDocument();
        expect(getPersonalTasks).toHaveBeenCalledTimes(2);
    });

    it("calls logout from the account menu", async () => {
        const user = userEvent.setup();
        render(<TasksPage />);

        await screen.findByText("Nenhuma tarefa pessoal ainda.");
        await user.click(screen.getByRole("button", { name: "Abrir menu da conta de Ana Silva" }));
        await user.click(screen.getByRole("menuitem", { name: "Sair" }));

        await waitFor(() => expect(logout).toHaveBeenCalledOnce());
    });
});
