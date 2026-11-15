import { defineConfig } from "vitest/config";

export default defineConfig({
    resolve: { tsconfigPaths: true },
    test: {
        globals: true,
        root: "./",
        include: ["**/*.spec.ts"],
        coverage: {
            provider: "v8",
            include: ["src/**/*.ts"],
            exclude: ["src/generated/**", "**/*.spec.ts", "**/*.d.ts"],
            reporter: ["text", "html", "json"],
        },
    },
});
