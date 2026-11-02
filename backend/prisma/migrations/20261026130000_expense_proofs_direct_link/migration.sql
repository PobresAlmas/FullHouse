ALTER TABLE "comprovante_pagamento"
ADD COLUMN "despesa_id" UUID,
ADD COLUMN "enviado_por_usuario_id" UUID,
ALTER COLUMN "enviado_por_participacao_id" DROP NOT NULL;

ALTER TABLE "comprovante_pagamento"
ADD CONSTRAINT "comprovante_pagamento_despesa_id_fkey"
FOREIGN KEY ("despesa_id") REFERENCES "despesa"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
ADD CONSTRAINT "comprovante_pagamento_enviado_por_usuario_id_fkey"
FOREIGN KEY ("enviado_por_usuario_id") REFERENCES "usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE INDEX "idx_comprovante_pagamento_despesa"
ON "comprovante_pagamento"("despesa_id");
