import { api } from "@/services/api";

export type ProfileUpdate = {
    name?: string;
    nickname?: string;
    email?: string;
    currentPassword?: string;
    newPassword?: string;
};

export async function updateProfile(data: ProfileUpdate) {
    const response = await api.patch("/users/me", data);
    return response.data;
}

export async function uploadProfilePhoto(file: File) {
    const formData = new FormData();
    formData.append("photo", file);
    const response = await api.post("/users/me/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
}
