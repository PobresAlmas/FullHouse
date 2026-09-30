import type { ApiError } from "./api-error";

export function isApiError(
    error: unknown
): error is ApiError {

    return (
        typeof error === "object" &&
        error !== null &&
        "message" in error
    );
}