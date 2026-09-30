import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { push, getMe, logoutRequest } = vi.hoisted(() => ({
  push: vi.fn(),
  getMe: vi.fn(),
  logoutRequest: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/features/auth/api/auth.api", () => ({
  getMe,
  logout: logoutRequest,
}));
import { AuthProvider } from "../AuthProvider";
import { useAuth } from "@/features/auth/hooks/useAuth";

function AuthConsumer() {
  const { user, loading, refreshUser, logout } = useAuth();
  return (
    <>
      <p>{loading ? "Loading" : (user?.email ?? "Signed out")}</p>
      <button onClick={refreshUser}>Refresh</button>
      <button onClick={logout}>Logout</button>
    </>
  );
}

describe("AuthProvider", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads the current user when mounted", async () => {
    getMe.mockResolvedValue({ id: "1", email: "user@example.com" });
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );
    expect(screen.getByText("Loading")).toBeInTheDocument();
    expect(await screen.findByText("user@example.com")).toBeInTheDocument();
  });

  it("sets an anonymous state when initial user loading fails", async () => {
    getMe.mockRejectedValue(new Error("offline"));
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );
    expect(await screen.findByText("Signed out")).toBeInTheDocument();
  });

  it("refreshes user data on demand", async () => {
    const user = userEvent.setup();
    getMe
      .mockResolvedValueOnce({ id: "1", email: "before@example.com" })
      .mockResolvedValueOnce({ id: "1", email: "after@example.com" });
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );
    await screen.findByText("before@example.com");
    await user.click(screen.getByRole("button", { name: "Refresh" }));
    expect(await screen.findByText("after@example.com")).toBeInTheDocument();
    expect(getMe).toHaveBeenCalledTimes(2);
  });

  it("logs out, clears the user, and routes to login", async () => {
    const user = userEvent.setup();
    getMe.mockResolvedValue({ id: "1", email: "user@example.com" });
    logoutRequest.mockResolvedValue(undefined);
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );
    await screen.findByText("user@example.com");
    await user.click(screen.getByRole("button", { name: "Logout" }));
    await waitFor(() =>
      expect(screen.getByText("Signed out")).toBeInTheDocument(),
    );
    expect(logoutRequest).toHaveBeenCalledOnce();
    expect(push).toHaveBeenCalledWith("/login");
  });
});

describe("useAuth", () => {
  it("throws when rendered outside its provider", () => {
    function OutsideProvider() {
      useAuth();
      return null;
    }
    expect(() => render(<OutsideProvider />)).toThrow(
      "useAuth precisa estar dentro de AuthProvider",
    );
  });
});
