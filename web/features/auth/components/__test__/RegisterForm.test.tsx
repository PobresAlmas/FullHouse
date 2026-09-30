import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { push, register } = vi.hoisted(() => ({
  push: vi.fn(),
  register: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/features/auth/api/auth.api", () => ({ register }));
import RegisterForm from "../RegisterForm";

describe("RegisterForm", () => {
  beforeEach(() => vi.clearAllMocks());

  async function completeForm(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText("Nome"), "Maria Silva");
    await user.type(screen.getByLabelText("Apelido"), "Maria");
    await user.type(screen.getByLabelText("E-mail"), "maria@example.com");
    await user.type(screen.getByLabelText("Senha"), "senha1234");
  }

  it("renders the account form fields and links", () => {
    render(<RegisterForm />);
    expect(screen.getByText("Criar sua conta")).toBeInTheDocument();
    expect(screen.getByLabelText("Nome")).toBeInTheDocument();
    expect(screen.getByLabelText("Apelido")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Entrar" })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("registers valid data and routes to photo upload", async () => {
    const user = userEvent.setup();
    register.mockResolvedValue({});
    render(<RegisterForm />);
    await completeForm(user);
    await user.click(screen.getByRole("button", { name: "Criar conta" }));
    await waitFor(() =>
      expect(register).toHaveBeenCalledWith({
        name: "Maria Silva",
        nickname: "Maria",
        email: "maria@example.com",
        password: "senha1234",
      }),
    );
    expect(push).toHaveBeenCalledWith("/upload-photo");
  });

  it("displays API error messages without navigating", async () => {
    const user = userEvent.setup();
    register.mockRejectedValue({ message: "E-mail já cadastrado" });
    render(<RegisterForm />);
    await completeForm(user);
    await user.click(screen.getByRole("button", { name: "Criar conta" }));
    expect(await screen.findByText("E-mail já cadastrado")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("does not show non-API exceptions", async () => {
    const user = userEvent.setup();
    register.mockRejectedValue("unexpected");
    render(<RegisterForm />);
    await completeForm(user);
    await user.click(screen.getByRole("button", { name: "Criar conta" }));
    await waitFor(() => expect(register).toHaveBeenCalledOnce());
    expect(screen.queryByText("unexpected")).not.toBeInTheDocument();
  });
});
