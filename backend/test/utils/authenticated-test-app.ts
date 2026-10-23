import { INestApplication, Type, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import { App } from "supertest/types.js";
import { JwtStrategy } from "../../src/auth/jwt.strategy.js";

const JWT_SECRET = "authenticated-e2e-test-secret";
const DEFAULT_USER = {
    id: "821f394d-6215-48b4-89a9-0af953ba8a76",
    email: "resident@example.com",
};

export async function createAuthenticatedTestApp({
    controllers,
    providers,
    validateRequests = true,
}: {
    controllers: Type<unknown>[];
    providers: Array<{ provide: unknown; useValue: unknown }>;
    validateRequests?: boolean;
}): Promise<{
    app: INestApplication<App>;
    authenticatedCookie: (user?: typeof DEFAULT_USER) => Promise<string>;
}> {
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
    const jwt = app.get(JwtService);

    return {
        app,
        authenticatedCookie: async (user = DEFAULT_USER) => {
            const token = await jwt.signAsync({ sub: user.id, email: user.email });
            return `access_token=${token}`;
        },
    };
}
