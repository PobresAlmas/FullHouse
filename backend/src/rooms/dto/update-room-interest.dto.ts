import { IsIn } from "class-validator";
import { status_interesse_anuncio_enum } from "../../generated/prisma/enums.js";

export class UpdateRoomInterestDto {
    @IsIn([status_interesse_anuncio_enum.ACEITO, status_interesse_anuncio_enum.RECUSADO])
    status!: status_interesse_anuncio_enum;
}
