import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
const { push, useAuth } = vi.hoisted(() => ({
  push: vi.fn(),
  useAuth: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/features/auth/hooks/useAuth", () => ({ useAuth }));
import ProtectedRoute from "../ProtectedRoute";

describe("ProtectedRoute", () => {
  it("shows the loading state while authentication is unresolved", () => {
    useAuth.mockReturnValue({ loading: true, user: null });
    render(
      <ProtectedRoute>
        <p>Private content</p>
      </ProtectedRoute>,
    );
    expect(screen.getByText("Carregando...")).toBeInTheDocument();
    expect(screen.queryByText("Private content")).not.toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("redirects anonymous visitors to login", async () => {
    useAuth.mockReturnValue({ loading: false, user: null });
    render(
      <ProtectedRoute>
        <p>Private content</p>
      </ProtectedRoute>,
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith("/login"));
    expect(screen.queryByText("Private content")).not.toBeInTheDocument();
  });

  it("renders children for an authenticated user", () => {
    useAuth.mockReturnValue({ loading: false, user: { id: "1" } });
    render(
      <ProtectedRoute>
        <p>Private content</p>
      </ProtectedRoute>,
    );
    expect(screen.getByText("Private content")).toBeInTheDocument();
  });
});
