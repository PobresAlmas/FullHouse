import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { push, refreshUser, login } = vi.hoisted(() => ({
  push: vi.fn(),
  refreshUser: vi.fn(),
  login: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ refreshUser }),
}));
vi.mock("@/features/auth/api/auth.api", () => ({ login }));
import LoginForm from "../LoginForm";

describe("LoginForm", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders fields, remember checkbox, and account links", () => {
    render(<LoginForm />);
    expect(screen.getByText("Entrar na sua conta")).toBeInTheDocument();
    expect(screen.getByLabelText("E-mail")).toBeInTheDocument();
    expect(screen.getByLabelText("Senha")).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: "Lembrar de mim" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Esqueceu sua senha?" }),
    ).toHaveAttribute("href", "/forgot-password");
  });

  it("logs in, refreshes the user, and routes to the private page", async () => {
    const user = userEvent.setup();
    login.mockResolvedValue({ user: { name: "Teste" } });
    render(<LoginForm />);
    await user.type(screen.getByLabelText("E-mail"), "teste@email.com");
    await user.type(screen.getByLabelText("Senha"), "12345678");
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    await waitFor(() =>
      expect(login).toHaveBeenCalledWith({
        email: "teste@email.com",
        password: "12345678",
      }),
    );
    expect(refreshUser).toHaveBeenCalledOnce();
    expect(push).toHaveBeenCalledWith("/test-private");
  });

  it("does not submit invalid credentials", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.type(screen.getByLabelText("E-mail"), "bad-email");
    await user.type(screen.getByLabelText("Senha"), "short");
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    expect(login).not.toHaveBeenCalled();
  });

  it("shows API error feedback and leaves the user on the form", async () => {
    const user = userEvent.setup();
    login.mockRejectedValue({ message: "Credenciais inválidas" });
    render(<LoginForm />);
    await user.type(screen.getByLabelText("E-mail"), "teste@email.com");
    await user.type(screen.getByLabelText("Senha"), "12345678");
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    expect(
      await screen.findByText("Credenciais inválidas"),
    ).toBeInTheDocument();
    expect(refreshUser).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("does not show a non-API exception", async () => {
    const user = userEvent.setup();
    login.mockRejectedValue("offline");
    render(<LoginForm />);
    await user.type(screen.getByLabelText("E-mail"), "teste@email.com");
    await user.type(screen.getByLabelText("Senha"), "12345678");
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    await waitFor(() => expect(login).toHaveBeenCalledOnce());
    expect(screen.queryByText("offline")).not.toBeInTheDocument();
  });
});
