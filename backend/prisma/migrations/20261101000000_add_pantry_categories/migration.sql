BEGIN;

CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION normalize_pantry_category(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
    SELECT lower(
        unaccent(
            regexp_replace(
                regexp_replace(value, '^[[:space:]]+|[[:space:]]+$', '', 'g'),
                '[[:space:]]+',
                ' ',
                'g'
            )
        )
    )
$$;

CREATE TABLE categoria_despensa (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    casa_id uuid NOT NULL,
    nome varchar(80) NOT NULL,
    nome_normalizado varchar(240) NOT NULL,
    criado_em timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT categoria_despensa_pkey PRIMARY KEY (id),
    CONSTRAINT fk_categoria_despensa_casa FOREIGN KEY (casa_id)
        REFERENCES casa(id) ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX uq_categoria_despensa_casa_nome_normalizado
    ON categoria_despensa(casa_id, nome_normalizado);
CREATE UNIQUE INDEX uq_categoria_despensa_casa_id
    ON categoria_despensa(casa_id, id);
CREATE INDEX idx_categoria_despensa_casa ON categoria_despensa(casa_id);

INSERT INTO categoria_despensa (casa_id, nome, nome_normalizado)
SELECT casa.id, defaults.nome, normalize_pantry_category(defaults.nome)
FROM casa
CROSS JOIN (VALUES
    ('Bebidas'),
    ('Doces'),
    ('Grãos'),
    ('Higiene'),
    ('Laticínios'),
    ('Limpeza'),
    ('Massas'),
    ('Outros')
) AS defaults(nome)
ON CONFLICT (casa_id, nome_normalizado) DO NOTHING;

DO $$
DECLARE
    invalid_items integer;
    conflicts text;
BEGIN
    SELECT count(*) INTO invalid_items
    FROM item_despensa
    WHERE normalize_pantry_category(categoria) = '';

    IF invalid_items > 0 THEN
        RAISE EXCEPTION 'Migração de categorias bloqueada: % item(ns) têm categoria vazia. Gere um mapeamento explícito antes de migrar.', invalid_items;
    END IF;

    SELECT string_agg(
        format('casa=%s, chave=%s, rótulos=[%s]', casa_id, nome_normalizado, rotulos),
        E'\n'
    ) INTO conflicts
    FROM (
        SELECT
            casa_id,
            normalize_pantry_category(categoria) AS nome_normalizado,
            string_agg(DISTINCT categoria, ', ' ORDER BY categoria) AS rotulos
        FROM item_despensa
        GROUP BY casa_id, normalize_pantry_category(categoria)
        HAVING count(DISTINCT categoria) > 1
           AND normalize_pantry_category(categoria) NOT IN (
                normalize_pantry_category('Bebidas'),
                normalize_pantry_category('Doces'),
                normalize_pantry_category('Grãos'),
                normalize_pantry_category('Higiene'),
                normalize_pantry_category('Laticínios'),
                normalize_pantry_category('Limpeza'),
                normalize_pantry_category('Massas'),
                normalize_pantry_category('Outros')
           )
    ) AS legacy_conflicts;

    IF conflicts IS NOT NULL THEN
        RAISE EXCEPTION E'Migração de categorias bloqueada por rótulos legados ambíguos. Aprove um mapeamento por residência antes do cutover:\n%', conflicts;
    END IF;
END $$;

INSERT INTO categoria_despensa (casa_id, nome, nome_normalizado)
SELECT DISTINCT ON (item.casa_id, normalize_pantry_category(item.categoria))
    item.casa_id,
    regexp_replace(
        regexp_replace(item.categoria, '^[[:space:]]+|[[:space:]]+$', '', 'g'),
        '[[:space:]]+',
        ' ',
        'g'
    ),
    normalize_pantry_category(item.categoria)
FROM item_despensa AS item
WHERE NOT EXISTS (
    SELECT 1
    FROM categoria_despensa AS categoria
    WHERE categoria.casa_id = item.casa_id
      AND categoria.nome_normalizado = normalize_pantry_category(item.categoria)
)
ORDER BY item.casa_id, normalize_pantry_category(item.categoria), item.categoria;

ALTER TABLE item_despensa ADD COLUMN categoria_id uuid;

UPDATE item_despensa AS item
SET categoria_id = categoria.id
FROM categoria_despensa AS categoria
WHERE categoria.casa_id = item.casa_id
  AND categoria.nome_normalizado = normalize_pantry_category(item.categoria);

DO $$
DECLARE
    unassigned_items integer;
BEGIN
    SELECT count(*) INTO unassigned_items
    FROM item_despensa
    WHERE categoria_id IS NULL;

    IF unassigned_items > 0 THEN
        RAISE EXCEPTION 'Migração de categorias bloqueada: % item(ns) não receberam categoria. Nenhum item será convertido automaticamente para Outros.', unassigned_items;
    END IF;
END $$;

ALTER TABLE item_despensa ALTER COLUMN categoria_id SET NOT NULL;
CREATE INDEX idx_item_despensa_categoria ON item_despensa(categoria_id);
ALTER TABLE item_despensa
    ADD CONSTRAINT fk_item_despensa_categoria
    FOREIGN KEY (casa_id, categoria_id) REFERENCES categoria_despensa(casa_id, id)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT;
