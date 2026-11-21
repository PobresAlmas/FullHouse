import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    resolve: { tsconfigPaths: true },
    test: {
        environment: "jsdom",
        pool: "vmThreads",
        setupFiles: ["./test/setup.ts"],
        coverage: {
            provider: "v8",
            include: [
                "app/**/*.{ts,tsx}",
                "components/**/*.{ts,tsx}",
                "features/**/*.{ts,tsx}",
                "lib/**/*.{ts,tsx}",
                "providers/**/*.{ts,tsx}",
                "services/**/*.{ts,tsx}",
            ],
            exclude: ["**/*.test.*", "**/__test__/**", "**/*.d.ts"],
            reporter: ["text", "html", "json"],
            thresholds: {
                // Incremental floors based on the expanded test suite; raise as coverage grows.
                statements: 50,
                branches: 43,
                functions: 44,
                lines: 50,
            },
        },
    },
});
