import { render } from "@testing-library/react";
import { AuthProvider } from "@/providers/AuthProvider";


export function renderWithProviders(
    ui: React.ReactElement
) {
    return render(
        <AuthProvider>
            {ui}
        </AuthProvider>
    );
}