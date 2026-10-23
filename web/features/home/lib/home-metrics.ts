export const HOME_TIME_ZONE = "America/Fortaleza";

export function dayInBusinessTime(date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: HOME_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(date);
    const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
    return `${get("year")}-${get("month")}-${get("day")}`;
}

export function dayOf(value: string | null) {
    return value?.slice(0, 10) ?? null;
}

export function weekStart(day: string) {
    const date = new Date(`${day}T00:00:00.000Z`);
    const offset = (date.getUTCDay() + 6) % 7;
    date.setUTCDate(date.getUTCDate() - offset);
    return date.toISOString().slice(0, 10);
}

export function getHomeTaskMetrics<
    T extends {
        dueAt: string;
        status: string;
        completedAt: string | null;
    },
>(tasks: T[], today: string) {
    const week = weekStart(today);
    const nextWeek = new Date(`${week}T00:00:00.000Z`);
    nextWeek.setUTCDate(nextWeek.getUTCDate() + 7);
    const weekEnd = nextWeek.toISOString().slice(0, 10);
    const active = tasks.filter(
        (task) => task.status !== "CONCLUIDA" && task.status !== "CANCELADA"
    );
    const completedWeek = tasks.filter((task) => {
        const completed = dayOf(task.completedAt);
        return (
            task.status === "CONCLUIDA" &&
            completed !== null &&
            completed >= week &&
            completed < weekEnd
        );
    }).length;
    const scheduled = active.filter((task) => (dayOf(task.dueAt) ?? "") < weekEnd).length;
    const total = completedWeek + scheduled;

    return {
        overdue: active.filter((task) => (dayOf(task.dueAt) ?? "") < today),
        today: active.filter((task) => dayOf(task.dueAt) === today),
        completedWeek,
        scheduledWeek: scheduled,
        progress: total === 0 ? 0 : Math.round((completedWeek / total) * 100),
        weekStart: week,
        weekEnd,
    };
}
