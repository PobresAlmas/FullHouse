import { describe, expect, it } from "vitest";
import type { AxiosResponse } from "axios";
import { api } from "../api";

describe("api client", () => {
    const getResponseHandler = () => {
        const handler = api.interceptors.response.handlers?.[0];
        if (!handler) {
            throw new Error("Response interceptor handler is not registered.");
        }
        return handler;
    };

    it("uses the configured base URL and sends credentials", () => {
        expect(api.defaults.baseURL).toBe("http://localhost:3000");
        expect(api.defaults.withCredentials).toBe(true);
    });

    it("passes successful responses through the response interceptor", () => {
        const handler = getResponseHandler();
        const response = { data: "ok" };
        expect(handler.fulfilled?.(response as AxiosResponse)).toBe(response);
    });

    it("maps server failures with a message and status", async () => {
        const handler = getResponseHandler();
        await expect(
            handler.rejected?.({
                response: { data: { message: "Unauthorized" }, status: 401 },
            })
        ).rejects.toEqual({ message: "Unauthorized", status: 401 });
    });

    it("uses a fallback when a server failure has no message", async () => {
        const handler = getResponseHandler();
        await expect(handler.rejected?.({})).rejects.toEqual({
            message: "Ocorreu um erro inesperado.",
            status: undefined,
        });
    });
});
