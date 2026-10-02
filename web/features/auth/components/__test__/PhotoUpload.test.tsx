import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import PhotoUpload from "../PhotoUpload";
import React from "react";

vi.mock("next/image", () => ({
    default: ({
        unoptimized: _unoptimized,
        ...props
    }: React.ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean }) => {
        void _unoptimized;
        return React.createElement("img", { ...props, alt: props.alt ?? "" });
    },
}));

describe("PhotoUpload", () => {
    afterEach(() => vi.unstubAllGlobals());

    it("opens the file picker from its visible button", async () => {
        const user = userEvent.setup();
        render(<PhotoUpload />);
        const input = document.querySelector('input[type="file"]') as HTMLInputElement;
        const click = vi.spyOn(input, "click");
        await user.click(screen.getByRole("button", { name: /Selecionar foto/ }));
        expect(click).toHaveBeenCalledOnce();
        expect(input).toHaveAttribute("accept", "image/png,image/jpeg");
    });

    it("shows image preview and reports the selected file", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        vi.stubGlobal("URL", {
            ...URL,
            createObjectURL: vi.fn(() => "blob:avatar"),
            revokeObjectURL: vi.fn(),
        });
        render(<PhotoUpload onChange={onChange} />);
        const file = new File(["image"], "avatar.jpg", { type: "image/jpeg" });
        await user.upload(document.querySelector('input[type="file"]') as HTMLInputElement, file);
        expect(onChange).toHaveBeenCalledWith(file);
        expect(screen.getByAltText("Preview da foto")).toHaveAttribute("src", "blob:avatar");
    });

    it("rejects non-image files and reports null", async () => {
        const user = userEvent.setup({ applyAccept: false });
        const onChange = vi.fn();
        render(<PhotoUpload onChange={onChange} />);
        const file = new File(["text"], "document.txt", { type: "text/plain" });
        await user.upload(document.querySelector('input[type="file"]') as HTMLInputElement, file);
        expect(await screen.findByText("Formato inválido. Use PNG ou JPG")).toBeInTheDocument();
        expect(onChange).toHaveBeenCalledWith(null);
    });

    it("rejects files above 5 MB", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<PhotoUpload onChange={onChange} />);
        const oversized = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.png", {
            type: "image/png",
        });
        await user.upload(
            document.querySelector('input[type="file"]') as HTMLInputElement,
            oversized
        );
        expect(await screen.findByText("A imagem deve ter no mínimo 5 MB")).toBeInTheDocument();
        expect(onChange).toHaveBeenCalledWith(null);
    });

    it("ignores an input change when no file was selected", () => {
        const onChange = vi.fn();
        render(<PhotoUpload onChange={onChange} />);
        fireEvent.change(document.querySelector('input[type="file"]') as HTMLInputElement, {
            target: { files: [] },
        });
        expect(onChange).not.toHaveBeenCalled();
        expect(screen.getByText("Selecionar foto")).toBeInTheDocument();
    });

    it("revokes a previous object URL when the preview is cleared", async () => {
        const user = userEvent.setup({ applyAccept: false });
        const revokeObjectURL = vi.fn();
        vi.stubGlobal("URL", {
            ...URL,
            createObjectURL: vi.fn(() => "blob:avatar"),
            revokeObjectURL,
        });
        const { rerender } = render(<PhotoUpload />);
        const input = document.querySelector('input[type="file"]') as HTMLInputElement;
        await user.upload(input, new File(["image"], "avatar.png", { type: "image/png" }));
        rerender(<PhotoUpload onChange={() => undefined} />);
        await user.upload(input, new File(["text"], "bad.txt", { type: "text/plain" }));
        await waitFor(() => expect(revokeObjectURL).toHaveBeenCalledWith("blob:avatar"));
    });
});
