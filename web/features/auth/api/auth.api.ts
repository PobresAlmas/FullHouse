import { api } from "@/services/api";
import { RegisterFormData } from "../components/schemas/register.schema";

interface LoginRequest {
    email: string;
    password: string;
}

interface LoginResponse {
    access_token: string;

    user: {
        id: string;
        email: string;
        name: string;
    };
}

export async function login(data: LoginRequest): Promise<LoginResponse> {
    const response = await api.post("/auth/login", data);

    return response.data;
}

export async function getMe() {
    const response = await api.get("/auth/me");

    return response.data;
}

export async function logout() {
    await api.post("/auth/logout");
}

export async function register(data: RegisterFormData) {
    const response = await api.post("/auth/register", data);

    return response.data;
}

export async function forgotPassword(email: string) {
    const response = await api.post("/auth/forgot-password", { email });

    return response.data;
}

export async function verifyResetCode(email: string, code: string) {
    const response = await api.post("/auth/verify-reset-code", { email, code });

    return response.data;
}

export async function resetPassword(data: { email: string; code: string; password: string }) {
    const response = await api.post("/auth/reset-password", data);

    return response.data;
}
