import { IsOptional, IsUUID } from "class-validator";

export class MyRoomListingsQueryDto {
    @IsOptional()
    @IsUUID("4")
    casaId?: string;
}
