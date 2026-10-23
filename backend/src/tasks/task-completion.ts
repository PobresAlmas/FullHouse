type TaskPeriodicity = "DIARIA" | "SEMANAL" | "QUINZENAL" | "MENSAL" | "PERSONALIZADA";
type TaskAssignmentType = "FIXA" | "RODIZIO";

export type TaskCompletionPlan = {
    completedAt: Date;
    nextOccurrence: {
        dueAt: Date;
        assigneeId: string | null;
        rotationOrder: number | null;
        reminder: {
            userId: string;
            title: string;
            minutesBefore: number;
        } | null;
    } | null;
};

export function planTaskCompletion(input: {
    completedAt: Date;
    dueAt: Date;
    repeats: boolean;
    periodicity: TaskPeriodicity;
    assignmentType: TaskAssignmentType;
    rotation: { memberId: string; userId: string }[];
    currentRotationOrder: number | null;
    currentAssigneeId: string | null;
    currentAssigneeUserId: string | undefined;
    reminderAt: Date | undefined;
    title: string;
    currentUserId: string;
}): TaskCompletionPlan {
    if (!input.repeats) {
        return { completedAt: input.completedAt, nextOccurrence: null };
    }

    const nextDueAt = getNextOccurrenceDate(input.dueAt, input.periodicity);
    const rotation = input.assignmentType === "RODIZIO" ? input.rotation : [];
    const nextOrder = rotation.length
        ? ((input.currentRotationOrder ?? 0) + 1) % rotation.length
        : 0;
    const nextMember = rotation[nextOrder];
    const reminderMinutesBefore = getReminderLeadMinutes(input.dueAt, input.reminderAt);

    return {
        completedAt: input.completedAt,
        nextOccurrence: {
            dueAt: nextDueAt,
            assigneeId: nextMember?.memberId ?? input.currentAssigneeId,
            rotationOrder: rotation.length ? nextOrder : null,
            reminder:
                reminderMinutesBefore === null
                    ? null
                    : {
                          userId:
                              nextMember?.userId ??
                              input.currentAssigneeUserId ??
                              input.currentUserId,
                          title: input.title,
                          minutesBefore: reminderMinutesBefore,
                      },
        },
    };
}

export function getNextOccurrenceDate(dueAt: Date, periodicity: TaskPeriodicity) {
    const nextDueAt = new Date(dueAt);

    switch (periodicity) {
        case "DIARIA":
            nextDueAt.setUTCDate(nextDueAt.getUTCDate() + 1);
            return nextDueAt;
        case "SEMANAL":
            nextDueAt.setUTCDate(nextDueAt.getUTCDate() + 7);
            return nextDueAt;
        case "QUINZENAL":
            nextDueAt.setUTCDate(nextDueAt.getUTCDate() + 14);
            return nextDueAt;
        case "MENSAL": {
            const dayOfMonth = nextDueAt.getUTCDate();
            nextDueAt.setUTCDate(1);
            nextDueAt.setUTCMonth(nextDueAt.getUTCMonth() + 1);
            const lastDayOfMonth = new Date(
                Date.UTC(nextDueAt.getUTCFullYear(), nextDueAt.getUTCMonth() + 1, 0)
            ).getUTCDate();
            nextDueAt.setUTCDate(Math.min(dayOfMonth, lastDayOfMonth));
            return nextDueAt;
        }
        case "PERSONALIZADA":
            throw new Error("A frequência personalizada não pode ser recorrente.");
        default:
            throw new Error(`Frequência de recorrência não suportada: ${periodicity}.`);
    }
}

export function getReminderLeadMinutes(dueAt: Date, reminderAt: Date | undefined) {
    if (!reminderAt) return null;
    return Math.max(0, Math.round((dueAt.getTime() - reminderAt.getTime()) / 60_000));
}
