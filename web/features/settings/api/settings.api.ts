import { api } from "@/services/api";

export interface ResidencePreferences {
    notifications: {
        newTasks: boolean;
        newExpenses: boolean;
        upcomingDueDates: boolean;
        residentInvitations: boolean;
        houseUpdates: boolean;
    };
    pantry: { expirationNoticeDays: number; showExpired: boolean };
    finance: { dueNoticeDays: number; showOverdue: boolean };
    pets: {
        vaccineReminders: boolean;
        dewormingReminders: boolean;
        appointmentReminders: boolean;
    };
}

export type ResidencePreferencesUpdate = {
    notifications?: Partial<ResidencePreferences["notifications"]>;
    pantry?: Partial<ResidencePreferences["pantry"]>;
    finance?: Partial<ResidencePreferences["finance"]>;
    pets?: Partial<ResidencePreferences["pets"]>;
};

export async function getResidencePreferences(residenceId: string) {
    const response = await api.get<ResidencePreferences>(
        `/residences/${residenceId}/settings/preferences`
    );
    return response.data;
}

export async function updateResidencePreferences(
    residenceId: string,
    data: ResidencePreferencesUpdate
) {
    const response = await api.patch<ResidencePreferences>(
        `/residences/${residenceId}/settings/preferences`,
        data
    );
    return response.data;
}
