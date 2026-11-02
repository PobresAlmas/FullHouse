ALTER TABLE "solicitacao_troca_tarefa"
ADD COLUMN "alvo_instancia_tarefa_id" UUID;

ALTER TABLE "solicitacao_troca_tarefa"
ADD CONSTRAINT "solicitacao_troca_tarefa_alvo_instancia_tarefa_id_fkey"
FOREIGN KEY ("alvo_instancia_tarefa_id")
REFERENCES "instancia_tarefa"("id")
ON DELETE CASCADE
ON UPDATE NO ACTION;

CREATE INDEX "idx_solicitacao_troca_alvo_instancia"
ON "solicitacao_troca_tarefa"("alvo_instancia_tarefa_id");
