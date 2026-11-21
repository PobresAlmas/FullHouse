import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider } from "@/providers/AuthProvider";

export async function selectSystemOption(
    user: ReturnType<typeof userEvent.setup>,
    combobox: HTMLElement,
    optionName: string
) {
    await user.click(combobox);
    await user.click(await screen.findByRole("option", { name: optionName }));
}

export function renderWithProviders(ui: React.ReactElement) {
    return render(<AuthProvider>{ui}</AuthProvider>);
}
