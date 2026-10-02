import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { z } from "zod";
import { useAuthForm } from "../useAuthForm";

describe("useAuthForm", () => {
    const schema = z.object({
        email: z.email(),
        password: z.string().min(8),
    });

    it("should submit valid data", async () => {
        const { result } = renderHook(() => useAuthForm(schema));

        const onSubmit = vi.fn();

        const form = document.createElement("form");

        const submitHandler = result.current.handleSubmit(onSubmit);

        form.addEventListener("submit", (event) =>
            submitHandler(event as unknown as Parameters<typeof submitHandler>[0])
        );

        await act(async () => {
            form.dispatchEvent(
                new SubmitEvent("submit", {
                    bubbles: true,
                    cancelable: true,
                })
            );
        });

        expect(onSubmit).toHaveBeenCalled();
    });

    it("should not submit invalid data", async () => {
        const { result } = renderHook(() => useAuthForm(schema));

        const onSubmit = vi.fn();

        const form = document.createElement("form");

        const submitHandler = result.current.handleSubmit(onSubmit);

        form.addEventListener("submit", (event) =>
            submitHandler(event as unknown as Parameters<typeof submitHandler>[0])
        );

        await act(async () => {
            form.dispatchEvent(
                new SubmitEvent("submit", {
                    bubbles: true,
                    cancelable: true,
                })
            );
        });

        expect(onSubmit).not.toHaveBeenCalled();
    });
});
