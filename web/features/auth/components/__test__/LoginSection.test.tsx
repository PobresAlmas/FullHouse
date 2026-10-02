import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import LoginSection from "../LoginSection";

vi.mock("next/image", () => ({
    default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
        <div role="img" aria-label={props.alt} data-src={props.src} />
    ),
}));

describe("LoginSection", () => {
    it("shows the logo, product name, and description", () => {
        render(<LoginSection />);
        expect(screen.getByRole("img", { name: "Logo" })).toHaveAttribute("data-src", "/logo.png");
        expect(screen.getByRole("heading", { name: "FullHouse" })).toBeInTheDocument();
        expect(screen.getByText(/Organize a sua rotina/)).toBeInTheDocument();
    });
});
