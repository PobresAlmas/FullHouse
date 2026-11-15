import { Transform, Type } from "class-transformer";
import {
    IsBoolean,
    IsEnum,
    IsInt,
    IsNumber,
    IsOptional,
    IsString,
    Max,
    Min,
} from "class-validator";
import { status_anuncio_enum, tipo_moradia_anuncio_enum } from "../../generated/prisma/enums.js";

function emptyToUndefined(value: unknown) {
    return value === "" || value === undefined ? undefined : value;
}

export class RoomListingQueryDto {
    @IsOptional()
    @Transform(({ value }) => emptyToUndefined(value))
    @IsString()
    cidade?: string;

    @IsOptional()
    @Transform(({ value }) => emptyToUndefined(value))
    @IsString()
    bairro?: string;

    @IsOptional()
    @Type(() => Number)
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    precoMin?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    precoMax?: number;

    @IsOptional()
    @IsEnum(status_anuncio_enum)
    status: status_anuncio_enum = status_anuncio_enum.ABERTO;

    @IsOptional()
    @IsEnum(tipo_moradia_anuncio_enum)
    tipoMoradia?: tipo_moradia_anuncio_enum;

    @IsOptional()
    @Transform(({ value }) => (value === "true" ? true : value === "false" ? false : value))
    @IsBoolean()
    aceitaPets?: boolean;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(50)
    limit = 10;
}
