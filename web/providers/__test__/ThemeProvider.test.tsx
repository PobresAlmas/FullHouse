import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider, useTheme } from "../ThemeProvider";

function Consumer() {
    const { theme, setTheme } = useTheme();
    return (
        <div>
            <output>{theme}</output>
            <button type="button" onClick={() => setTheme("light")}>
                Claro
            </button>
            <button type="button" onClick={() => setTheme("dark")}>
                Escuro
            </button>
            <button type="button" onClick={() => setTheme("system")}>
                Sistema
            </button>
        </div>
    );
}

describe("ThemeProvider", () => {
    let matches = false;
    let listeners: Array<(event: MediaQueryListEvent) => void>;
    let media: MediaQueryList;

    beforeEach(() => {
        localStorage.clear();
        document.documentElement.classList.remove("dark");
        document.documentElement.style.colorScheme = "";
        matches = false;
        listeners = [];
        media = {
            matches,
            media: "(prefers-color-scheme: dark)",
            onchange: null,
            addEventListener: vi.fn((_type, listener) =>
                listeners.push(listener as (event: MediaQueryListEvent) => void)
            ),
            removeEventListener: vi.fn((_type, listener) => {
                listeners = listeners.filter((registered) => registered !== listener);
            }),
            addListener: vi.fn(),
            removeListener: vi.fn(),
            dispatchEvent: vi.fn(() => true),
        } as unknown as MediaQueryList;
        vi.stubGlobal(
            "matchMedia",
            vi.fn(() => media)
        );
    });

    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
        document.documentElement.classList.remove("dark");
        document.documentElement.style.colorScheme = "";
    });

    it.each(["light", "dark", "system"] as const)("restores saved theme %s", async (theme) => {
        localStorage.setItem("fullhouse.theme", theme);
        render(
            <ThemeProvider>
                <Consumer />
            </ThemeProvider>
        );

        expect(await screen.findByText(theme)).toBeInTheDocument();
        await waitFor(() => {
            expect(document.documentElement.classList.contains("dark")).toBe(theme === "dark");
        });
        expect(document.documentElement.style.colorScheme).toBe(
            theme === "dark" ? "dark" : "light"
        );
    });

    it("ignores invalid saved values and applies an explicit theme selection", async () => {
        localStorage.setItem("fullhouse.theme", "sepia");
        render(
            <ThemeProvider>
                <Consumer />
            </ThemeProvider>
        );
        expect(await screen.findByText("light")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Escuro" }));
        await waitFor(() => expect(document.documentElement).toHaveClass("dark"));
        expect(localStorage.getItem("fullhouse.theme")).toBe("dark");

        fireEvent.click(screen.getByRole("button", { name: "Claro" }));
        await waitFor(() => expect(document.documentElement).not.toHaveClass("dark"));
        expect(localStorage.getItem("fullhouse.theme")).toBe("light");
    });

    it("tracks OS preference changes only while system mode is active and removes its listener", async () => {
        render(
            <ThemeProvider>
                <Consumer />
            </ThemeProvider>
        );
        fireEvent.click(screen.getByRole("button", { name: "Sistema" }));
        await waitFor(() => expect(localStorage.getItem("fullhouse.theme")).toBe("system"));
        expect(media.addEventListener).toHaveBeenCalledWith("change", expect.any(Function));

        matches = true;
        Object.defineProperty(media, "matches", { configurable: true, value: true });
        listeners.forEach((listener) => listener({ matches: true } as MediaQueryListEvent));
        await waitFor(() => expect(document.documentElement).toHaveClass("dark"));

        fireEvent.click(screen.getByRole("button", { name: "Claro" }));
        await waitFor(() => expect(document.documentElement).not.toHaveClass("dark"));
        expect(media.removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
    });
});
