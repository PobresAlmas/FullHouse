import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RoomsRoute from "../page";

const state = vi.hoisted(() => ({
    user: null as { id: string } | null,
    loading: false,
    replace: vi.fn(),
    router: null as { replace: ReturnType<typeof vi.fn> } | null,
    getResidences: vi.fn(),
}));
state.router = { replace: state.replace };

vi.mock("@/features/auth/hooks/useAuth", () => ({
    useAuth: () => ({ user: state.user, loading: state.loading }),
}));
vi.mock("next/navigation", () => ({
    useRouter: () => state.router,
}));
vi.mock("@/features/residences/api/residences.api", () => ({
    getResidences: state.getResidences,
    RESIDENCE_MEMBERSHIP_CHANGED_EVENT: "fullhouse:residence-membership-changed",
}));
vi.mock("@/features/rooms/components/RoomsPage", () => ({
    RoomsPage: () => <div data-testid="rooms-page">Busca de quartos</div>,
}));

describe("RoomsRoute", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        state.user = null;
        state.loading = false;
        state.getResidences.mockResolvedValue([]);
    });

    it("redirects users with an active residence and does not render the rooms page", async () => {
        state.user = { id: "resident-1" };
        state.getResidences.mockResolvedValue([{ id: "house-1" }]);

        render(<RoomsRoute />);

        await waitFor(() => expect(state.replace).toHaveBeenCalledWith("/"));
        expect(screen.queryByTestId("rooms-page")).not.toBeInTheDocument();
    });

    it("allows authenticated users without a residence to use room search", async () => {
        state.user = { id: "seeker-1" };

        render(<RoomsRoute />);

        expect(await screen.findByTestId("rooms-page")).toBeInTheDocument();
    });

    it("redirects anonymous visitors without rendering a guest greeting", async () => {
        render(<RoomsRoute />);

        await waitFor(() => expect(state.replace).toHaveBeenCalledWith("/login"));
        expect(screen.queryByTestId("rooms-page")).not.toBeInTheDocument();
        expect(screen.queryByText(/visitante/i)).not.toBeInTheDocument();
        expect(state.getResidences).not.toHaveBeenCalled();
    });

    it("redirects without rendering the route when residence membership cannot be verified", async () => {
        state.user = { id: "user-1" };
        state.getResidences.mockRejectedValueOnce(new Error("Residências indisponíveis"));

        render(<RoomsRoute />);

        await waitFor(() => expect(state.replace).toHaveBeenCalledWith("/"));
        expect(screen.queryByTestId("rooms-page")).not.toBeInTheDocument();
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("redirects after an active residence is added while the route is open", async () => {
        state.user = { id: "seeker-1" };
        state.getResidences.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: "house-1" }]);

        render(<RoomsRoute />);
        expect(await screen.findByTestId("rooms-page")).toBeInTheDocument();

        window.dispatchEvent(new Event("fullhouse:residence-membership-changed"));

        await waitFor(() => expect(state.replace).toHaveBeenCalledWith("/"));
        expect(screen.queryByTestId("rooms-page")).not.toBeInTheDocument();
    });
});
