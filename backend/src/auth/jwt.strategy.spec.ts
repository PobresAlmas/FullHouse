import { JwtStrategy } from "./jwt.strategy.js";

describe("JwtStrategy", () => {
    it("requires a configured JWT secret", () => {
        const config: { getOrThrow: ReturnType<typeof vi.fn> } = {
            getOrThrow: vi.fn().mockReturnValue("test-secret"),
        };
        expect(() => new JwtStrategy(config as never)).not.toThrow();
        expect(config.getOrThrow).toHaveBeenCalledWith("JWT_SECRET");
    });

    it("maps token claims to the request user shape", () => {
        const config: { getOrThrow: ReturnType<typeof vi.fn> } = {
            getOrThrow: vi.fn().mockReturnValue("test-secret"),
        };
        const strategy = new JwtStrategy(config as never);
        expect(
            strategy.validate({ sub: "u1", email: "a@example.com" } as Parameters<
                JwtStrategy["validate"]
            >[0])
        ).toEqual({
            id: "u1",
            email: "a@example.com",
        });
    });
});
