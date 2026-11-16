CREATE TABLE "negociacao_anuncio" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "interesse_id" UUID NOT NULL,
    "criada_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "negociacao_anuncio_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "uq_negociacao_anuncio_interesse" UNIQUE ("interesse_id"),
    CONSTRAINT "fk_negociacao_anuncio_interesse" FOREIGN KEY ("interesse_id")
        REFERENCES "interesse_anuncio"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE "mensagem_negociacao_anuncio" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "negociacao_id" UUID NOT NULL,
    "autor_usuario_id" UUID NOT NULL,
    "conteudo" VARCHAR(2000) NOT NULL,
    "enviada_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mensagem_negociacao_anuncio_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "fk_mensagem_negociacao_anuncio_negociacao" FOREIGN KEY ("negociacao_id")
        REFERENCES "negociacao_anuncio"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "fk_mensagem_negociacao_anuncio_usuario" FOREIGN KEY ("autor_usuario_id")
        REFERENCES "usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

ALTER TABLE "convite_casa"
    ADD COLUMN "negociacao_anuncio_id" UUID,
    ADD CONSTRAINT "fk_convite_casa_negociacao_anuncio" FOREIGN KEY ("negociacao_anuncio_id")
        REFERENCES "negociacao_anuncio"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

CREATE INDEX "idx_mensagem_negociacao_anuncio_data"
    ON "mensagem_negociacao_anuncio"("negociacao_id", "enviada_em");
CREATE INDEX "idx_mensagem_negociacao_anuncio_autor"
    ON "mensagem_negociacao_anuncio"("autor_usuario_id");
CREATE INDEX "idx_convite_casa_negociacao_anuncio"
    ON "convite_casa"("negociacao_anuncio_id");
