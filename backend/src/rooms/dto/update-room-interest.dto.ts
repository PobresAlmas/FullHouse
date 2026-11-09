import { IsEnum } from "class-validator";
import { status_interesse_anuncio_enum } from "../../generated/prisma/enums.js";

export class UpdateRoomInterestDto {
    @IsEnum(status_interesse_anuncio_enum)
    status!: status_interesse_anuncio_enum;
}
