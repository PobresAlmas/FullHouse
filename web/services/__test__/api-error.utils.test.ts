import { describe, expect, it } from "vitest";
import { isApiError } from "../api-error.utils";

describe("isApiError", () => {
    it("accepts objects with a message", () => {
        expect(isApiError({ message: "Request failed", status: 400 })).toBe(true);
    });

    it("rejects null, primitives, and objects without a message", () => {
        expect(isApiError(null)).toBe(false);
        expect(isApiError("failed")).toBe(false);
        expect(isApiError({ status: 400 })).toBe(false);
    });
});
