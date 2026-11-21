ALTER TABLE "participacao"
ADD COLUMN "edicao_conteudo_override" BOOLEAN;

ALTER TABLE "casa"
ADD COLUMN "criada_em" DATE NOT NULL DEFAULT CURRENT_DATE;

UPDATE "casa" c
SET "criada_em" = COALESCE(
  (SELECT MIN(p."data_entrada") FROM "participacao" p WHERE p."casa_id" = c."id"),
  CURRENT_DATE
);
