import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import PasswordInput from "../PasswordInput";

describe("PasswordInput", () => {
  it("starts hidden, toggles visibility, and toggles back", async () => {
    const user = userEvent.setup();
    render(<PasswordInput id="password" aria-label="Password" />);
    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button"));
    expect(input).toHaveAttribute("type", "text");
    await user.click(screen.getByRole("button"));
    expect(input).toHaveAttribute("type", "password");
  });

  it("applies the error class and placeholder", () => {
    render(
      <PasswordInput id="password" aria-label="Password" error="Required" />,
    );
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "placeholder",
      "•••••••••••",
    );
    expect(screen.getByLabelText("Password").className).toContain(
      "border-red-500",
    );
  });
});
