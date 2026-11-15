import { api } from "@/services/api";

export type HouseRule = {
    id: string;
    title: string;
    description: string;
    createdAt: string;
    createdBy: string;
    updatedBy: string;
};

export async function getHouseRules(residenceId: string) {
    const response = await api.get<HouseRule[]>(`/residences/${residenceId}/rules`);
    return response.data;
}

export async function createHouseRule(
    residenceId: string,
    data: Pick<HouseRule, "title" | "description">
) {
    const response = await api.post<HouseRule>(`/residences/${residenceId}/rules`, data);
    return response.data;
}

export async function updateHouseRule(
    residenceId: string,
    ruleId: string,
    data: Pick<HouseRule, "title" | "description">
) {
    const response = await api.patch<HouseRule>(`/residences/${residenceId}/rules/${ruleId}`, data);
    return response.data;
}
