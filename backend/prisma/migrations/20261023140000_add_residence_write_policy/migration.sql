CREATE TYPE "politica_criacao_edicao_enum" AS ENUM ('TODOS', 'LIDERES');

ALTER TABLE "configuracao_casa"
ADD COLUMN "politica_criacao_edicao" "politica_criacao_edicao_enum" NOT NULL DEFAULT 'TODOS';
