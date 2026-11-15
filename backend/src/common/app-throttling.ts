import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard } from "@nestjs/throttler";

export const APP_THROTTLER_OPTIONS = [{ ttl: 60_000, limit: 120 }];

export const APP_THROTTLER_GUARD_PROVIDER = {
    provide: APP_GUARD,
    useClass: ThrottlerGuard,
};
