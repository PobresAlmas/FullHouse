import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import SubmitButton from "../SubmitButton";

describe("SubmitButton", () => {
  it("submits its containing form", async () => {
    const user = userEvent.setup();
    const submit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(
      <form onSubmit={submit}>
        <SubmitButton text="Continue" />
      </form>,
    );
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(submit).toHaveBeenCalledOnce();
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });
});
