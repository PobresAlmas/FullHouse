import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import { NotificationsQueryDto } from "./notifications-query.dto.js";

describe("NotificationsQueryDto", () => {
    it("defaults to twenty items and accepts limits from one through fifty", async () => {
        const defaults = plainToInstance(NotificationsQueryDto, {});
        expect(defaults.limit).toBe(20);
        expect(await validate(defaults)).toHaveLength(0);
        expect(
            await validate(plainToInstance(NotificationsQueryDto, { limit: "50" }))
        ).toHaveLength(0);
    });

    it.each(["0", "51", "1.5", "NaN"])("rejects unsafe limits %s", async (limit) => {
        const dto = plainToInstance(NotificationsQueryDto, { limit });
        expect(await validate(dto)).not.toHaveLength(0);
    });

    it("rejects malformed cursors", async () => {
        const dto = plainToInstance(NotificationsQueryDto, { cursor: "not-an-id" });
        expect(await validate(dto)).not.toHaveLength(0);
    });

    it("accepts only boolean unread filters", async () => {
        expect(
            await validate(plainToInstance(NotificationsQueryDto, { unreadOnly: "true" }))
        ).toHaveLength(0);
        expect(
            await validate(plainToInstance(NotificationsQueryDto, { unreadOnly: "maybe" }))
        ).not.toHaveLength(0);
    });
});
