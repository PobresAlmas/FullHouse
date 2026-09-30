import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { push, get, resetPassword } = vi.hoisted(() => ({
  push: vi.fn(),
  get: vi.fn(),
  resetPassword: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => ({ get }),
}));
vi.mock("@/features/auth/api/auth.api", () => ({ resetPassword }));
import CreateNewPasswordForm from "../CreateNewPasswordForm";

describe("CreateNewPasswordForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockImplementation((key: string) =>
      key === "email" ? "user@example.com" : "123456",
    );
  });

  it("renders both password fields and helper text", () => {
    render(<CreateNewPasswordForm />);
    expect(screen.getByLabelText("Nova senha")).toHaveAttribute(
      "type",
      "password",
    );
    expect(screen.getByLabelText("Confirmar nova senha")).toHaveAttribute(
      "type",
      "password",
    );
    expect(screen.getByText("Use pelo menos 8 caracteres")).toBeInTheDocument();
  });

  it("requires matching passwords before calling the API", async () => {
    const user = userEvent.setup();
    render(<CreateNewPasswordForm />);
    await user.type(screen.getByLabelText("Nova senha"), "new-password");
    await user.type(
      screen.getByLabelText("Confirmar nova senha"),
      "different-password",
    );
    await user.click(screen.getByRole("button", { name: "Alterar senha" }));
    expect(
      await screen.findByText("As senhas não coincidem"),
    ).toBeInTheDocument();
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it("resets the password and routes to success", async () => {
    const user = userEvent.setup();
    resetPassword.mockResolvedValue({});
    render(<CreateNewPasswordForm />);
    await user.type(screen.getByLabelText("Nova senha"), "new-password");
    await user.type(
      screen.getByLabelText("Confirmar nova senha"),
      "new-password",
    );
    await user.click(screen.getByRole("button", { name: "Alterar senha" }));
    await waitFor(() =>
      expect(resetPassword).toHaveBeenCalledWith({
        email: "user@example.com",
        code: "123456",
        password: "new-password",
      }),
    );
    expect(push).toHaveBeenCalledWith("/password-success");
  });

  it("does not call the API when email or code is missing", async () => {
    const user = userEvent.setup();
    get.mockReturnValue(null);
    render(<CreateNewPasswordForm />);
    await user.type(screen.getByLabelText("Nova senha"), "new-password");
    await user.type(
      screen.getByLabelText("Confirmar nova senha"),
      "new-password",
    );
    await user.click(screen.getByRole("button", { name: "Alterar senha" }));
    expect(resetPassword).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });
});
