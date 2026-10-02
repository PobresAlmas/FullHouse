import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Separator } from "../separator";

describe("Separator", () => {
    it("renders horizontal orientation by default", () => {
        render(<Separator />);
        expect(screen.getByRole("separator")).toHaveAttribute("aria-orientation", "horizontal");
    });

    it("supports vertical orientation", () => {
        render(<Separator orientation="vertical" />);
        expect(screen.getByRole("separator")).toHaveAttribute("aria-orientation", "vertical");
    });
});
