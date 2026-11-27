import { Transform } from "class-transformer";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class PantryItemListQueryDto {
    @IsOptional()
    @IsString()
    @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
    @MaxLength(100)
    search?: string;
}
