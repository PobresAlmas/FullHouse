import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import OtpInput from "../OtpInput";

describe("OtpInput", () => {
    it("renders the requested number of digit inputs and advances focus", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<OtpInput length={4} onChange={onChange} />);
        const inputs = screen.getAllByRole("textbox");
        expect(inputs).toHaveLength(4);
        await user.type(inputs[0], "3");
        expect(inputs[0]).toHaveValue("3");
        expect(inputs[1]).toHaveFocus();
        expect(onChange).toHaveBeenLastCalledWith("3");
    });

    it("rejects non-digits and pastes digits only up to its length", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<OtpInput length={3} onChange={onChange} />);
        const inputs = screen.getAllByRole("textbox");
        await user.type(inputs[0], "a");
        expect(inputs[0]).toHaveValue("");
        await user.click(inputs[0]);
        await user.paste("1a2-34");
        expect(inputs.map((input) => (input as HTMLInputElement).value).join("")).toBe("123");
        expect(onChange).toHaveBeenLastCalledWith("123");
    });

    it("clears a populated position, or clears the prior position and moves focus back", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<OtpInput length={2} onChange={onChange} />);
        const inputs = screen.getAllByRole("textbox");
        await user.type(inputs[0], "12");
        await user.keyboard("{Backspace}");
        expect(inputs[1]).toHaveValue("");
        await user.keyboard("{Backspace}");
        expect(inputs[0]).toHaveFocus();
        expect(inputs[0]).toHaveValue("");
    });

    it("ignores backspace on the first empty position and ignores a paste without digits", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<OtpInput length={2} onChange={onChange} />);
        const inputs = screen.getAllByRole("textbox");
        await user.click(inputs[0]);
        await user.keyboard("{Backspace}");
        expect(onChange).not.toHaveBeenCalled();

        fireEvent.paste(inputs[0], {
            clipboardData: { getData: () => "letters only" },
        });
        expect(onChange).not.toHaveBeenCalled();
        expect(inputs[0]).toHaveValue("");
    });

    it("reports an empty value without trying to advance focus", () => {
        const onChange = vi.fn();
        render(<OtpInput length={2} onChange={onChange} />);
        const inputs = screen.getAllByRole("textbox");
        fireEvent.change(inputs[0], { target: { value: "5" } });
        fireEvent.change(inputs[0], { target: { value: "" } });
        expect(onChange).toHaveBeenLastCalledWith("");
        expect(inputs[0]).not.toHaveFocus();
    });
});
