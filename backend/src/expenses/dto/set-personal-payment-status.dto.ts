import { IsBoolean } from "class-validator";

export class SetPersonalPaymentStatusDto {
    @IsBoolean({ message: "Informe se a despesa está paga." })
    paid!: boolean;
}
