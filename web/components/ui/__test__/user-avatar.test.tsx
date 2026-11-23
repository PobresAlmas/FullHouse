import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getAvatarGradient, UserAvatar } from "../user-avatar";

describe("UserAvatar", () => {
    it("renders an initial over the selected gradient for common avatar colors", () => {
        render(<UserAvatar name="willa" backgroundColor="#E2EFF7" />);
        const avatar = screen.getByText("W");
        expect(avatar).toHaveStyle({
            background: "linear-gradient(135deg, #256fa3 0%, #294c92 100%)",
        });
        expect(avatar).toHaveClass("rounded-xl", "text-white");
        expect(avatar).toHaveAttribute("aria-hidden", "true");
    });

    it("uses a safe default gradient for unknown colors and a question mark for blank names", () => {
        render(<UserAvatar name="  " backgroundColor="not-a-color" showInitial />);
        expect(screen.getByText("?")).toHaveStyle({ background: getAvatarGradient("#e8f3e8") });
        expect(getAvatarGradient("invalid")).toBe(getAvatarGradient("#e8f3e8"));
    });

    it("retains valid custom hues while keeping the gradient dark enough for the initial", () => {
        expect(getAvatarGradient("#E987AF")).toContain("color-mix(in srgb, #e987af 40%, #17121e)");
    });

    it("renders photos with descriptive alt text and supports the large circular avatar", () => {
        render(<UserAvatar name="Ana" photo="https://cdn.test/ana.png" size="lg" />);
        const photo = screen.getByRole("img", { name: "Foto de Ana" });
        expect(photo).toHaveAttribute("src", "https://cdn.test/ana.png");
        expect(photo).toHaveClass("size-24", "rounded-full", "object-cover");
    });

    it("shows the initial when a photo fails and displays a newly uploaded photo", () => {
        const { rerender } = render(<UserAvatar name="Ana" photo="/old-avatar.png" />);
        fireEvent.error(screen.getByRole("img", { name: "Foto de Ana" }));
        expect(screen.getByText("A")).toBeInTheDocument();

        rerender(<UserAvatar name="Ana" photo="/new-avatar.png" />);
        expect(screen.getByRole("img", { name: "Foto de Ana" })).toHaveAttribute(
            "src",
            "/new-avatar.png"
        );
    });

    it("supports compact rounded avatars, explicit circles, and an empty visual avatar", () => {
        const { rerender } = render(<UserAvatar name="Ana" size="xs" />);
        expect(screen.getByText("A")).toHaveClass("size-8", "rounded-xl");

        rerender(<UserAvatar name="Ana" size="md" shape="circle" />);
        expect(screen.getByText("A")).toHaveClass("size-12", "rounded-full");

        rerender(<UserAvatar name="Ana" size="sm" showInitial={false} />);
        expect(screen.queryByText("A")).not.toBeInTheDocument();
    });
});
