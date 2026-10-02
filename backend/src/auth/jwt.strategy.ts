import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-jwt";
import { JwtPayload } from "./types/jwt-payload.js";
import { ConfigService } from "@nestjs/config";

const cookieExtractor = (req?: { cookies?: { access_token?: string } }): string | null => {
    return req?.cookies?.access_token ?? null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private readonly configService: ConfigService) {
        super({
            jwtFromRequest: cookieExtractor,
            ignoreExpiration: false,
            secretOrKey: configService.getOrThrow<string>("JWT_SECRET"),
        });
    }

    validate(payload: JwtPayload) {
        return {
            id: payload.sub,
            email: payload.email,
        };
    }
}
