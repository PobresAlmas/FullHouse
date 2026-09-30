import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import FieldMessage from "../FieldMessage";

describe("FieldMessage", () => {
  it("shows an error in preference to helper text", () => {
    render(<FieldMessage error="Invalid value" helperText="Helpful hint" />);
    expect(screen.getByText("Invalid value")).toBeInTheDocument();
    expect(screen.queryByText("Helpful hint")).not.toBeInTheDocument();
  });

  it("shows helper text when there is no error", () => {
    render(<FieldMessage helperText="Helpful hint" />);
    expect(screen.getByText("Helpful hint")).toBeInTheDocument();
  });

  it("renders nothing when no message is provided", () => {
    const { container } = render(<FieldMessage />);
    expect(container).toBeEmptyDOMElement();
  });
});
