import { IsIn, IsOptional, IsUUID, Matches } from "class-validator";

export const EXPENSE_INSIGHTS_STATUSES = ["ALL", "PAID", "PENDING", "OVERDUE"] as const;
export type ExpenseInsightsStatus = (typeof EXPENSE_INSIGHTS_STATUSES)[number];

export class ExpenseInsightsQueryDto {
    @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "Informe uma data inicial válida (AAAA-MM-DD)." })
    from!: string;

    @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "Informe uma data final válida (AAAA-MM-DD)." })
    to!: string;

    @IsOptional()
    @IsUUID("4", { message: "Selecione um morador válido." })
    participationId?: string;

    @IsOptional()
    @IsUUID("4", { message: "Selecione um subgrupo válido." })
    subgroupId?: string;

    @IsOptional()
    @IsIn([...EXPENSE_INSIGHTS_STATUSES], { message: "Situação da cota inválida." })
    status: ExpenseInsightsStatus = "ALL";
}
