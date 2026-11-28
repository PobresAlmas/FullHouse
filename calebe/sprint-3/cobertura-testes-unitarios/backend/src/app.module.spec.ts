import { MODULE_METADATA } from "@nestjs/common/constants";
import { ThrottlerModule } from "@nestjs/throttler";
import {
  APP_THROTTLER_GUARD_PROVIDER,
  APP_THROTTLER_OPTIONS,
} from "./common/app-throttling.js";
import { AppModule } from "./app.module.js";

describe("AppModule throttling configuration", () => {
  it("registers the shared global throttler guard in the production application", () => {
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      AppModule,
    ) as unknown[];

    expect(providers).toContain(APP_THROTTLER_GUARD_PROVIDER);
  });

  it("uses the same global request limit as the HTTP test fixture", () => {
    const imports = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      AppModule,
    ) as unknown[];
    const throttler = imports.find(
      (module) =>
        typeof module === "object" &&
        module !== null &&
        "module" in module &&
        module.module === ThrottlerModule,
    );

    expect(throttler).toBeDefined();
    expect(APP_THROTTLER_OPTIONS).toEqual([{ ttl: 60_000, limit: 120 }]);
  });
});
