import { vi } from "vitest";

export const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
    useRouter: () => ({
        push: mockPush,
    }),

    useSearchParams: () => ({
        get: vi.fn()
            .mockReturnValue("teste@email.com")
    }),
}));