import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MeetingsPage from "../page";
import {
    cancelMeeting,
    createMeeting,
    getMeetings,
    respondToMeeting,
    rescheduleMeeting,
} from "@/features/house-collaboration/api/meetings.api";
import { getResidences } from "@/features/residences/api/residences.api";
import { createResidenceFixture } from "@/test/fixtures/residence";

vi.mock("@/features/house-collaboration/api/meetings.api", () => ({
    cancelMeeting: vi.fn(),
    createMeeting: vi.fn(),
    getMeetings: vi.fn(),
    respondToMeeting: vi.fn(),
    rescheduleMeeting: vi.fn(),
}));
vi.mock("@/features/residences/api/residences.api", () => ({ getResidences: vi.fn() }));
vi.mock("@/features/auth/hooks/useAuth", () => ({ useAuth: () => ({ user: { name: "Ana" } }) }));
const residence = createResidenceFixture();
const meeting = {
    id: "mt1",
    title: "Reunião semanal",
    agenda: "Organizar a casa",
    dateTime: "2027-01-01T10:00:00Z",
    status: "AGENDADA" as const,
    organizer: "Ana",
    organizerMemberId: residence.membership!.id,
    rescheduledFromId: null,
    participants: [
        {
            memberId: residence.membership!.id,
            name: "Ana",
            response: "PENDENTE" as const,
            respondedAt: null,
        },
    ],
};

describe("MeetingsPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getResidences).mockResolvedValue([residence]);
        vi.mocked(getMeetings).mockResolvedValue([meeting]);
        vi.mocked(createMeeting).mockResolvedValue(meeting);
        vi.mocked(cancelMeeting).mockResolvedValue({ ...meeting, status: "CANCELADA" });
        vi.mocked(rescheduleMeeting).mockResolvedValue({
            ...meeting,
            id: "mt2",
            status: "AGENDADA",
            rescheduledFromId: meeting.id,
        });
        vi.mocked(respondToMeeting).mockResolvedValue({
            ...meeting,
            participants: [{ ...meeting.participants[0], response: "CONFIRMADO" }],
        });
    });

    it("displays invitations and lets the member respond", async () => {
        const user = userEvent.setup();
        render(<MeetingsPage />);
        expect(await screen.findByText("Reunião semanal")).toBeInTheDocument();
        expect(screen.getByText("Ana: Pendente")).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Confirmar presença" }));
        await waitFor(() =>
            expect(respondToMeeting).toHaveBeenCalledWith(residence.id, meeting.id, "CONFIRMADO")
        );
    });

    it("validates future dates and submits a meeting with an agenda", async () => {
        const user = userEvent.setup();
        render(<MeetingsPage />);
        await screen.findByText("Reunião semanal");
        await user.type(screen.getByRole("textbox", { name: "Pauta" }), "Planejar a semana");
        await user.click(screen.getByRole("button", { name: "Criar reunião" }));
        expect(await screen.findByRole("alert")).toHaveTextContent("Informe data, horário e pauta");
        await user.type(screen.getByLabelText("Data e horário"), "2027-01-02T10:00");
        await user.click(screen.getByRole("button", { name: "Criar reunião" }));
        await waitFor(() =>
            expect(createMeeting).toHaveBeenCalledWith(
                residence.id,
                expect.objectContaining({
                    agenda: "Planejar a semana",
                    dateTime: new Date("2027-01-02T10:00").toISOString(),
                })
            )
        );
    });

    it("lets the organizer reschedule and cancel a scheduled meeting", async () => {
        const user = userEvent.setup();
        render(<MeetingsPage />);
        await screen.findByText("Reunião semanal");
        await user.click(screen.getByRole("button", { name: "Reagendar" }));
        await user.type(screen.getByLabelText("Data e horário"), "2027-01-03T10:00");
        await user.click(screen.getByRole("button", { name: "Confirmar reagendamento" }));
        await waitFor(() =>
            expect(rescheduleMeeting).toHaveBeenCalledWith(
                residence.id,
                meeting.id,
                expect.objectContaining({ agenda: meeting.agenda })
            )
        );
        await user.click(screen.getByRole("button", { name: "Cancelar reunião" }));
        await waitFor(() => expect(cancelMeeting).toHaveBeenCalledWith(residence.id, meeting.id));
    });

    it("shows canceled and rescheduled historical meetings without response actions", async () => {
        vi.mocked(getMeetings).mockResolvedValue([
            { ...meeting, id: "canceled", status: "CANCELADA" },
            { ...meeting, id: "rescheduled", status: "REAGENDADA" },
        ]);
        render(<MeetingsPage />);
        expect(await screen.findByText(/Cancelada/)).toBeInTheDocument();
        expect(screen.getByText(/Reagendada/)).toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: "Confirmar presença" })
        ).not.toBeInTheDocument();
    });

    it("hides response and organizer actions from a member who is not invited", async () => {
        vi.mocked(getResidences).mockResolvedValue([
            { ...residence, membership: { ...residence.membership!, id: "other-member" } },
        ]);
        render(<MeetingsPage />);
        expect(await screen.findByText("Reunião semanal")).toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: "Confirmar presença" })
        ).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Reagendar" })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Cancelar reunião" })).not.toBeInTheDocument();
    });
});
