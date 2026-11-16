import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import { RoomNegotiationMessagesQueryDto } from "./room-negotiation-messages-query.dto.js";

describe("RoomNegotiationMessagesQueryDto", () => {
    it("defaults to 30 messages and transforms a valid query limit", async () => {
        const defaults = plainToInstance(RoomNegotiationMessagesQueryDto, {});
        const query = plainToInstance(RoomNegotiationMessagesQueryDto, {
            before: "6f3a5d6e-7a8b-4c9d-8e0f-1a2b3c4d5e6f",
            limit: "50",
        });

        await expect(validate(defaults)).resolves.toHaveLength(0);
        expect(defaults.limit).toBe(30);
        await expect(validate(query)).resolves.toHaveLength(0);
        expect(query.limit).toBe(50);
    });

    it.each(["0", "51", "1.5", "invalid"])("rejects an invalid limit: %s", async (limit) => {
        const query = plainToInstance(RoomNegotiationMessagesQueryDto, { limit });

        await expect(validate(query)).resolves.not.toHaveLength(0);
    });

    it("rejects a malformed message cursor", async () => {
        const query = plainToInstance(RoomNegotiationMessagesQueryDto, { before: "not-a-uuid" });

        await expect(validate(query)).resolves.not.toHaveLength(0);
    });
});
