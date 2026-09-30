import { vi } from "vitest";

export const mockRefreshUser = vi.fn();

vi.mock("@/features/auth/hooks/useAuth", () => ({
    useAuth: () => ({
        refreshUser: mockRefreshUser
    })
}));