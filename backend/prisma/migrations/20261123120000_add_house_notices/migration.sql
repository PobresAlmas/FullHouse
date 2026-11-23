CREATE TABLE "aviso_casa" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "casa_id" UUID NOT NULL,
    "participacao_id" UUID NOT NULL,
    "conteudo" VARCHAR(280) NOT NULL,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aviso_casa_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_aviso_casa_casa_criado"
    ON "aviso_casa"("casa_id", "criado_em", "id");

ALTER TABLE "aviso_casa"
    ADD CONSTRAINT "aviso_casa_casa_id_fkey"
    FOREIGN KEY ("casa_id") REFERENCES "casa"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "aviso_casa"
    ADD CONSTRAINT "aviso_casa_participacao_id_fkey"
    FOREIGN KEY ("participacao_id") REFERENCES "participacao"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
