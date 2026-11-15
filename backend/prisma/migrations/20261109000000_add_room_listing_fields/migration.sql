-- Preserve existing room listings and interests while extending the listing contract.
CREATE TYPE "tipo_moradia_anuncio_enum" AS ENUM (
    'QUARTO_INDIVIDUAL',
    'VAGA_COMPARTILHADA',
    'REPUBLICA'
);

ALTER TABLE "anuncio_quarto"
    ADD COLUMN "endereco_completo" VARCHAR(255),
    ADD COLUMN "contato" VARCHAR(100),
    ADD COLUMN "perfil_convivencia" TEXT,
    ADD COLUMN "tipo_moradia" "tipo_moradia_anuncio_enum" NOT NULL DEFAULT 'QUARTO_INDIVIDUAL',
    ADD COLUMN "aceita_pets" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "fotos" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN "atualizado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "idx_anuncio_quarto_status_criado_em"
    ON "anuncio_quarto"("status", "criado_em", "id");
CREATE INDEX "idx_anuncio_quarto_valor_mensal"
    ON "anuncio_quarto"("valor_mensal");
CREATE INDEX "idx_anuncio_quarto_tipo_pets"
    ON "anuncio_quarto"("tipo_moradia", "aceita_pets");

-- Interest history is not rewritten. Creation serializes on the listing row
-- and checks for an existing pending interest in the same transaction.
