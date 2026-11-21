-- DropIndex
DROP INDEX "idx_comprovante_pagamento_despesa";

-- DropIndex
DROP INDEX "idx_solicitacao_troca_alvo_instancia";

-- AlterTable
ALTER TABLE "anuncio_quarto" ALTER COLUMN "atualizado_em" DROP DEFAULT;

-- AlterTable
ALTER TABLE "categoria_despensa" ALTER COLUMN "atualizado_em" DROP DEFAULT;

-- AlterTable
ALTER TABLE "item_lista_compras" ALTER COLUMN "atualizado_em" DROP DEFAULT;

-- AlterTable
ALTER TABLE "preferencia_residencia" ALTER COLUMN "atualizado_em" DROP DEFAULT;

-- RenameForeignKey
ALTER TABLE "convite_casa" RENAME CONSTRAINT "fk_convite_casa_negociacao_anuncio" TO "convite_casa_negociacao_anuncio_id_fkey";

-- RenameForeignKey
ALTER TABLE "mensagem_negociacao_anuncio" RENAME CONSTRAINT "fk_mensagem_negociacao_anuncio_negociacao" TO "mensagem_negociacao_anuncio_negociacao_id_fkey";

-- RenameForeignKey
ALTER TABLE "mensagem_negociacao_anuncio" RENAME CONSTRAINT "fk_mensagem_negociacao_anuncio_usuario" TO "mensagem_negociacao_anuncio_autor_usuario_id_fkey";

-- RenameForeignKey
ALTER TABLE "negociacao_anuncio" RENAME CONSTRAINT "fk_negociacao_anuncio_interesse" TO "negociacao_anuncio_interesse_id_fkey";
