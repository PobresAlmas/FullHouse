import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
vi.mock("@/features/auth/components/LoginSection", () => ({
  default: () => <div>Brand header</div>,
}));
import AuthLayout from "../layout";

describe("AuthLayout", () => {
  it("wraps route content with the brand header", () => {
    render(
      <AuthLayout>
        <p>Route content</p>
      </AuthLayout>,
    );
    expect(screen.getByText("Brand header")).toBeInTheDocument();
    expect(
      screen.getByText("Route content").closest("main"),
    ).toBeInTheDocument();
  });
});
