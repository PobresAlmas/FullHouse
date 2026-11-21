import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { UpdateResidencePreferencesDto } from "./update-residence-preferences.dto.js";

describe("UpdateResidencePreferencesDto", () => {
    const validateBody = (body: unknown) =>
        validate(plainToInstance(UpdateResidencePreferencesDto, body), {
            whitelist: true,
            forbidNonWhitelisted: true,
        });

    it.each([1, 3, 5, 7, 14])("accepts %i as an allowed notification lead-time", async (days) => {
        await expect(validateBody({ pantry: { expirationNoticeDays: days } })).resolves.toHaveLength(0);
        await expect(validateBody({ finance: { dueNoticeDays: days } })).resolves.toHaveLength(0);
    });

    it.each([0, 2, 6, 15, "5"])("rejects invalid notice days: %s", async (days) => {
        expect(await validateBody({ pantry: { expirationNoticeDays: days } })).not.toHaveLength(0);
    });

    it("accepts sparse boolean updates, including false", async () => {
        await expect(validateBody({ notifications: { houseUpdates: false }, pets: { vaccineReminders: true } }))
            .resolves.toHaveLength(0);
    });

    it("rejects non-boolean flags, unexpected sections and an empty nested object key", async () => {
        expect(await validateBody({ notifications: { newTasks: "true" } })).not.toHaveLength(0);
        expect(await validateBody({ notifications: { unknown: true } })).not.toHaveLength(0);
        expect(await validateBody({ unexpected: { enabled: true } })).not.toHaveLength(0);
    });
});
