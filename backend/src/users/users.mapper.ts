import { usuario } from "../generated/prisma/client.js";
import { UserRespondeDto } from "./dto/user-response.dto.js";
import { HousingStatus } from "./enums/housing-status.enum.js";

export function toUserResponse(user: usuario): UserRespondeDto {
    return {
        id: user.id,
        code: user.codigo_pessoal,
        name: user.nome,
        nickname: user.apelido ?? undefined,
        email: user.email,
        photo: user.foto_url ?? undefined,
        housingStatus: user.status_moradia as HousingStatus
    };
}