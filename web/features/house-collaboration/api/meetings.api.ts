import { api } from "@/services/api";

export type ResidenceMeeting = {
    id: string;
    title: string;
    agenda: string;
    dateTime: string;
    status: "AGENDADA" | "REALIZADA" | "CANCELADA" | "REAGENDADA";
    organizer: string;
    organizerMemberId: string;
    rescheduledFromId: string | null;
    participants: Array<{
        memberId: string;
        name: string;
        response: "PENDENTE" | "CONFIRMADO" | "RECUSADO";
        respondedAt: string | null;
    }>;
};

export type MeetingDraft = { dateTime: string; agenda: string };

export async function getMeetings(residenceId: string) {
    const response = await api.get<ResidenceMeeting[]>(`/residences/${residenceId}/meetings`);
    return response.data;
}

export async function createMeeting(residenceId: string, draft: MeetingDraft) {
    const response = await api.post<ResidenceMeeting>(`/residences/${residenceId}/meetings`, draft);
    return response.data;
}

export async function respondToMeeting(
    residenceId: string,
    meetingId: string,
    responseValue: "CONFIRMADO" | "RECUSADO"
) {
    const response = await api.patch<ResidenceMeeting>(
        `/residences/${residenceId}/meetings/${meetingId}/respond`,
        { response: responseValue }
    );
    return response.data;
}

export async function rescheduleMeeting(
    residenceId: string,
    meetingId: string,
    draft: MeetingDraft
) {
    const response = await api.patch<ResidenceMeeting>(
        `/residences/${residenceId}/meetings/${meetingId}/reschedule`,
        draft
    );
    return response.data;
}

export async function cancelMeeting(residenceId: string, meetingId: string) {
    const response = await api.patch<ResidenceMeeting>(
        `/residences/${residenceId}/meetings/${meetingId}/cancel`
    );
    return response.data;
}
