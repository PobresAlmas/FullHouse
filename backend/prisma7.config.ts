// Prisma CLI may not load the backend .env file before evaluating this config.
import { fileURLToPath } from "node:url";
import { defineConfig } from "prisma/config";

if (!process.env["DATABASE_URL"]) {
    process.loadEnvFile(fileURLToPath(new URL("./.env", import.meta.url)));
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
