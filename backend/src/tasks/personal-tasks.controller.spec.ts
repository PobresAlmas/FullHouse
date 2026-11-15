import { PersonalTasksController } from "./personal-tasks.controller.js";
import { TasksService } from "./tasks.service.js";

describe("PersonalTasksController", () => {
    const tasksService = {
        findPersonal: vi.fn(),
        createPersonal: vi.fn(),
        findPersonalOne: vi.fn(),
        updatePersonal: vi.fn(),
        completePersonal: vi.fn(),
        removePersonal: vi.fn(),
    };
    const controller = new PersonalTasksController(tasksService as unknown as TasksService);
    const user = { id: "user-id" };
    const taskId = "task-id";

    beforeEach(() => vi.clearAllMocks());

    it("delegates listing and creation for the authenticated user", async () => {
        const data = { title: "Read a book" };
        tasksService.findPersonal.mockResolvedValue([]);
        tasksService.createPersonal.mockResolvedValue({ id: taskId });

        await expect(controller.findAll(user)).resolves.toEqual([]);
        await expect(controller.create(data as never, user)).resolves.toEqual({ id: taskId });
        expect(tasksService.findPersonal).toHaveBeenCalledWith(user.id);
        expect(tasksService.createPersonal).toHaveBeenCalledWith(data, user.id);
    });

    it("delegates detail lookup, updates, completion, and deletion", async () => {
        const data = { title: "New title" };
        tasksService.findPersonalOne.mockResolvedValue({ id: taskId });
        tasksService.updatePersonal.mockResolvedValue({ id: taskId, title: "New title" });
        tasksService.completePersonal.mockResolvedValue({ id: taskId, status: "CONCLUIDA" });
        tasksService.removePersonal.mockResolvedValue({ id: taskId, deleted: true });

        await expect(controller.findOne(taskId, user)).resolves.toEqual({ id: taskId });
        await expect(controller.update(taskId, data as never, user)).resolves.toEqual({
            id: taskId,
            title: "New title",
        });
        await expect(controller.complete(taskId, user)).resolves.toEqual({
            id: taskId,
            status: "CONCLUIDA",
        });
        await expect(controller.remove(taskId, user)).resolves.toEqual({
            id: taskId,
            deleted: true,
        });

        expect(tasksService.findPersonalOne).toHaveBeenCalledWith(taskId, user.id);
        expect(tasksService.updatePersonal).toHaveBeenCalledWith(taskId, data, user.id);
        expect(tasksService.completePersonal).toHaveBeenCalledWith(taskId, user.id);
        expect(tasksService.removePersonal).toHaveBeenCalledWith(taskId, user.id);
    });
});
