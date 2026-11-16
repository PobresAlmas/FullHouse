import { IsIn } from "class-validator";

export class RespondRoomInvitationDto {
    @IsIn(["ACEITO", "RECUSADO"])
    status!: "ACEITO" | "RECUSADO";
}
