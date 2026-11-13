import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

// Prisma 7 loads this config before the CLI reads .env, so load the local file here.
if (existsSync(".env")) process.loadEnvFile(".env");

export default defineConfig({
    schema: "prisma/schema.prisma",
    migrations: {
        path: "prisma/migrations",
    },
    datasource: {
        url: process.env["DATABASE_URL"],
    },
});
