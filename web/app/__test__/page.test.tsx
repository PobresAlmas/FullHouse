import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "../page";

describe("Home page", () => {
    it("shows the product name", () => {
        render(<Home />);
        expect(screen.getByRole("heading", { name: "FullHouse" })).toBeInTheDocument();
    });
});
