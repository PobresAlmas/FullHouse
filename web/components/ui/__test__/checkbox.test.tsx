import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Checkbox } from "../checkbox";

describe("Checkbox", () => {
  it("toggles its checked state when clicked", async () => {
    const user = userEvent.setup();
    render(<Checkbox aria-label="Remember me" />);
    const checkbox = screen.getByRole("checkbox", { name: "Remember me" });
    expect(checkbox).toHaveAttribute("aria-checked", "false");
    await user.click(checkbox);
    expect(checkbox).toHaveAttribute("aria-checked", "true");
  });

  it("forwards disabled and invalid states", () => {
    render(<Checkbox aria-label="Terms" disabled aria-invalid="true" />);
    expect(screen.getByRole("checkbox")).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.getByRole("checkbox")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });
});
