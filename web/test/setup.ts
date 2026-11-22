import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";

import { afterEach, vi } from "vitest";

vi.mock("next/image", async () => {
    const React = await vi.importActual<typeof import("react")>("react");

    return {
        default: (props: Record<string, unknown>) =>
            React.createElement("img", props as React.ImgHTMLAttributes<HTMLImageElement>),
    };
});

afterEach(() => {
    cleanup();
});
