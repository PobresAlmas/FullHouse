import { vi } from "vitest";

vi.hoisted(() => {
    // AppModule validates these values while it is imported; use test-only values here.
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
    process.env.JWT_SECRET = "test-secret";
    process.env.JWT_EXPIRES_IN = "1d";
    process.env.MINIO_ENDPOINT = "http://localhost:9000";
    process.env.MINIO_ACCESS_KEY = "test";
    process.env.MINIO_SECRET_KEY = "test";
    process.env.MINIO_BUCKET = "test";
    process.env.MINIO_REGION = "us-east-1";
});

import { MODULE_METADATA } from "@nestjs/common/constants";
import { ThrottlerModule } from "@nestjs/throttler";
import { APP_THROTTLER_GUARD_PROVIDER, APP_THROTTLER_OPTIONS } from "./common/app-throttling.js";
import { AppModule } from "./app.module.js";

describe("AppModule throttling configuration", () => {
    it("registers the shared global throttler guard in the production application", () => {
        const providers = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, AppModule) as unknown[];

        expect(providers).toContain(APP_THROTTLER_GUARD_PROVIDER);
    });

    it("uses the same global request limit as the HTTP test fixture", () => {
        const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, AppModule) as unknown[];
        const throttler = imports.find(
            (module) =>
                typeof module === "object" &&
                module !== null &&
                "module" in module &&
                module.module === ThrottlerModule
        );

        expect(throttler).toBeDefined();
        expect(APP_THROTTLER_OPTIONS).toEqual([{ ttl: 60_000, limit: 120 }]);
    });
});
