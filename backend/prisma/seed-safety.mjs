import { URL } from "node:url";

export function assertLocalSeedDatabase(databaseUrl) {
    let url;
    try {
        url = new URL(databaseUrl);
    } catch {
        throw new Error("DATABASE_URL não é uma URL válida.");
    }

    const hostname = url.hostname.replace(/^\[|\]$/g, "");
    if (!["localhost", "127.0.0.1", "::1"].includes(hostname) || url.port !== "5433") {
        throw new Error(
            "A carga de demonstração só pode ser executada no PostgreSQL local em localhost:5433."
        );
    }
}
