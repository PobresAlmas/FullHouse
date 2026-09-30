import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { push, get, forgotPassword, verifyResetCode } = vi.hoisted(() => ({
  push: vi.fn(),
  get: vi.fn(),
  forgotPassword: vi.fn(),
  verifyResetCode: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => ({ get }),
}));
vi.mock("@/features/auth/api/auth.api", () => ({
  forgotPassword,
  verifyResetCode,
}));
import VerifyEmailForm from "../VerifyEmailForm";

describe("VerifyEmailForm", () => {
  afterEach(() => vi.restoreAllMocks());

  beforeEach(() => {
    vi.clearAllMocks();
    get.mockImplementation((key: string) =>
      key === "email" ? "user@example.com" : null,
    );
  });

  it("renders the code entry and initial resend countdown", () => {
    render(<VerifyEmailForm />);
    expect(screen.getByText("Verifique o seu email")).toBeInTheDocument();
    expect(screen.getAllByRole("textbox")).toHaveLength(6);
    expect(screen.getByText("Reenviar código em")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voltar" })).toHaveAttribute(
      "href",
      "/Forgot-password",
    );
  });

  it("verifies a valid code and routes to password creation", async () => {
    const user = userEvent.setup();
    verifyResetCode.mockResolvedValue({ valid: true });
    render(<VerifyEmailForm />);
    for (const [index, digit] of [..."123456"].entries())
      await user.type(screen.getAllByRole("textbox")[index], digit);
    await user.click(screen.getByRole("button", { name: "Confirmar código" }));
    await waitFor(() =>
      expect(verifyResetCode).toHaveBeenCalledWith(
        "user@example.com",
        "123456",
      ),
    );
    expect(push).toHaveBeenCalledWith(
      "/create-new-password?email=user@example.com&code=123456",
    );
  });

  it("keeps the user on verification when the code is invalid", async () => {
    const user = userEvent.setup();
    verifyResetCode.mockResolvedValue({ valid: false });
    render(<VerifyEmailForm />);
    for (const [index, digit] of [..."000000"].entries())
      await user.type(screen.getAllByRole("textbox")[index], digit);
    await user.click(screen.getByRole("button", { name: "Confirmar código" }));
    await waitFor(() =>
      expect(verifyResetCode).toHaveBeenCalledWith(
        "user@example.com",
        "000000",
      ),
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("resends a code after the countdown and resets the timer", async () => {
    const scheduled: Array<() => void> = [];
    vi.spyOn(globalThis, "setTimeout").mockImplementation((callback) => {
      scheduled.push(callback as () => void);
      return 1 as unknown as ReturnType<typeof setTimeout>;
    });
    vi.spyOn(globalThis, "clearTimeout").mockImplementation(() => undefined);
    forgotPassword.mockResolvedValue({});
    render(<VerifyEmailForm />);
    for (let second = 0; second < 60; second += 1) {
      const tick = scheduled.at(-1);
      await act(async () => {
        tick?.();
      });
    }
    expect(
      screen.getByRole("button", { name: "Reenviar código" }),
    ).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Reenviar código" }));
      await Promise.resolve();
    });
    expect(forgotPassword).toHaveBeenCalledWith("user@example.com");
    expect(screen.getByText("Reenviar código em")).toBeInTheDocument();
  });

  it("does not request a new code when no email is present", async () => {
    const scheduled: Array<() => void> = [];
    vi.spyOn(globalThis, "setTimeout").mockImplementation((callback) => {
      scheduled.push(callback as () => void);
      return 1 as unknown as ReturnType<typeof setTimeout>;
    });
    vi.spyOn(globalThis, "clearTimeout").mockImplementation(() => undefined);
    get.mockReturnValue(null);
    render(<VerifyEmailForm />);
    for (let second = 0; second < 60; second += 1) {
      const tick = scheduled.at(-1);
      await act(async () => {
        tick?.();
      });
    }
    expect(
      screen.getByRole("button", { name: "Reenviar código" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reenviar código" }));
    expect(forgotPassword).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
