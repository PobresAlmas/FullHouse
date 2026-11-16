import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Task } from "../../api/tasks.api";
import {
    getErrorMessage,
    groupTasksByDate,
    initialForm,
    isPersonalTask,
    localDateKey,
    periodicityLabels,
    readPersonalTasks,
    savePersonalTasks,
    taskDateKey,
    taskToForm,
    toDateTimeLocal,
    toPersonalTask,
    toTaskInput,
} from "../tasks.utils";

const task: Task = {
    id: "task-1",
    definitionId: "definition-1",
    title: "Read",
    description: null,
    tags: ["study", "book"],
    color: null,
    assignmentType: "RODIZIO",
    rotationMemberIds: ["member-1", "member-2"],
    residenceId: "home-1",
    assignee: { id: "member-1", name: "Ana" },
    dueAt: "2026-12-10T18:00:00.000Z",
    periodicity: "SEMANAL",
    repeats: true,
    reminderAt: "2026-12-10T17:30:00.000Z",
    status: "PENDENTE",
    completedAt: null,
};

function overdueTask(id: string, daysAgo: number): Task {
    const dueAt = new Date();
    dueAt.setHours(12, 0, 0, 0);
    dueAt.setDate(dueAt.getDate() - daysAgo);

    return {
        id,
        definitionId: `definition-${id}`,
        title: `Task ${id}`,
        description: null,
        tags: [],
        color: null,
        assignmentType: "FIXA",
        rotationMemberIds: [],
        residenceId: "residence-1",
        assignee: null,
        dueAt: dueAt.toISOString(),
        periodicity: "SEMANAL",
        repeats: false,
        reminderAt: null,
        status: "ATRASADA",
        completedAt: null,
    };
}

describe("groupTasksByDate", () => {
    it("uses distinct stable keys for overdue dates with the same label", () => {
        const tasks = [overdueTask("task-1", 2), overdueTask("task-2", 1)];
        const groups = groupTasksByDate(tasks);

        expect(groups.map((group) => group.label)).toEqual(["Atrasadas", "Atrasadas"]);
        expect(groups.map((group) => group.key)).toEqual(tasks.map(taskDateKey));
        expect(new Set(groups.map((group) => group.key)).size).toBe(2);
    });
});

describe("task utilities", () => {
    beforeEach(() => window.localStorage.clear());

    it("provides form defaults, labels, and local calendar date keys", () => {
        expect(initialForm).toMatchObject({
            title: "",
            assignmentType: "FIXA",
            repeats: false,
            hasReminder: true,
            reminderMinutesBefore: "30",
        });
        expect(periodicityLabels.SEMANAL).toBe("Semanalmente");
        expect(localDateKey(new Date(2026, 11, 10, 12))).toBe("2026-12-10");
        expect(taskDateKey(task)).toBe(localDateKey(new Date(task.dueAt)));
    });

    it("reads API and ordinary error messages and uses a fallback otherwise", () => {
        expect(getErrorMessage({ response: { data: { message: "Not allowed" } } })).toBe(
            "Not allowed"
        );
        expect(getErrorMessage({ response: { data: { message: ["First", "Second"] } } })).toBe(
            "First Second"
        );
        expect(getErrorMessage(new Error("Network unavailable"))).toBe("Network unavailable");
        expect(getErrorMessage(null)).toBe(
            "Não foi possível concluir a operação. Tente novamente."
        );
    });

    it("formats task dates for a local input and restores the task form state", () => {
        const date = new Date(task.dueAt);
        const expectedLocalInput = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
            .toISOString()
            .slice(0, 16);
        expect(toDateTimeLocal(task.dueAt)).toBe(expectedLocalInput);

        expect(taskToForm(task)).toMatchObject({
            title: "Read",
            description: "",
            tags: "study, book",
            assigneeId: "member-1",
            assignmentType: "RODIZIO",
            assigneeIds: ["member-1", "member-2"],
            color: "#4f7f63",
            hasReminder: true,
            reminderMinutesBefore: "30",
        });
    });

    it("builds task input with normalized tags and only sends recurrence when enabled", () => {
        const form = {
            ...initialForm,
            title: "  Read  ",
            description: "   ",
            tags: " Study, , Books ",
            assignmentType: "RODIZIO" as const,
            assigneeIds: ["member-1", "member-2"],
            dueAt: "2026-12-10T18:00",
            repeats: true,
            hasReminder: true,
            reminderMinutesBefore: "15",
        };
        expect(toTaskInput(form)).toEqual({
            title: "Read",
            description: null,
            tags: ["Study", "Books"],
            assigneeId: null,
            assignmentType: "RODIZIO",
            assigneeIds: ["member-1", "member-2"],
            color: "#4f7f63",
            dueAt: new Date(form.dueAt).toISOString(),
            repeats: true,
            periodicity: "SEMANAL",
            reminderMinutesBefore: 15,
        });

        expect(
            toTaskInput({ ...form, assignmentType: "FIXA", repeats: false, hasReminder: false })
        ).toMatchObject({ assigneeIds: [], reminderMinutesBefore: null, repeats: false });
        expect(
            toTaskInput({ ...form, assignmentType: "FIXA", repeats: false, hasReminder: false })
        ).not.toHaveProperty("periodicity");
    });

    it("handles missing, invalid, and non-array local task storage safely", () => {
        expect(readPersonalTasks("user-1")).toEqual([]);
        window.localStorage.setItem("fullhouse:personal-tasks:user-1", "{");
        expect(readPersonalTasks("user-1")).toEqual([]);
        window.localStorage.setItem("fullhouse:personal-tasks:user-1", JSON.stringify({ task }));
        expect(readPersonalTasks("user-1")).toEqual([]);
    });

    it("saves and reads personal tasks and tolerates browser storage failures", () => {
        savePersonalTasks("user-1", [task]);
        expect(readPersonalTasks("user-1")).toEqual([task]);

        vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
            throw new Error("Storage quota exceeded");
        });
        expect(() => savePersonalTasks("user-1", [task])).not.toThrow();
    });

    it("converts task input into a local task and preserves identity when editing", () => {
        const input = {
            title: "Read",
            dueAt: task.dueAt,
            repeats: false,
            reminderMinutesBefore: 20,
        };
        const created = toPersonalTask(input);
        expect(created).toMatchObject({
            title: "Read",
            residenceId: null,
            status: "PENDENTE",
            reminderAt: "2026-12-10T17:40:00.000Z",
        });
        expect(created.id).toMatch(/^local-/);
        expect(isPersonalTask(created)).toBe(true);
        expect(isPersonalTask(task)).toBe(false);

        const updated = toPersonalTask(
            { ...input, title: "Updated" },
            {
                ...task,
                status: "CONCLUIDA",
                completedAt: "2026-12-10T20:00:00.000Z",
            }
        );
        expect(updated).toMatchObject({
            id: task.id,
            definitionId: task.definitionId,
            title: "Updated",
            status: "CONCLUIDA",
            completedAt: "2026-12-10T20:00:00.000Z",
        });
    });
});
