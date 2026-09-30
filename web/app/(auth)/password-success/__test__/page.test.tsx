import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
import PasswordSuccessPage from "../page";
describe("PasswordSuccessPage", () => {
  it("confirms the password update and links back to login", async () => {
    const user = userEvent.setup();
    render(<PasswordSuccessPage />);
    expect(
      screen.getByRole("heading", { name: "Senha alterada!" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Sua senha foi atualizada com sucesso."),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Ir para o login" }));
    expect(push).toHaveBeenCalledWith("/login");
  });
});
