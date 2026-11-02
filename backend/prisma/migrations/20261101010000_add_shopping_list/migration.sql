BEGIN;

CREATE TYPE status_item_lista_compras_enum AS ENUM ('PENDENTE', 'COMPRADO');

CREATE TABLE item_lista_compras (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    casa_id uuid NOT NULL,
    nome varchar(100) NOT NULL,
    quantidade numeric(12,3),
    unidade unidade_item_enum,
    observacao varchar(500),
    status status_item_lista_compras_enum NOT NULL DEFAULT 'PENDENTE',
    criado_por_participacao_id uuid,
    criado_em timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    comprado_por_participacao_id uuid,
    comprado_em timestamptz(6),
    versao integer NOT NULL DEFAULT 1,
    CONSTRAINT item_lista_compras_pkey PRIMARY KEY (id),
    CONSTRAINT fk_item_lista_compras_casa FOREIGN KEY (casa_id)
        REFERENCES casa(id) ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT fk_item_lista_compras_criado_por FOREIGN KEY (criado_por_participacao_id)
        REFERENCES participacao(id) ON DELETE SET NULL ON UPDATE NO ACTION,
    CONSTRAINT fk_item_lista_compras_comprado_por FOREIGN KEY (comprado_por_participacao_id)
        REFERENCES participacao(id) ON DELETE SET NULL ON UPDATE NO ACTION,
    CONSTRAINT ck_item_lista_compras_quantidade_unidade CHECK (
        (quantidade IS NULL AND unidade IS NULL)
        OR (quantidade > 0 AND unidade IS NOT NULL)
    ),
    CONSTRAINT ck_item_lista_compras_status_compra CHECK (
        (status = 'PENDENTE' AND comprado_em IS NULL AND comprado_por_participacao_id IS NULL)
        OR (status = 'COMPRADO' AND comprado_em IS NOT NULL AND comprado_por_participacao_id IS NOT NULL)
    ),
    CONSTRAINT ck_item_lista_compras_versao CHECK (versao > 0)
);

CREATE INDEX idx_item_lista_compras_casa_status_criado
    ON item_lista_compras(casa_id, status, criado_em DESC, id);
CREATE INDEX idx_item_lista_compras_casa_status_comprado
    ON item_lista_compras(casa_id, status, comprado_em DESC, id);

COMMIT;
