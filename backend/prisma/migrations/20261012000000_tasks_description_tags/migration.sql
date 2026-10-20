ALTER TABLE "definicao_tarefa"
ADD COLUMN "descricao" TEXT,
ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
