import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PasswordField from "../PasswordField";

describe("PasswordField", () => {
  it("renders a labelled password control and helper text", () => {
    render(
      <PasswordField
        id="new-password"
        label="New password"
        helperText="At least 8 characters"
      />,
    );
    expect(screen.getByLabelText("New password")).toHaveAttribute(
      "type",
      "password",
    );
    expect(screen.getByText("At least 8 characters")).toBeInTheDocument();
  });

  it("displays error feedback", () => {
    render(
      <PasswordField
        id="new-password"
        label="New password"
        error="Too short"
      />,
    );
    expect(screen.getByText("Too short")).toBeInTheDocument();
  });
});
