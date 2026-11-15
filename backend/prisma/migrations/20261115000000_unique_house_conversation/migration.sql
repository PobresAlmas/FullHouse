BEGIN;

DO $$
DECLARE
    duplicates text;
BEGIN
    SELECT string_agg(
        format('casa %s: conversas %s', casa_id, conversa_ids),
        '; ' ORDER BY casa_id
    )
    INTO duplicates
    FROM (
        SELECT casa_id, string_agg(id::text, ', ' ORDER BY id) AS conversa_ids
        FROM conversa
        WHERE tipo = 'CASA'
        GROUP BY casa_id
        HAVING count(*) > 1
    ) AS duplicated_homes;

    IF duplicates IS NOT NULL THEN
        RAISE EXCEPTION 'Não é possível criar índice de conversa CASA: existem duplicatas (%). Resolva-as manualmente preservando o histórico de mensagens.', duplicates
            USING ERRCODE = 'unique_violation';
    END IF;
END $$;

CREATE UNIQUE INDEX uq_conversa_casa_tipo_casa
    ON conversa (casa_id)
    WHERE tipo = 'CASA';

COMMIT;
