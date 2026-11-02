import { Transform, Type } from "class-transformer";
import {
    IsDateString,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
    Matches,
    MaxLength,
    IsArray,
    ValidateNested,
} from "class-validator";

export enum ExpensePaymentStatus {
    PENDING = "PENDING",
    PAID = "PAID",
}

export enum ExpenseScope {
    HOME = "HOME",
    PERSONAL = "PERSONAL",
}

export class ExpenseAllocationDto {
    @IsUUID("4", { message: "Um participante da divisão é inválido." })
    participationId!: string;

    @IsString({ message: "Informe um valor válido para cada participante." })
    @Matches(/^\d{1,10}(?:[.,]\d{1,2})?$/, {
        message: "O valor individual deve ser zero ou positivo, com até duas casas decimais.",
    })
    amount!: string;
}

export class CreateExpenseDto {
    @IsOptional()
    @IsEnum(ExpenseScope, { message: "Selecione Pessoal ou Casa." })
    scope?: ExpenseScope;

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
    @IsDateString({ strict: true }, { message: "Informe uma data de pagamento válida." })
    @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "Informe a data de pagamento no formato AAAA-MM-DD." })
    paymentDate?: string | null;

    @IsOptional()
    @IsUUID("4", { message: "A casa informada é inválida." })
    homeId?: string;

    @IsOptional()
    @IsUUID("4", { message: "Selecione um subgrupo válido." })
    subgroupId?: string | null;

    @IsOptional()
    @IsArray({ message: "A divisão da despesa deve ser uma lista." })
    @ValidateNested({ each: true })
    @Type(() => ExpenseAllocationDto)
    allocations?: ExpenseAllocationDto[];

    @IsEnum(ExpensePaymentStatus, { message: "Selecione Pendente ou Pago." })
    paymentStatus!: ExpensePaymentStatus;
}
