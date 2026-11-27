import { IsIn, IsInt, Min } from "class-validator";

export class UpdateShoppingListStatusDto {
    @IsInt()
    @Min(1)
    version!: number;

    @IsIn(["PENDENTE", "COMPRADO"])
    status!: "PENDENTE" | "COMPRADO";
}
