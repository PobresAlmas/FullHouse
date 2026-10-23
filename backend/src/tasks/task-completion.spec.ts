import { TaskPeriodicity } from "./dto/create-task.dto.js";
import {
    getNextOccurrenceDate,
    getReminderLeadMinutes,
    planTaskCompletion,
} from "./task-completion.js";

describe("task recurrence", () => {
    it.each([
        [TaskPeriodicity.DIARIA, "2099-10-21T18:00:00.000Z"],
        [TaskPeriodicity.SEMANAL, "2099-10-27T18:00:00.000Z"],
        [TaskPeriodicity.QUINZENAL, "2099-11-03T18:00:00.000Z"],
        [TaskPeriodicity.MENSAL, "2099-11-20T18:00:00.000Z"],
    ])("calculates the next %s occurrence and preserves its time", (periodicity, expected) => {
        expect(getNextOccurrenceDate(new Date("2099-10-20T18:00:00.000Z"), periodicity)).toEqual(
            new Date(expected)
        );
    });

    it.each([
        ["2099-01-31T18:00:00.000Z", "2099-02-28T18:00:00.000Z"],
        ["2099-02-28T18:00:00.000Z", "2099-03-28T18:00:00.000Z"],
        ["2096-01-31T18:00:00.000Z", "2096-02-29T18:00:00.000Z"],
    ])("clamps monthly dates to the current month's day when possible", (dueAt, expected) => {
        expect(getNextOccurrenceDate(new Date(dueAt), TaskPeriodicity.MENSAL)).toEqual(
            new Date(expected)
        );
    });

    it("calculates the reminder lead time and handles missing or past reminders", () => {
        const dueAt = new Date("2099-10-20T18:00:00.000Z");

        expect(getReminderLeadMinutes(dueAt, new Date("2099-10-20T17:30:00.000Z"))).toBe(30);
        expect(getReminderLeadMinutes(dueAt, undefined)).toBeNull();
        expect(getReminderLeadMinutes(dueAt, new Date("2099-10-20T18:30:00.000Z"))).toBe(0);
    });

    it("plans a recurring task for the next rotation member and carries its reminder", () => {
        const plan = planTaskCompletion({
            completedAt: new Date("2099-10-20T19:00:00.000Z"),
            dueAt: new Date("2099-10-20T18:00:00.000Z"),
            repeats: true,
            periodicity: TaskPeriodicity.SEMANAL,
            assignmentType: "RODIZIO",
            rotation: [
                { memberId: "member-1", userId: "user-1" },
                { memberId: "member-2", userId: "user-2" },
            ],
            currentRotationOrder: 0,
            currentAssigneeId: "member-1",
            currentAssigneeUserId: "user-1",
            reminderAt: new Date("2099-10-20T17:30:00.000Z"),
            title: "Limpar cozinha",
            currentUserId: "completing-user",
        });

        expect(plan.nextOccurrence).toEqual({
            dueAt: new Date("2099-10-27T18:00:00.000Z"),
            assigneeId: "member-2",
            rotationOrder: 1,
            reminder: {
                userId: "user-2",
                title: "Limpar cozinha",
                minutesBefore: 30,
            },
        });
    });

    it("does not schedule a next instance for non-recurring tasks", () => {
        const plan = planTaskCompletion({
            completedAt: new Date("2099-10-20T19:00:00.000Z"),
            dueAt: new Date("2099-10-20T18:00:00.000Z"),
            repeats: false,
            periodicity: TaskPeriodicity.PERSONALIZADA,
            assignmentType: "FIXA",
            rotation: [],
            currentRotationOrder: null,
            currentAssigneeId: "member-1",
            currentAssigneeUserId: "user-1",
            reminderAt: undefined,
            title: "Limpar cozinha",
            currentUserId: "completing-user",
        });

        expect(plan.nextOccurrence).toBeNull();
    });
});
