import { IsEnum } from "class-validator";

export enum MeetingResponse {
    CONFIRMADO = "CONFIRMADO",
    RECUSADO = "RECUSADO",
}

export class RespondMeetingDto {
    @IsEnum(MeetingResponse)
    response!: MeetingResponse;
}
