import { IsIn, IsOptional } from "class-validator";

export class UpdateMemberAccessDto {
    @IsOptional()
    @IsIn([true, false, null], {
        message: "canEditContent deve ser true, false ou null.",
    })
    canEditContent?: boolean | null;
}
