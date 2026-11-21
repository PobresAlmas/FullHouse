import { INestApplication, Type, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import { App } from "supertest/types.js";
import { afterAll } from "vitest";
import { JwtStrategy } from "../../src/auth/jwt.strategy.js";

const JWT_SECRET = "authenticated-e2e-test-secret";
const DEFAULT_USER = {
    id: "821f394d-6215-48b4-89a9-0af953ba8a76",
    email: "resident@example.com",
};

type AuthenticatedTestAppOptions = {
    controllers: Type<unknown>[];
    providers: Array<{ provide: unknown; useValue: unknown }>;
    validateRequests?: boolean;
};

type AuthenticatedTestApp = {
    app: INestApplication<App>;
    authenticatedCookie: (user?: typeof DEFAULT_USER) => Promise<string>;
};

let sharedTestApp: Promise<AuthenticatedTestApp> | undefined;

// Vitest isolates this module per test file, so HTTP tests in one file can share
// the same Nest bootstrap and close it once after the file finishes.
afterAll(async () => {
    if (sharedTestApp) {
        const { app } = await sharedTestApp;
        await app.close();
    }
});

export async function createAuthenticatedTestApp({
    controllers,
    providers,
    validateRequests = true,
}: AuthenticatedTestAppOptions): Promise<AuthenticatedTestApp> {
    if (sharedTestApp) return sharedTestApp;

    sharedTestApp = bootstrapAuthenticatedTestApp({
        controllers,
        providers,
        validateRequests,
    });
    return sharedTestApp;
}

async function bootstrapAuthenticatedTestApp({
    controllers,
    providers,
    validateRequests = true,
}: AuthenticatedTestAppOptions): Promise<AuthenticatedTestApp> {
    const moduleFixture = await Test.createTestingModule({
        imports: [
            PassportModule,
            JwtModule.register({ secret: JWT_SECRET, signOptions: { expiresIn: "5m" } }),
        ],
        controllers,
        providers: [
            JwtStrategy,
            { provide: ConfigService, useValue: { getOrThrow: () => JWT_SECRET } },
            ...providers,
        ],
    }).compile();

    const app = moduleFixture.createNestApplication<INestApplication<App>>();
    app.use(cookieParser());
    if (validateRequests) {
        app.useGlobalPipes(
            new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })
        );
    }
    await app.init();
    await app.listen(0, "127.0.0.1");
    const jwt = app.get(JwtService);

    return {
        app,
        authenticatedCookie: async (user = DEFAULT_USER) => {
            const token = await jwt.signAsync({ sub: user.id, email: user.email });
            return `access_token=${token}`;
        },
    };
}
