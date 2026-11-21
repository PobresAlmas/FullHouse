-- A user may have historical participations in multiple residences, but only
-- one active participation (data_saida IS NULL) across the whole application.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "participacao"
        WHERE "data_saida" IS NULL
        GROUP BY "usuario_id"
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Cannot enforce one active residence per user: duplicate active participations exist';
    END IF;
END $$;

CREATE UNIQUE INDEX "uq_participacao_usuario_ativa"
    ON "participacao" ("usuario_id")
    WHERE "data_saida" IS NULL;
