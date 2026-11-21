CREATE TABLE "preferencia_residencia" (
  "usuario_id" UUID NOT NULL,
  "casa_id" UUID NOT NULL,
  "aviso_novas_tarefas" BOOLEAN NOT NULL DEFAULT true,
  "aviso_novas_despesas" BOOLEAN NOT NULL DEFAULT true,
  "aviso_vencimentos" BOOLEAN NOT NULL DEFAULT true,
  "aviso_convites" BOOLEAN NOT NULL DEFAULT true,
  "aviso_atualizacoes_casa" BOOLEAN NOT NULL DEFAULT false,
  "validade_aviso_dias" SMALLINT NOT NULL DEFAULT 5,
  "mostrar_vencidos" BOOLEAN NOT NULL DEFAULT true,
  "financeiro_aviso_dias" SMALLINT NOT NULL DEFAULT 5,
  "mostrar_atrasadas" BOOLEAN NOT NULL DEFAULT true,
  "lembrete_vacinas" BOOLEAN NOT NULL DEFAULT true,
  "lembrete_vermifugo" BOOLEAN NOT NULL DEFAULT true,
  "lembrete_consultas" BOOLEAN NOT NULL DEFAULT true,
  "atualizado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "preferencia_residencia_pkey" PRIMARY KEY ("usuario_id", "casa_id"),
  CONSTRAINT "preferencia_residencia_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "preferencia_residencia_casa_id_fkey" FOREIGN KEY ("casa_id") REFERENCES "casa"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "preferencia_residencia_validade_aviso_dias_check" CHECK ("validade_aviso_dias" IN (1, 3, 5, 7, 14)),
  CONSTRAINT "preferencia_residencia_financeiro_aviso_dias_check" CHECK ("financeiro_aviso_dias" IN (1, 3, 5, 7, 14))
);

CREATE INDEX "idx_preferencia_residencia_casa" ON "preferencia_residencia"("casa_id");
