ALTER TABLE "despesa"
ADD COLUMN "criado_por_usuario_id" UUID;

ALTER TABLE "despesa"
ADD CONSTRAINT "despesa_criado_por_usuario_id_fkey"
FOREIGN KEY ("criado_por_usuario_id") REFERENCES "usuario"("id")
ON DELETE SET NULL ON UPDATE NO ACTION;

CREATE INDEX "idx_despesa_criado_por_usuario_id"
ON "despesa"("criado_por_usuario_id");
