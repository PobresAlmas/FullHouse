import TasksPage from "@/features/tasks/components/TasksPage";

export default async function TasksRoute({
    searchParams,
}: {
    searchParams: Promise<{ scope?: string | string[] }>;
}) {
    const { scope } = await searchParams;
    const initialScope = scope === "personal" ? "personal" : undefined;
    return <TasksPage key={initialScope ?? "default"} initialScope={initialScope} />;
}
