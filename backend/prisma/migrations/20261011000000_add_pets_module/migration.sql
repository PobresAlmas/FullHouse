CREATE TYPE "tipo_cuidado_pet_enum" AS ENUM (
    'VACCINE',
    'FOOD',
    'VET_VISIT',
    'MEDICATION',
    'OTHER'
);

ALTER TABLE "pet"
ADD COLUMN "foto_url" VARCHAR(500),
ADD COLUMN "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "cuidado_pet"
ADD COLUMN "titulo" VARCHAR(150) NOT NULL DEFAULT 'Cuidado registrado',
ADD COLUMN "descricao" TEXT,
ADD COLUMN "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Keep the former free-text category visible in the existing records.
UPDATE "cuidado_pet"
SET "titulo" = COALESCE(NULLIF(BTRIM("tipo"), ''), 'Cuidado registrado');

-- Normalize common legacy Portuguese and English values. Unknown values become
-- OTHER; the original text remains in titulo so no category information is lost.
ALTER TABLE "cuidado_pet"
ALTER COLUMN "tipo" TYPE "tipo_cuidado_pet_enum"
USING (
    CASE
        WHEN UPPER(BTRIM("tipo")) LIKE 'VACIN%'
          OR UPPER(BTRIM("tipo")) LIKE 'VACCIN%'
          OR UPPER(BTRIM("tipo")) = 'VACCINE'
            THEN 'VACCINE'
        WHEN UPPER(BTRIM("tipo")) LIKE 'RA%'
          OR UPPER(BTRIM("tipo")) LIKE 'ALIMENT%'
          OR UPPER(BTRIM("tipo")) = 'FOOD'
            THEN 'FOOD'
        WHEN UPPER(BTRIM("tipo")) LIKE 'VETERIN%'
          OR UPPER(BTRIM("tipo")) LIKE 'CONSULT%'
          OR UPPER(BTRIM("tipo")) IN ('VET', 'VET_VISIT', 'VETERINARY')
            THEN 'VET_VISIT'
        WHEN UPPER(BTRIM("tipo")) LIKE 'MEDIC%'
          OR UPPER(BTRIM("tipo")) = 'MEDICATION'
            THEN 'MEDICATION'
        WHEN UPPER(BTRIM("tipo")) = 'OTHER'
            THEN 'OTHER'
        ELSE 'OTHER'
    END
)::"tipo_cuidado_pet_enum";

CREATE INDEX "idx_pet_casa" ON "pet"("casa_id");
CREATE INDEX "idx_cuidado_pet_pet_data" ON "cuidado_pet"("pet_id", "data_cuidado");
