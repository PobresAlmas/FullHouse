import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button, buttonVariants } from "../button";

describe("Button", () => {
  it("renders its label and forwards native attributes", () => {
    render(
      <Button disabled data-testid="save">
        Salvar
      </Button>,
    );
    expect(screen.getByTestId("save")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Salvar" })).toHaveAttribute(
      "data-slot",
      "button",
    );
  });

  it("supports variant, size and caller class overrides", () => {
    render(
      <Button variant="outline" size="lg" className="custom">
        Continuar
      </Button>,
    );
    expect(screen.getByRole("button").className).toContain("custom");
    expect(screen.getByRole("button").className).toContain("h-9");
    expect(buttonVariants({ variant: "destructive", size: "icon" })).toContain(
      "size-8",
    );
  });
});
