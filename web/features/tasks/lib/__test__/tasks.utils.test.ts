import { describe, expect, it } from "vitest";
import type { Task } from "../../api/tasks.api";
import { groupTasksByDate, taskDateKey } from "../tasks.utils";

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
