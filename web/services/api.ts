import axios from "axios";

export const api = axios.create({
    baseURL: "http://localhost:3000",
    withCredentials: true,
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const message = error.response?.data?.message ?? "Ocorreu um erro inesperado.";

        return Promise.reject({ message, status: error.response?.status });
    }
);
