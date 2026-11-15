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
    IsUUID,
    Max,
    MaxLength,
    Min,
    MinLength,
} from "class-validator";
import { tipo_moradia_anuncio_enum } from "../../generated/prisma/enums.js";

export class CreateRoomListingDto {
    @IsUUID("4")
    casaId!: string;

    @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
    @IsString()
    @MinLength(1)
    @MaxLength(150)
    titulo!: string;

    @IsOptional()
    @IsString()
    @MaxLength(5000)
    descricao?: string;

    @Transform(({ value }) => (typeof value === "string" ? Number(value) : value))
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0.01)
    @Max(99999999.99)
    preco!: number;

    @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
    @IsString()
    @MinLength(1)
    @MaxLength(100)
    cidade!: string;

    @IsOptional()
    @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
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

    @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
    @IsString()
    @MinLength(3)
    @MaxLength(100)
    contato!: string;

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
}
