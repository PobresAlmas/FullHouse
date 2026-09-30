import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Label } from "../label";

describe("Label", () => {
  it("associates its text with the matching control", () => {
    render(
      <>
        <Label htmlFor="display-name">Name</Label>
        <input id="display-name" />
      </>,
    );
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByText("Name")).toHaveAttribute("data-slot", "label");
  });
});
