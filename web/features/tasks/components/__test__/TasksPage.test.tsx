import type { ReactNode } from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    completePersonalTask,
    completeTask,
    createPersonalTask,
    createTaskExchangeRequest,
    createTask,
    deletePersonalTask,
    getPersonalTasks,
    getTaskExchangeRequests,
    getTaskMembers,
    getTaskResidences,
    getTasks,
    reopenTask,
    respondToTaskExchange,
} from "../../api/tasks.api";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { createResidenceFixture } from "@/test/fixtures/residence";
import type { Task, TaskExchangeRequest } from "../../api/tasks.api";
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
    reopenTask: vi.fn(),
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

const residence = createResidenceFixture();
const ana = { id: "member-1", name: "Ana Silva", role: "ADMINISTRADOR" } as const;
const bruno = { id: "member-2", name: "Bruno Lima", role: "MORADOR" } as const;
const residenceTask: Task = {
    ...task,
    id: "residence-task-1",
    title: "Limpar a cozinha",
    scope: "CASA",
    visibility: "PUBLICA",
    residenceId: residence.id,
    assignee: { id: ana.id, name: ana.name },
};

describe("TasksPage", () => {
    let originalLocation: string;
    beforeEach(() => {
        originalLocation = window.location.href;
        vi.clearAllMocks();
        vi.mocked(useAuth).mockReturnValue({
            user: { id: "user-1", name: "Ana Silva", email: "ana@example.com" },
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
    });

    afterEach(() => {
        window.history.replaceState(null, "", originalLocation);
    });

    it("loads personal tasks when the user has no residence and shows the empty state", async () => {
        render(<TasksPage />);

        expect(await screen.findByText("Nenhuma tarefa pessoal ainda.")).toBeInTheDocument();
        expect(screen.getByText("Tarefas pessoais")).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "Tarefas e Rotina" })).toBeInTheDocument();
        expect(getPersonalTasks).toHaveBeenCalledOnce();
        expect(getTaskMembers).not.toHaveBeenCalled();
    });

    it("keeps personal tasks available when the residence lookup fails", async () => {
        const user = userEvent.setup();
        vi.mocked(getTaskResidences).mockRejectedValueOnce(new Error("Erro da residência"));
        vi.mocked(getPersonalTasks).mockResolvedValue([task]);
        render(<TasksPage initialScope="personal" />);

        expect(await screen.findByRole("heading", { name: task.title })).toBeInTheDocument();
        expect(screen.getByRole("alert")).toHaveTextContent(
            "As tarefas pessoais continuam disponíveis."
        );
        await user.type(screen.getByRole("textbox", { name: "Buscar tarefas" }), "fora da lista");
        expect(screen.getByText("Nenhuma tarefa encontrada.")).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Limpar filtros" }));
        expect(screen.getByRole("heading", { name: task.title })).toBeInTheDocument();
    });

    it("opens the personal context directly and keeps other residents' tasks in the house list", async () => {
        const user = userEvent.setup();
        const otherTask = { ...residenceTask, assignee: { id: bruno.id, name: bruno.name } };
        window.history.replaceState(null, "", "/tasks?scope=personal");
        vi.mocked(getTaskResidences).mockResolvedValue([residence]);
        vi.mocked(getPersonalTasks).mockResolvedValue([task]);
        vi.mocked(getTasks).mockResolvedValue([otherTask]);

        render(<TasksPage initialScope="personal" />);

        expect(await screen.findByRole("heading", { name: task.title })).toBeInTheDocument();
        expect(getTasks).not.toHaveBeenCalled();
        expect(screen.queryByText("Solicitações de troca")).not.toBeInTheDocument();
        const personalButton = screen.getByRole("button", { name: "Pessoal", pressed: true });
        const houseButton = screen.getByRole("button", { name: residence.name, pressed: false });
        expect(personalButton.className).toBe(houseButton.className);

        await user.click(houseButton);
        expect(
            await screen.findByRole("heading", { name: residenceTask.title })
        ).toBeInTheDocument();
        expect(screen.queryByRole("heading", { name: task.title })).not.toBeInTheDocument();
        expect(new URLSearchParams(window.location.search).has("scope")).toBe(false);
        expect(houseButton).toHaveAttribute("aria-pressed", "true");
        expect(personalButton).toHaveAttribute("aria-pressed", "false");

        await user.click(screen.getByRole("button", { name: "Pessoal" }));
        expect(await screen.findByRole("heading", { name: task.title })).toBeInTheDocument();
        expect(
            screen.queryByRole("heading", { name: residenceTask.title })
        ).not.toBeInTheDocument();
        expect(getPersonalTasks).toHaveBeenCalledTimes(2);
        expect(new URLSearchParams(window.location.search).get("scope")).toBe("personal");
    });

    it("lists a private house assignment in Personal with the assignee photo and residence actions", async () => {
        const user = userEvent.setup();
        const assignedTask: Task = {
            ...residenceTask,
            visibility: "PRIVADA",
            assignee: { id: ana.id, name: ana.name, photo: "/ana-avatar.png" },
        };
        vi.mocked(getPersonalTasks).mockResolvedValue([task, assignedTask]);
        vi.mocked(completeTask).mockResolvedValue({ ...assignedTask, status: "CONCLUIDA" });
        vi.mocked(reopenTask).mockResolvedValue(assignedTask);
        render(<TasksPage initialScope="personal" />);

        expect(await screen.findByRole("heading", { name: task.title })).toBeInTheDocument();
        const row = (await screen.findByRole("heading", { name: assignedTask.title })).closest(
            "article"
        )!;
        expect(within(row).getByText("Da casa")).toBeInTheDocument();
        expect(within(row).getByText("Privada")).toBeInTheDocument();
        expect(within(row).getByAltText(`Foto de ${ana.name}`)).toHaveAttribute(
            "src",
            "/ana-avatar.png"
        );
        expect(within(row).queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();
        await user.click(
            within(row).getByRole("checkbox", { name: `Concluir ${assignedTask.title}` })
        );
        expect(completeTask).toHaveBeenCalledWith(residence.id, assignedTask.id);
        expect(completePersonalTask).not.toHaveBeenCalled();
        await user.click(
            await within(row).findByRole("checkbox", { name: `Reabrir ${assignedTask.title}` })
        );
        expect(reopenTask).toHaveBeenCalledWith(residence.id, assignedTask.id);
    });

    it("shows validation in the form and reveals a newly saved private household task", async () => {
        const user = userEvent.setup();
        const privateTask: Task = {
            ...residenceTask,
            id: "private-task-id",
            title: "Revisar documentos",
            visibility: "PRIVADA",
        };
        vi.mocked(getTaskResidences).mockResolvedValue([
            {
                ...residence,
                creationEditPolicy: "LIDERES",
                membership: { id: ana.id, role: "MORADOR", canEditContent: true },
            },
        ]);
        vi.mocked(getTaskMembers).mockResolvedValue([ana, bruno]);
        vi.mocked(getTasks).mockResolvedValue([residenceTask]);
        vi.mocked(createTask).mockResolvedValue(privateTask);

        render(<TasksPage />);

        await screen.findByRole("heading", { name: residenceTask.title });
        const search = screen.getByRole("textbox", { name: "Buscar tarefas" });
        await user.type(search, "limpar");
        await user.click(screen.getByRole("button", { name: "Nova tarefa" }));
        const dialog = within(screen.getByRole("dialog", { name: "Nova tarefa" }));
        await user.type(dialog.getByLabelText("Título *"), privateTask.title);
        await user.click(dialog.getByRole("button", { name: "Salvar tarefa" }));
        const error = await dialog.findByRole("alert");
        expect(error).toHaveTextContent("Selecione um responsável para a tarefa.");
        expect(error).toHaveFocus();

        await user.click(dialog.getByRole("button", { name: "Privada" }));
        expect(dialog.getByRole("button", { name: ana.name, pressed: true })).toBeInTheDocument();
        expect(dialog.queryByRole("button", { name: bruno.name })).not.toBeInTheDocument();
        await user.click(dialog.getByRole("button", { name: "Salvar tarefa" }));

        expect(createTask).toHaveBeenCalledWith(
            residence.id,
            expect.objectContaining({
                title: privateTask.title,
                visibility: "PRIVADA",
                assignmentType: "FIXA",
                assigneeId: ana.id,
            })
        );
        expect(await screen.findByRole("heading", { name: privateTask.title })).toBeInTheDocument();
        expect(screen.getByText("Privada")).toBeInTheDocument();
        expect(search).toHaveValue("");
        expect(screen.getByRole("status")).toHaveTextContent("Tarefa criada com sucesso.");
    }, 15_000);

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
    }, 15_000);

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

    it("lists completed residence tasks under all and applies each status filter", async () => {
        const user = userEvent.setup();
        const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        const pending = { ...residenceTask, dueAt: futureDate };
        const overdue: Task = {
            ...residenceTask,
            id: "residence-task-2",
            title: "Levar o lixo",
            dueAt: "2020-01-01T12:00:00.000Z",
            status: "ATRASADA",
        };
        const completed: Task = {
            ...residenceTask,
            id: "residence-task-3",
            title: "Regar as plantas",
            dueAt: futureDate,
            status: "CONCLUIDA",
            completedAt: new Date().toISOString(),
        };
        vi.mocked(getTaskResidences).mockResolvedValue([residence]);
        vi.mocked(getTaskMembers).mockResolvedValue([ana]);
        vi.mocked(getTasks).mockResolvedValue([pending, overdue, completed]);

        render(<TasksPage />);

        const filters = within(screen.getByRole("group", { name: "Filtrar por status" }));
        await screen.findByRole("heading", { name: completed.title });
        expect(filters.getByRole("button", { name: "Todas", pressed: true })).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: pending.title })).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: overdue.title })).toBeInTheDocument();

        await user.click(filters.getByRole("button", { name: "Atrasadas" }));
        expect(screen.getByRole("heading", { name: overdue.title })).toBeInTheDocument();
        expect(screen.queryByRole("heading", { name: pending.title })).not.toBeInTheDocument();
        expect(screen.queryByRole("heading", { name: completed.title })).not.toBeInTheDocument();

        await user.click(filters.getByRole("button", { name: "Pendentes" }));
        expect(screen.getByRole("heading", { name: pending.title })).toBeInTheDocument();
        expect(screen.queryByRole("heading", { name: completed.title })).not.toBeInTheDocument();

        await user.click(filters.getByRole("button", { name: "Concluídas" }));
        expect(screen.getByRole("heading", { name: completed.title })).toBeInTheDocument();
        expect(screen.queryByRole("heading", { name: overdue.title })).not.toBeInTheDocument();
        expect(screen.queryByRole("heading", { name: pending.title })).not.toBeInTheDocument();
    });

    it("sends an exchange from an assigned residence task with an optional suggestion", async () => {
        const user = userEvent.setup();
        const suggested: Task = {
            ...residenceTask,
            id: "residence-task-2",
            title: "Organizar a sala",
            assignee: { id: bruno.id, name: bruno.name },
        };
        vi.mocked(getTaskResidences).mockResolvedValue([residence]);
        vi.mocked(getTaskMembers).mockResolvedValue([ana, bruno]);
        vi.mocked(getTasks).mockResolvedValue([residenceTask, suggested]);
        vi.mocked(createTaskExchangeRequest).mockResolvedValue(undefined);

        render(<TasksPage />);

        await user.click(
            await screen.findByRole("button", {
                name: `Solicitar troca da tarefa ${residenceTask.title}`,
            })
        );
        expect(
            screen.queryByRole("button", { name: `Solicitar troca da tarefa ${suggested.title}` })
        ).not.toBeInTheDocument();
        const exchange = within(screen.getByRole("dialog", { name: "Solicitar troca" }));
        await user.click(exchange.getByRole("button", { name: bruno.name }));
        await user.click(
            exchange.getByRole("combobox", { name: `Tarefa desejada de ${bruno.name}` })
        );
        await user.click(exchange.getByRole("option", { name: suggested.title }));
        await user.click(exchange.getByRole("button", { name: "Enviar pedido" }));

        expect(await screen.findByText("Pedido de troca enviado.")).toBeInTheDocument();
        expect(createTaskExchangeRequest).toHaveBeenCalledOnce();
        expect(createTaskExchangeRequest).toHaveBeenCalledWith(
            residence.id,
            residenceTask.id,
            bruno.id,
            suggested.id
        );
    });

    it("shows the final task pair before accepting a different task", async () => {
        const user = userEvent.setup();
        const replacement = {
            ...residenceTask,
            id: "replacement-task",
            title: "Organizar a sala",
        };
        const incoming: TaskExchangeRequest = {
            id: "pending-exchange",
            status: "PENDENTE",
            type: "PONTUAL",
            incoming: true,
            requester: bruno.name,
            recipient: ana.name,
            task: { id: "offered-task", title: "Regar plantas", dueAt: task.dueAt },
            targetTask: residenceTask,
        };
        vi.mocked(getTaskResidences).mockResolvedValue([residence]);
        vi.mocked(getTasks).mockResolvedValue([residenceTask, replacement]);
        vi.mocked(getTaskExchangeRequests)
            .mockResolvedValueOnce([incoming])
            .mockResolvedValueOnce([{ ...incoming, status: "ACEITA", targetTask: replacement }]);
        vi.mocked(respondToTaskExchange).mockResolvedValue(undefined);

        render(<TasksPage />);

        await user.click(
            await screen.findByRole("combobox", {
                name: `Escolher tarefa para trocar com ${bruno.name}`,
            })
        );
        await user.click(screen.getByRole("option", { name: replacement.title }));
        const preview = screen.getByText(/A tarefa é diferente da sugestão/);
        expect(preview).toHaveTextContent("Você ficará com Regar plantas");
        expect(preview).toHaveTextContent("Bruno Lima ficará com Organizar a sala");
        expect(respondToTaskExchange).not.toHaveBeenCalled();

        await user.click(screen.getByRole("button", { name: "Aceitar troca" }));
        expect(respondToTaskExchange).toHaveBeenCalledWith(
            residence.id,
            incoming.id,
            "ACEITA",
            replacement.id,
            false
        );
        expect(await screen.findByRole("status")).toHaveTextContent("Troca aceita.");
    });
});
