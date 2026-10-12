import { IsOptional, IsString, MaxLength } from "class-validator";

export class PetListQueryDto {
    @IsOptional()
    @IsString()
    @MaxLength(100)
    search?: string;
}
