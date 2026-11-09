import { Transform } from "class-transformer";
import {
    ArrayMaxSize,
    ArrayUnique,
    IsArray,
    IsBoolean,
    IsEnum,
    IsNumber,
    IsOptional,
    IsString,
    Max,
    MaxLength,
    Min,
    MinLength,
} from "class-validator";
import { status_anuncio_enum, tipo_moradia_anuncio_enum } from "../../generated/prisma/enums.js";

export class UpdateRoomListingDto {
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(150)
    titulo?: string;

    @IsOptional()
    @IsString()
    @MaxLength(5000)
    descricao?: string;

    @IsOptional()
    @Transform(({ value }) => (typeof value === "string" ? Number(value) : value))
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0.01)
    @Max(99999999.99)
    preco?: number;

    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(100)
    cidade?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    bairro?: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    enderecoCompleto?: string;

    @IsOptional()
    @IsBoolean()
    exibeEnderecoCompleto?: boolean;

    @IsOptional()
    @IsString()
    @MinLength(3)
    @MaxLength(100)
    contato?: string;

    @IsOptional()
    @IsBoolean()
    exibeContato?: boolean;

    @IsOptional()
    @IsString()
    @MaxLength(5000)
    perfilConvivencia?: string;

    @IsOptional()
    @IsEnum(tipo_moradia_anuncio_enum)
    tipoMoradia?: tipo_moradia_anuncio_enum;

    @IsOptional()
    @IsBoolean()
    aceitaPets?: boolean;

    @IsOptional()
    @IsArray()
    @ArrayMaxSize(8)
    @ArrayUnique()
    @IsString({ each: true })
    @MaxLength(500, { each: true })
    fotos?: string[];

    @IsOptional()
    @IsEnum(status_anuncio_enum)
    status?: status_anuncio_enum;
}
