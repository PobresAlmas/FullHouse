import { Transform, Type } from "class-transformer";
import { IsBoolean, IsInt, IsOptional, IsUUID, Max, Min } from "class-validator";

export class NotificationsQueryDto {
    @IsOptional()
    @Transform(({ value }) => (value === undefined ? 20 : value))
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(50)
    limit = 20;

    @IsOptional()
    @IsUUID("4")
    cursor?: string;

    @IsOptional()
    @Transform(({ value }) => {
        if (value === "true") return true;
        if (value === "false") return false;
        return value;
    })
    @IsBoolean()
    unreadOnly = false;
}
