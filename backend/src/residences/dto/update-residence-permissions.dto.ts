import { IsEnum } from "class-validator";
import { politica_criacao_edicao_enum } from "../../generated/prisma/enums.js";

export class UpdateResidencePermissionsDto {
    @IsEnum(politica_criacao_edicao_enum, {
        message: "Selecione todos os moradores ou somente líderes e administradores.",
    })
    creationEditPolicy!: politica_criacao_edicao_enum;
}
