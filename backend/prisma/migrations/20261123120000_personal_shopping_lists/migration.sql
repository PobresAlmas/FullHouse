BEGIN;

ALTER TABLE item_lista_compras
    ALTER COLUMN casa_id DROP NOT NULL,
    ADD COLUMN usuario_id uuid,
    ADD COLUMN comprado_por_usuario_id uuid;

ALTER TABLE item_lista_compras
    ADD CONSTRAINT fk_item_lista_compras_usuario FOREIGN KEY (usuario_id)
        REFERENCES usuario(id) ON DELETE CASCADE ON UPDATE NO ACTION,
    ADD CONSTRAINT fk_item_lista_compras_comprado_usuario FOREIGN KEY (comprado_por_usuario_id)
        REFERENCES usuario(id) ON DELETE SET NULL ON UPDATE NO ACTION,
    ADD CONSTRAINT ck_item_lista_compras_escopo CHECK (
        (casa_id IS NOT NULL AND usuario_id IS NULL)
        OR (casa_id IS NULL AND usuario_id IS NOT NULL)
    );

ALTER TABLE item_lista_compras DROP CONSTRAINT ck_item_lista_compras_status_compra;
ALTER TABLE item_lista_compras ADD CONSTRAINT ck_item_lista_compras_status_compra CHECK (
    (status = 'PENDENTE' AND comprado_em IS NULL
        AND comprado_por_participacao_id IS NULL AND comprado_por_usuario_id IS NULL)
    OR (status = 'COMPRADO' AND comprado_em IS NOT NULL
        AND ((comprado_por_participacao_id IS NOT NULL AND comprado_por_usuario_id IS NULL)
            OR (comprado_por_participacao_id IS NULL AND comprado_por_usuario_id IS NOT NULL)))
);

CREATE INDEX idx_item_lista_compras_usuario_status_criado
    ON item_lista_compras(usuario_id, status, criado_em DESC, id);

COMMIT;
