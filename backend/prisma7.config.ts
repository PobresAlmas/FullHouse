import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "prisma/config";

if (!process.env["DATABASE_URL"]) {
    const envPath = resolve(dirname(fileURLToPath(import.meta.url)), ".env");
    if (existsSync(envPath)) process.loadEnvFile(envPath);
}

export default defineConfig({
    schema: "prisma/schema.prisma",
    migrations: {
        path: "prisma/migrations",
    },
    datasource: {
        url: process.env["DATABASE_URL"],
    },
});
