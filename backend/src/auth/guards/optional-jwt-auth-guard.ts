import { ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard("jwt") {
    override canActivate(context: ExecutionContext) {
        const request = context
            .switchToHttp()
            .getRequest<{ cookies?: { access_token?: string } }>();
        if (!request.cookies?.access_token) return true;
        return super.canActivate(context);
    }
}
