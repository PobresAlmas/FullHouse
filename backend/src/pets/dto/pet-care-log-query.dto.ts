import { IsDateString, IsEnum, IsOptional, Matches } from "class-validator";
import { PetCareType } from "./create-pet-care-log.dto.js";

export class PetCareLogQueryDto {
    @IsOptional()
    @IsEnum(PetCareType)
    type?: PetCareType;

    @IsOptional()
    @IsDateString({ strict: true })
    @Matches(/^\d{4}-\d{2}-\d{2}$/)
    from?: string;

    @IsOptional()
    @IsDateString({ strict: true })
    @Matches(/^\d{4}-\d{2}-\d{2}$/)
    to?: string;
}
