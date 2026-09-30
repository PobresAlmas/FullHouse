import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
vi.mock("@/components/auth/ProtectedRoute", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <section data-testid="protected">{children}</section>
  ),
}));
import PrivateLayout from "../layout";

describe("PrivateLayout", () => {
  it("wraps private page content in ProtectedRoute", () => {
    render(
      <PrivateLayout>
        <p>Private content</p>
      </PrivateLayout>,
    );
    expect(screen.getByTestId("protected")).toContainElement(
      screen.getByText("Private content"),
    );
  });
});
