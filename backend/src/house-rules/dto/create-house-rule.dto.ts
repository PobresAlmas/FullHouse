import { Transform } from "class-transformer";
import { IsString, MaxLength, MinLength } from "class-validator";

export class CreateHouseRuleDto {
    @IsString()
    @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
    @MinLength(1)
    @MaxLength(150)
    title!: string;

    @IsString()
    @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
    @MinLength(1)
    @MaxLength(5000)
    description!: string;
}
