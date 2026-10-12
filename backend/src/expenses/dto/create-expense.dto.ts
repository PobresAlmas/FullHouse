import { Transform } from "class-transformer";
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength } from "class-validator";

export enum ExpensePaymentStatus {
    PENDING = "PENDING",
    PAID = "PAID",
}

export class CreateExpenseDto {
    @IsString()
    @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
    @IsNotEmpty({ message: "Informe a descrição da despesa." })
    @MaxLength(255, { message: "A descrição deve ter no máximo 255 caracteres." })
    description!: string;

    @IsString()
    @Matches(/^(?=.*[1-9])\d{1,10}(?:[.,]\d{1,2})?$/, {
        message: "Informe um valor maior que zero, com até duas casas decimais.",
    })
    amount!: string;

    @IsDateString({ strict: true }, { message: "Informe uma data válida." })
    @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "Informe a data no formato AAAA-MM-DD." })
    date!: string;

    @IsOptional()
    @IsUUID("4", { message: "A casa informada é inválida." })
    homeId?: string;

    @IsOptional()
    @IsUUID("4", { message: "Selecione um subgrupo válido." })
    subgroupId?: string | null;

    @IsEnum(ExpensePaymentStatus, { message: "Selecione Pendente ou Pago." })
    paymentStatus!: ExpensePaymentStatus;
}
