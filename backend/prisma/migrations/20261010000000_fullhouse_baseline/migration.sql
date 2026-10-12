-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- Required by usuario.email, which is mapped to PostgreSQL CITEXT.
CREATE EXTENSION IF NOT EXISTS "citext";

-- CreateEnum
CREATE TYPE "escopo_despesa_enum" AS ENUM ('CASA', 'INDIVIDUAL');

-- CreateEnum
CREATE TYPE "escopo_regra_enum" AS ENUM ('CASA', 'SUBGRUPO');

-- CreateEnum
CREATE TYPE "escopo_tarefa_enum" AS ENUM ('CASA', 'INDIVIDUAL');

-- CreateEnum
CREATE TYPE "estrategia_rateio_enum" AS ENUM ('IGUALITARIO', 'PERCENTUAL', 'PERSONALIZADO');

-- CreateEnum
CREATE TYPE "metodo_pagamento_enum" AS ENUM ('PIX', 'DINHEIRO', 'CARTAO', 'TRANSFERENCIA', 'OUTRO');

-- CreateEnum
CREATE TYPE "natureza_lancamento_enum" AS ENUM ('DEBITO', 'CREDITO');

-- CreateEnum
CREATE TYPE "origem_lancamento_enum" AS ENUM ('RATEIO', 'PAGAMENTO', 'PENALIDADE', 'FUNDO');

-- CreateEnum
CREATE TYPE "papel_participacao_enum" AS ENUM ('LIDER', 'ADMINISTRADOR', 'MORADOR');

-- CreateEnum
CREATE TYPE "periodicidade_enum" AS ENUM ('DIARIA', 'SEMANAL', 'QUINZENAL', 'MENSAL', 'PERSONALIZADA');

-- CreateEnum
CREATE TYPE "periodo_renovacao_enum" AS ENUM ('MENSAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL');

-- CreateEnum
CREATE TYPE "permissao_enum" AS ENUM ('GERENCIAR_MEMBROS', 'GERENCIAR_TAREFAS', 'GERENCIAR_FINANCAS', 'GERENCIAR_REGRAS', 'GERENCIAR_CONVITES', 'GERENCIAR_CONFIGURACOES');

-- CreateEnum
CREATE TYPE "propriedade_item_enum" AS ENUM ('COMUNITARIO', 'PRIVADO');

-- CreateEnum
CREATE TYPE "situacao_participante_reuniao_enum" AS ENUM ('PENDENTE', 'CONFIRMADO', 'RECUSADO');

-- CreateEnum
CREATE TYPE "status_anuncio_enum" AS ENUM ('ABERTO', 'FECHADO');

-- CreateEnum
CREATE TYPE "status_casa_enum" AS ENUM ('ATIVA', 'FECHADA');

-- CreateEnum
CREATE TYPE "status_convite_enum" AS ENUM ('PENDENTE', 'ACEITO', 'RECUSADO', 'EXPIRADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "status_despesa_enum" AS ENUM ('ABERTA', 'QUITADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "status_instancia_tarefa_enum" AS ENUM ('PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA', 'ATRASADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "status_interesse_anuncio_enum" AS ENUM ('PENDENTE', 'ACEITO', 'RECUSADO');

-- CreateEnum
CREATE TYPE "status_moradia_enum" AS ENUM ('MORANDO', 'PROCURANDO');

-- CreateEnum
CREATE TYPE "status_negociacao_enum" AS ENUM ('PENDENTE', 'APROVADA', 'REJEITADA', 'EXPIRADA');

-- CreateEnum
CREATE TYPE "status_penalidade_enum" AS ENUM ('PENDENTE', 'PAGA', 'NEGOCIADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "status_proposta_regra_enum" AS ENUM ('EM_VOTACAO', 'APROVADA', 'REJEITADA', 'EXPIRADA');

-- CreateEnum
CREATE TYPE "status_regra_enum" AS ENUM ('VIGENTE', 'REVOGADA');

-- CreateEnum
CREATE TYPE "status_reuniao_enum" AS ENUM ('AGENDADA', 'REALIZADA', 'CANCELADA', 'REAGENDADA');

-- CreateEnum
CREATE TYPE "status_troca_enum" AS ENUM ('PENDENTE', 'ACEITA', 'RECUSADA', 'EXPIRADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "tipo_arquivo_comprovante_enum" AS ENUM ('IMAGEM', 'PDF');

-- CreateEnum
CREATE TYPE "tipo_atribuicao_enum" AS ENUM ('FIXA', 'RODIZIO');

-- CreateEnum
CREATE TYPE "tipo_contribuicao_fundo_enum" AS ENUM ('LIVRE', 'FIXA');

-- CreateEnum
CREATE TYPE "tipo_conversa_enum" AS ENUM ('CASA', 'SUBGRUPO');

-- CreateEnum
CREATE TYPE "tipo_despesa_enum" AS ENUM ('FIXA', 'VARIAVEL');

-- CreateEnum
CREATE TYPE "tipo_movimentacao_despensa_enum" AS ENUM ('ENTRADA', 'CONSUMO', 'DESCARTE');

-- CreateEnum
CREATE TYPE "tipo_notificacao_enum" AS ENUM ('TAREFA', 'DESPESA', 'PENALIDADE', 'REGRA', 'REUNIAO', 'CONVITE', 'SISTEMA');

-- CreateEnum
CREATE TYPE "tipo_troca_enum" AS ENUM ('PONTUAL', 'PERMANENTE');

-- CreateEnum
CREATE TYPE "unidade_item_enum" AS ENUM ('UNIDADE', 'KG', 'G', 'L', 'ML', 'PACOTE');

-- CreateEnum
CREATE TYPE "visibilidade_despesa_enum" AS ENUM ('PUBLICA', 'RESTRITA');

-- CreateEnum
CREATE TYPE "visibilidade_tarefa_enum" AS ENUM ('PUBLICA', 'PRIVADA');

-- CreateEnum
CREATE TYPE "voto_enum" AS ENUM ('APROVAR', 'REJEITAR', 'ABSTER');

-- CreateTable
CREATE TABLE "alocacao_pagamento" (
    "pagamento_id" UUID NOT NULL,
    "rateio_despesa_id" UUID NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "alocacao_pagamento_pkey" PRIMARY KEY ("pagamento_id","rateio_despesa_id")
);

-- CreateTable
CREATE TABLE "anuncio_quarto" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "casa_id" UUID NOT NULL,
    "titulo" VARCHAR(150) NOT NULL,
    "descricao" TEXT,
    "valor_mensal" DECIMAL(10,2) NOT NULL,
    "cidade" VARCHAR(100) NOT NULL,
    "bairro" VARCHAR(100),
    "status" "status_anuncio_enum" NOT NULL DEFAULT 'ABERTO',
    "exibir_endereco" BOOLEAN NOT NULL DEFAULT false,
    "endereco_referencia" VARCHAR(255),
    "exibir_contato" BOOLEAN NOT NULL DEFAULT false,
    "criado_por_participacao_id" UUID NOT NULL,

    CONSTRAINT "anuncio_quarto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "casa" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nome" VARCHAR(150) NOT NULL,
    "cidade" VARCHAR(100),
    "bairro" VARCHAR(100),
    "status" "status_casa_enum" NOT NULL DEFAULT 'ATIVA',
    "criada_por_usuario_id" UUID NOT NULL,
    "fechada_em" TIMESTAMPTZ(6),
    "excluido_em" TIMESTAMPTZ(6),

    CONSTRAINT "casa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comprovante_pagamento" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "rateio_despesa_id" UUID,
    "pagamento_id" UUID,
    "arquivo_url" VARCHAR(500) NOT NULL,
    "tipo_arquivo" "tipo_arquivo_comprovante_enum" NOT NULL,
    "enviado_por_participacao_id" UUID NOT NULL,

    CONSTRAINT "comprovante_pagamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracao_casa" (
    "casa_id" UUID NOT NULL,
    "penalidade_ativa" BOOLEAN NOT NULL DEFAULT true,
    "tolerancia_padrao_horas" SMALLINT NOT NULL DEFAULT 24,
    "ocorrencias_para_penalidade" SMALLINT NOT NULL DEFAULT 1,
    "penalidade_valor_padrao" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "limite_negociacoes" SMALLINT NOT NULL DEFAULT 3,
    "periodo_renovacao_limites" "periodo_renovacao_enum" NOT NULL DEFAULT 'MENSAL',
    "votacao_regras_obrigatoria" BOOLEAN NOT NULL DEFAULT true,
    "quorum_minimo_aprovacao" SMALLINT NOT NULL DEFAULT 1,
    "prazo_aprovacao_regra_dias" SMALLINT NOT NULL DEFAULT 7,
    "estrategia_rateio_padrao" "estrategia_rateio_enum" NOT NULL DEFAULT 'IGUALITARIO',

    CONSTRAINT "configuracao_casa_pkey" PRIMARY KEY ("casa_id")
);

-- CreateTable
CREATE TABLE "conversa" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "casa_id" UUID NOT NULL,
    "subgrupo_id" UUID,
    "tipo" "tipo_conversa_enum" NOT NULL,
    "titulo" VARCHAR(150),

    CONSTRAINT "conversa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "convite_casa" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "casa_id" UUID NOT NULL,
    "codigo_pessoal_convidado" CHAR(6),
    "usuario_convidado_id" UUID,
    "convidado_por_participacao_id" UUID NOT NULL,
    "status" "status_convite_enum" NOT NULL DEFAULT 'PENDENTE',
    "expira_em" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "convite_casa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cuidado_pet" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pet_id" UUID NOT NULL,
    "tipo" VARCHAR(50) NOT NULL,
    "data_cuidado" DATE NOT NULL,
    "valor" DECIMAL(10,2),
    "pago_por_participacao_id" UUID,
    "despesa_id" UUID,
    "proxima_ocorrencia" DATE,
    "registrado_por_participacao_id" UUID NOT NULL,

    CONSTRAINT "cuidado_pet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "definicao_tarefa" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "escopo" "escopo_tarefa_enum" NOT NULL,
    "casa_id" UUID,
    "usuario_id" UUID,
    "titulo" VARCHAR(150) NOT NULL,
    "cor" CHAR(7),
    "periodicidade" "periodicidade_enum" NOT NULL,
    "intervalo_dias" SMALLINT,
    "regra_recorrencia" JSONB,
    "tipo_atribuicao" "tipo_atribuicao_enum" NOT NULL,
    "responsavel_fixo_participacao_id" UUID,
    "visibilidade" "visibilidade_tarefa_enum" NOT NULL DEFAULT 'PUBLICA',
    "tolerancia_horas" SMALLINT,
    "gera_penalidade" BOOLEAN NOT NULL DEFAULT false,
    "valor_penalidade" DECIMAL(10,2),
    "data_inicio" DATE NOT NULL,
    "data_fim" DATE,

    CONSTRAINT "definicao_tarefa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "despesa" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "escopo" "escopo_despesa_enum" NOT NULL,
    "casa_id" UUID,
    "usuario_id" UUID,
    "subgrupo_id" UUID,
    "descricao" VARCHAR(255) NOT NULL,
    "valor_total" DECIMAL(12,2) NOT NULL,
    "tipo" "tipo_despesa_enum" NOT NULL,
    "estrategia_rateio" "estrategia_rateio_enum" NOT NULL,
    "visibilidade" "visibilidade_despesa_enum" NOT NULL DEFAULT 'PUBLICA',
    "data_vencimento" DATE,
    "pago_por_participacao_id" UUID,
    "status" "status_despesa_enum" NOT NULL DEFAULT 'ABERTA',
    "quitada_em" TIMESTAMPTZ(6),

    CONSTRAINT "despesa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fila_rodizio" (
    "definicao_tarefa_id" UUID NOT NULL,
    "ordem" SMALLINT NOT NULL,
    "participacao_id" UUID NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "fila_rodizio_pkey" PRIMARY KEY ("definicao_tarefa_id","ordem")
);

-- CreateTable
CREATE TABLE "fundo_reserva" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "casa_id" UUID NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "tipo_contribuicao" "tipo_contribuicao_fundo_enum" NOT NULL,
    "valor_contribuicao_fixa" DECIMAL(12,2),
    "meta" DECIMAL(12,2),

    CONSTRAINT "fundo_reserva_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instancia_tarefa" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "definicao_tarefa_id" UUID NOT NULL,
    "data_prevista" DATE NOT NULL,
    "prazo_limite" TIMESTAMPTZ(6),
    "responsavel_participacao_id" UUID,
    "responsavel_usuario_id" UUID,
    "ordem_rodizio" SMALLINT,
    "status" "status_instancia_tarefa_enum" NOT NULL DEFAULT 'PENDENTE',
    "concluida_em" TIMESTAMPTZ(6),
    "concluida_por_participacao_id" UUID,

    CONSTRAINT "instancia_tarefa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interesse_anuncio" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "anuncio_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "mensagem" TEXT,
    "status" "status_interesse_anuncio_enum" NOT NULL DEFAULT 'PENDENTE',

    CONSTRAINT "interesse_anuncio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_despensa" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "casa_id" UUID NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "propriedade" "propriedade_item_enum" NOT NULL,
    "dono_participacao_id" UUID,
    "unidade" "unidade_item_enum" NOT NULL,
    "quantidade_minima" DECIMAL(10,2),
    "data_validade" DATE,
    "criado_por_participacao_id" UUID NOT NULL,

    CONSTRAINT "item_despensa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lancamento_financeiro" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "casa_id" UUID NOT NULL,
    "participacao_id" UUID,
    "fundo_reserva_id" UUID,
    "natureza" "natureza_lancamento_enum" NOT NULL,
    "origem" "origem_lancamento_enum" NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "descricao" VARCHAR(255),
    "motivo" TEXT,
    "despesa_id" UUID,
    "rateio_despesa_id" UUID,
    "pagamento_id" UUID,
    "penalidade_id" UUID,
    "estorna_lancamento_id" UUID,
    "ocorrido_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lancamento_financeiro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leitura_conversa" (
    "conversa_id" UUID NOT NULL,
    "participacao_id" UUID NOT NULL,
    "ultima_mensagem_lida_id" UUID,
    "atualizado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leitura_conversa_pkey" PRIMARY KEY ("conversa_id","participacao_id")
);

-- CreateTable
CREATE TABLE "lembrete" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "titulo" VARCHAR(150) NOT NULL,
    "lembrar_em" TIMESTAMPTZ(6) NOT NULL,
    "instancia_tarefa_id" UUID,
    "despesa_id" UUID,
    "rateio_despesa_id" UUID,
    "item_despensa_id" UUID,
    "enviado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "lembrete_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membro_subgrupo" (
    "subgrupo_id" UUID NOT NULL,
    "participacao_id" UUID NOT NULL,
    "entrou_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "saiu_em" TIMESTAMPTZ(6),

    CONSTRAINT "membro_subgrupo_pkey" PRIMARY KEY ("subgrupo_id","participacao_id")
);

-- CreateTable
CREATE TABLE "mensagem" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "conversa_id" UUID NOT NULL,
    "autor_participacao_id" UUID NOT NULL,
    "conteudo" TEXT NOT NULL,
    "responde_mensagem_id" UUID,
    "enviada_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "excluido_em" TIMESTAMPTZ(6),

    CONSTRAINT "mensagem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimentacao_despensa" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "item_despensa_id" UUID NOT NULL,
    "tipo" "tipo_movimentacao_despensa_enum" NOT NULL,
    "quantidade" DECIMAL(10,2) NOT NULL,
    "participacao_id" UUID NOT NULL,
    "ocorrido_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimentacao_despensa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "negociacao_penalidade" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "penalidade_id" UUID NOT NULL,
    "solicitante_participacao_id" UUID NOT NULL,
    "justificativa" TEXT NOT NULL,
    "status" "status_negociacao_enum" NOT NULL DEFAULT 'PENDENTE',
    "prazo_votacao" TIMESTAMPTZ(6),

    CONSTRAINT "negociacao_penalidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacao" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "casa_id" UUID,
    "tipo" "tipo_notificacao_enum" NOT NULL,
    "titulo" VARCHAR(150) NOT NULL,
    "mensagem" TEXT,
    "entidade_tipo" VARCHAR(50),
    "entidade_id" UUID,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagamento" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "casa_id" UUID NOT NULL,
    "participacao_id" UUID NOT NULL,
    "destino_participacao_id" UUID,
    "valor" DECIMAL(12,2) NOT NULL,
    "metodo" "metodo_pagamento_enum" NOT NULL,
    "pago_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmado_em" TIMESTAMPTZ(6),

    CONSTRAINT "pagamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participacao" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "casa_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "papel" "papel_participacao_enum" NOT NULL DEFAULT 'MORADOR',
    "data_entrada" DATE NOT NULL DEFAULT CURRENT_DATE,
    "data_saida" DATE,
    "convite_id" UUID,

    CONSTRAINT "participacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participante_reuniao" (
    "reuniao_id" UUID NOT NULL,
    "participacao_id" UUID NOT NULL,
    "situacao" "situacao_participante_reuniao_enum" NOT NULL DEFAULT 'PENDENTE',
    "respondido_em" TIMESTAMPTZ(6),

    CONSTRAINT "participante_reuniao_pkey" PRIMARY KEY ("reuniao_id","participacao_id")
);

-- CreateTable
CREATE TABLE "penalidade" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "casa_id" UUID NOT NULL,
    "participacao_id" UUID NOT NULL,
    "instancia_tarefa_id" UUID,
    "motivo" TEXT,
    "valor" DECIMAL(10,2) NOT NULL,
    "status" "status_penalidade_enum" NOT NULL DEFAULT 'PENDENTE',
    "aplicada_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "penalidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perfil_convivencia_casa" (
    "casa_id" UUID NOT NULL,
    "aceita_pets" BOOLEAN NOT NULL DEFAULT false,
    "permite_fumar" BOOLEAN NOT NULL DEFAULT false,
    "aceita_visitas" BOOLEAN NOT NULL DEFAULT true,
    "horario_silencio_inicio" TIME(6),
    "horario_silencio_fim" TIME(6),
    "perfil_publico" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "perfil_convivencia_casa_pkey" PRIMARY KEY ("casa_id")
);

-- CreateTable
CREATE TABLE "permissao_participacao" (
    "participacao_id" UUID NOT NULL,
    "permissao" "permissao_enum" NOT NULL,
    "concedida_por_participacao_id" UUID,
    "concedida_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissao_participacao_pkey" PRIMARY KEY ("participacao_id","permissao")
);

-- CreateTable
CREATE TABLE "pet" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "casa_id" UUID NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "especie" VARCHAR(100) NOT NULL,
    "raca" VARCHAR(100),
    "data_nascimento" DATE,
    "criado_por_participacao_id" UUID NOT NULL,

    CONSTRAINT "pet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposta_regra" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "casa_id" UUID NOT NULL,
    "regra_id" UUID,
    "titulo" VARCHAR(150) NOT NULL,
    "escopo" "escopo_regra_enum" NOT NULL,
    "subgrupo_id" UUID,
    "proposta_por_participacao_id" UUID NOT NULL,
    "quorum_minimo" SMALLINT NOT NULL,
    "status" "status_proposta_regra_enum" NOT NULL DEFAULT 'EM_VOTACAO',
    "prazo_votacao" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "proposta_regra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rateio_despesa" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "despesa_id" UUID NOT NULL,
    "participacao_id" UUID NOT NULL,
    "valor_devido" DECIMAL(12,2) NOT NULL,
    "percentual" DECIMAL(5,2),
    "pago" BOOLEAN NOT NULL DEFAULT false,
    "pago_em" TIMESTAMPTZ(6),

    CONSTRAINT "rateio_despesa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regra_convivencia" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "casa_id" UUID NOT NULL,
    "titulo" VARCHAR(150) NOT NULL,
    "descricao" TEXT NOT NULL,
    "escopo" "escopo_regra_enum" NOT NULL,
    "subgrupo_id" UUID,
    "status" "status_regra_enum" NOT NULL DEFAULT 'VIGENTE',
    "proposta_origem_id" UUID,
    "criada_por_participacao_id" UUID NOT NULL,
    "atualizada_por_participacao_id" UUID,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "regra_convivencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reuniao" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "casa_id" UUID NOT NULL,
    "titulo" VARCHAR(150) NOT NULL,
    "pauta" TEXT,
    "data_hora" TIMESTAMPTZ(6) NOT NULL,
    "status" "status_reuniao_enum" NOT NULL DEFAULT 'AGENDADA',
    "reagendada_de_id" UUID,
    "criada_por_participacao_id" UUID NOT NULL,

    CONSTRAINT "reuniao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saldo_negociacao" (
    "participacao_id" UUID NOT NULL,
    "limites_disponiveis" SMALLINT NOT NULL,
    "ciclo_inicio" DATE NOT NULL DEFAULT CURRENT_DATE,
    "proxima_renovacao" DATE NOT NULL,

    CONSTRAINT "saldo_negociacao_pkey" PRIMARY KEY ("participacao_id")
);

-- CreateTable
CREATE TABLE "solicitacao_troca_tarefa" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "instancia_tarefa_id" UUID NOT NULL,
    "solicitante_participacao_id" UUID NOT NULL,
    "destinatario_participacao_id" UUID NOT NULL,
    "tipo" "tipo_troca_enum" NOT NULL,
    "status" "status_troca_enum" NOT NULL DEFAULT 'PENDENTE',
    "expira_em" TIMESTAMPTZ(6),

    CONSTRAINT "solicitacao_troca_tarefa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subgrupo" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "casa_id" UUID NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "criado_por_participacao_id" UUID NOT NULL,
    "excluido_em" TIMESTAMPTZ(6),

    CONSTRAINT "subgrupo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "codigo_pessoal" CHAR(6) NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "apelido" VARCHAR(100),
    "email" CITEXT NOT NULL,
    "senha_hash" VARCHAR(255) NOT NULL,
    "foto_url" VARCHAR(500),
    "status_moradia" "status_moradia_enum" NOT NULL DEFAULT 'PROCURANDO',
    "anonimizado_em" TIMESTAMPTZ(6),
    "excluido_em" TIMESTAMPTZ(6),

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "codigo" CHAR(6) NOT NULL,
    "expira_em" TIMESTAMPTZ(6) NOT NULL,
    "usado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "password_reset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voto_negociacao" (
    "negociacao_id" UUID NOT NULL,
    "participacao_id" UUID NOT NULL,
    "voto" "voto_enum" NOT NULL,
    "votado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voto_negociacao_pkey" PRIMARY KEY ("negociacao_id","participacao_id")
);

-- CreateTable
CREATE TABLE "voto_proposta_regra" (
    "proposta_id" UUID NOT NULL,
    "participacao_id" UUID NOT NULL,
    "voto" "voto_enum" NOT NULL,
    "votado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voto_proposta_regra_pkey" PRIMARY KEY ("proposta_id","participacao_id")
);

-- CreateIndex
CREATE INDEX "idx_anuncio_quarto_cidade_bairro" ON "anuncio_quarto"("cidade", "bairro");

-- CreateIndex
CREATE UNIQUE INDEX "conversa_subgrupo_id_key" ON "conversa"("subgrupo_id");

-- CreateIndex
CREATE INDEX "idx_convite_casa_casa" ON "convite_casa"("casa_id");

-- CreateIndex
CREATE INDEX "idx_definicao_tarefa_casa" ON "definicao_tarefa"("casa_id");

-- CreateIndex
CREATE INDEX "idx_despesa_casa" ON "despesa"("casa_id");

-- CreateIndex
CREATE UNIQUE INDEX "fundo_reserva_casa_id_key" ON "fundo_reserva"("casa_id");

-- CreateIndex
CREATE INDEX "idx_instancia_tarefa_definicao" ON "instancia_tarefa"("definicao_tarefa_id");

-- CreateIndex
CREATE INDEX "idx_instancia_tarefa_responsavel" ON "instancia_tarefa"("responsavel_participacao_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_instancia_tarefa_data" ON "instancia_tarefa"("definicao_tarefa_id", "data_prevista");

-- CreateIndex
CREATE INDEX "idx_item_despensa_casa" ON "item_despensa"("casa_id");

-- CreateIndex
CREATE INDEX "idx_lancamento_financeiro_casa" ON "lancamento_financeiro"("casa_id");

-- CreateIndex
CREATE INDEX "idx_lancamento_financeiro_participacao" ON "lancamento_financeiro"("participacao_id");

-- CreateIndex
CREATE INDEX "idx_mensagem_conversa" ON "mensagem"("conversa_id");

-- CreateIndex
CREATE INDEX "idx_notificacao_usuario_lida" ON "notificacao"("usuario_id", "lida");

-- CreateIndex
CREATE INDEX "idx_participacao_casa" ON "participacao"("casa_id");

-- CreateIndex
CREATE INDEX "idx_participacao_usuario" ON "participacao"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_participacao_casa_usuario_ativo" ON "participacao"("casa_id", "usuario_id", "data_saida");

-- CreateIndex
CREATE INDEX "idx_penalidade_participacao" ON "penalidade"("participacao_id");

-- CreateIndex
CREATE INDEX "idx_rateio_despesa_despesa" ON "rateio_despesa"("despesa_id");

-- CreateIndex
CREATE INDEX "idx_rateio_despesa_participacao" ON "rateio_despesa"("participacao_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_rateio_despesa_participacao" ON "rateio_despesa"("despesa_id", "participacao_id");

-- CreateIndex
CREATE INDEX "idx_regra_convivencia_casa" ON "regra_convivencia"("casa_id");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_codigo_pessoal_key" ON "usuario"("codigo_pessoal");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE INDEX "password_reset_usuario_id_idx" ON "password_reset"("usuario_id");

-- AddForeignKey
ALTER TABLE "alocacao_pagamento" ADD CONSTRAINT "alocacao_pagamento_pagamento_id_fkey" FOREIGN KEY ("pagamento_id") REFERENCES "pagamento"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "alocacao_pagamento" ADD CONSTRAINT "alocacao_pagamento_rateio_despesa_id_fkey" FOREIGN KEY ("rateio_despesa_id") REFERENCES "rateio_despesa"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "anuncio_quarto" ADD CONSTRAINT "anuncio_quarto_casa_id_fkey" FOREIGN KEY ("casa_id") REFERENCES "casa"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "anuncio_quarto" ADD CONSTRAINT "anuncio_quarto_criado_por_participacao_id_fkey" FOREIGN KEY ("criado_por_participacao_id") REFERENCES "participacao"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "casa" ADD CONSTRAINT "casa_criada_por_usuario_id_fkey" FOREIGN KEY ("criada_por_usuario_id") REFERENCES "usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "comprovante_pagamento" ADD CONSTRAINT "comprovante_pagamento_enviado_por_participacao_id_fkey" FOREIGN KEY ("enviado_por_participacao_id") REFERENCES "participacao"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "comprovante_pagamento" ADD CONSTRAINT "comprovante_pagamento_pagamento_id_fkey" FOREIGN KEY ("pagamento_id") REFERENCES "pagamento"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "comprovante_pagamento" ADD CONSTRAINT "comprovante_pagamento_rateio_despesa_id_fkey" FOREIGN KEY ("rateio_despesa_id") REFERENCES "rateio_despesa"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "configuracao_casa" ADD CONSTRAINT "configuracao_casa_casa_id_fkey" FOREIGN KEY ("casa_id") REFERENCES "casa"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "conversa" ADD CONSTRAINT "conversa_casa_id_fkey" FOREIGN KEY ("casa_id") REFERENCES "casa"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "conversa" ADD CONSTRAINT "conversa_subgrupo_id_fkey" FOREIGN KEY ("subgrupo_id") REFERENCES "subgrupo"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "convite_casa" ADD CONSTRAINT "convite_casa_casa_id_fkey" FOREIGN KEY ("casa_id") REFERENCES "casa"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "convite_casa" ADD CONSTRAINT "convite_casa_convidado_por_participacao_id_fkey" FOREIGN KEY ("convidado_por_participacao_id") REFERENCES "participacao"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "convite_casa" ADD CONSTRAINT "convite_casa_usuario_convidado_id_fkey" FOREIGN KEY ("usuario_convidado_id") REFERENCES "usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cuidado_pet" ADD CONSTRAINT "cuidado_pet_despesa_id_fkey" FOREIGN KEY ("despesa_id") REFERENCES "despesa"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cuidado_pet" ADD CONSTRAINT "cuidado_pet_pago_por_participacao_id_fkey" FOREIGN KEY ("pago_por_participacao_id") REFERENCES "participacao"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cuidado_pet" ADD CONSTRAINT "cuidado_pet_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pet"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cuidado_pet" ADD CONSTRAINT "cuidado_pet_registrado_por_participacao_id_fkey" FOREIGN KEY ("registrado_por_participacao_id") REFERENCES "participacao"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "definicao_tarefa" ADD CONSTRAINT "definicao_tarefa_casa_id_fkey" FOREIGN KEY ("casa_id") REFERENCES "casa"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "definicao_tarefa" ADD CONSTRAINT "definicao_tarefa_responsavel_fixo_participacao_id_fkey" FOREIGN KEY ("responsavel_fixo_participacao_id") REFERENCES "participacao"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "definicao_tarefa" ADD CONSTRAINT "definicao_tarefa_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "despesa" ADD CONSTRAINT "despesa_casa_id_fkey" FOREIGN KEY ("casa_id") REFERENCES "casa"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "despesa" ADD CONSTRAINT "despesa_pago_por_participacao_id_fkey" FOREIGN KEY ("pago_por_participacao_id") REFERENCES "participacao"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "despesa" ADD CONSTRAINT "despesa_subgrupo_id_fkey" FOREIGN KEY ("subgrupo_id") REFERENCES "subgrupo"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "despesa" ADD CONSTRAINT "despesa_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "fila_rodizio" ADD CONSTRAINT "fila_rodizio_definicao_tarefa_id_fkey" FOREIGN KEY ("definicao_tarefa_id") REFERENCES "definicao_tarefa"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "fila_rodizio" ADD CONSTRAINT "fila_rodizio_participacao_id_fkey" FOREIGN KEY ("participacao_id") REFERENCES "participacao"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "fundo_reserva" ADD CONSTRAINT "fundo_reserva_casa_id_fkey" FOREIGN KEY ("casa_id") REFERENCES "casa"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "instancia_tarefa" ADD CONSTRAINT "instancia_tarefa_concluida_por_participacao_id_fkey" FOREIGN KEY ("concluida_por_participacao_id") REFERENCES "participacao"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "instancia_tarefa" ADD CONSTRAINT "instancia_tarefa_definicao_tarefa_id_fkey" FOREIGN KEY ("definicao_tarefa_id") REFERENCES "definicao_tarefa"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "instancia_tarefa" ADD CONSTRAINT "instancia_tarefa_responsavel_participacao_id_fkey" FOREIGN KEY ("responsavel_participacao_id") REFERENCES "participacao"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "instancia_tarefa" ADD CONSTRAINT "instancia_tarefa_responsavel_usuario_id_fkey" FOREIGN KEY ("responsavel_usuario_id") REFERENCES "usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "interesse_anuncio" ADD CONSTRAINT "interesse_anuncio_anuncio_id_fkey" FOREIGN KEY ("anuncio_id") REFERENCES "anuncio_quarto"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "interesse_anuncio" ADD CONSTRAINT "interesse_anuncio_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "item_despensa" ADD CONSTRAINT "item_despensa_casa_id_fkey" FOREIGN KEY ("casa_id") REFERENCES "casa"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "item_despensa" ADD CONSTRAINT "item_despensa_criado_por_participacao_id_fkey" FOREIGN KEY ("criado_por_participacao_id") REFERENCES "participacao"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "item_despensa" ADD CONSTRAINT "item_despensa_dono_participacao_id_fkey" FOREIGN KEY ("dono_participacao_id") REFERENCES "participacao"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lancamento_financeiro" ADD CONSTRAINT "lancamento_financeiro_casa_id_fkey" FOREIGN KEY ("casa_id") REFERENCES "casa"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lancamento_financeiro" ADD CONSTRAINT "lancamento_financeiro_despesa_id_fkey" FOREIGN KEY ("despesa_id") REFERENCES "despesa"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lancamento_financeiro" ADD CONSTRAINT "lancamento_financeiro_estorna_lancamento_id_fkey" FOREIGN KEY ("estorna_lancamento_id") REFERENCES "lancamento_financeiro"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lancamento_financeiro" ADD CONSTRAINT "lancamento_financeiro_fundo_reserva_id_fkey" FOREIGN KEY ("fundo_reserva_id") REFERENCES "fundo_reserva"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lancamento_financeiro" ADD CONSTRAINT "lancamento_financeiro_pagamento_id_fkey" FOREIGN KEY ("pagamento_id") REFERENCES "pagamento"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lancamento_financeiro" ADD CONSTRAINT "lancamento_financeiro_participacao_id_fkey" FOREIGN KEY ("participacao_id") REFERENCES "participacao"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lancamento_financeiro" ADD CONSTRAINT "lancamento_financeiro_penalidade_id_fkey" FOREIGN KEY ("penalidade_id") REFERENCES "penalidade"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lancamento_financeiro" ADD CONSTRAINT "lancamento_financeiro_rateio_despesa_id_fkey" FOREIGN KEY ("rateio_despesa_id") REFERENCES "rateio_despesa"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "leitura_conversa" ADD CONSTRAINT "leitura_conversa_conversa_id_fkey" FOREIGN KEY ("conversa_id") REFERENCES "conversa"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "leitura_conversa" ADD CONSTRAINT "leitura_conversa_participacao_id_fkey" FOREIGN KEY ("participacao_id") REFERENCES "participacao"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "leitura_conversa" ADD CONSTRAINT "leitura_conversa_ultima_mensagem_lida_id_fkey" FOREIGN KEY ("ultima_mensagem_lida_id") REFERENCES "mensagem"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lembrete" ADD CONSTRAINT "lembrete_despesa_id_fkey" FOREIGN KEY ("despesa_id") REFERENCES "despesa"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lembrete" ADD CONSTRAINT "lembrete_instancia_tarefa_id_fkey" FOREIGN KEY ("instancia_tarefa_id") REFERENCES "instancia_tarefa"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lembrete" ADD CONSTRAINT "lembrete_item_despensa_id_fkey" FOREIGN KEY ("item_despensa_id") REFERENCES "item_despensa"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lembrete" ADD CONSTRAINT "lembrete_rateio_despesa_id_fkey" FOREIGN KEY ("rateio_despesa_id") REFERENCES "rateio_despesa"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lembrete" ADD CONSTRAINT "lembrete_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "membro_subgrupo" ADD CONSTRAINT "membro_subgrupo_participacao_id_fkey" FOREIGN KEY ("participacao_id") REFERENCES "participacao"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "membro_subgrupo" ADD CONSTRAINT "membro_subgrupo_subgrupo_id_fkey" FOREIGN KEY ("subgrupo_id") REFERENCES "subgrupo"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mensagem" ADD CONSTRAINT "mensagem_autor_participacao_id_fkey" FOREIGN KEY ("autor_participacao_id") REFERENCES "participacao"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mensagem" ADD CONSTRAINT "mensagem_conversa_id_fkey" FOREIGN KEY ("conversa_id") REFERENCES "conversa"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mensagem" ADD CONSTRAINT "mensagem_responde_mensagem_id_fkey" FOREIGN KEY ("responde_mensagem_id") REFERENCES "mensagem"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "movimentacao_despensa" ADD CONSTRAINT "movimentacao_despensa_item_despensa_id_fkey" FOREIGN KEY ("item_despensa_id") REFERENCES "item_despensa"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "movimentacao_despensa" ADD CONSTRAINT "movimentacao_despensa_participacao_id_fkey" FOREIGN KEY ("participacao_id") REFERENCES "participacao"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "negociacao_penalidade" ADD CONSTRAINT "negociacao_penalidade_penalidade_id_fkey" FOREIGN KEY ("penalidade_id") REFERENCES "penalidade"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "negociacao_penalidade" ADD CONSTRAINT "negociacao_penalidade_solicitante_participacao_id_fkey" FOREIGN KEY ("solicitante_participacao_id") REFERENCES "participacao"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notificacao" ADD CONSTRAINT "notificacao_casa_id_fkey" FOREIGN KEY ("casa_id") REFERENCES "casa"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notificacao" ADD CONSTRAINT "notificacao_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pagamento" ADD CONSTRAINT "pagamento_casa_id_fkey" FOREIGN KEY ("casa_id") REFERENCES "casa"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pagamento" ADD CONSTRAINT "pagamento_destino_participacao_id_fkey" FOREIGN KEY ("destino_participacao_id") REFERENCES "participacao"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pagamento" ADD CONSTRAINT "pagamento_participacao_id_fkey" FOREIGN KEY ("participacao_id") REFERENCES "participacao"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "participacao" ADD CONSTRAINT "fk_participacao_convite" FOREIGN KEY ("convite_id") REFERENCES "convite_casa"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "participacao" ADD CONSTRAINT "participacao_casa_id_fkey" FOREIGN KEY ("casa_id") REFERENCES "casa"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "participacao" ADD CONSTRAINT "participacao_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "participante_reuniao" ADD CONSTRAINT "participante_reuniao_participacao_id_fkey" FOREIGN KEY ("participacao_id") REFERENCES "participacao"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "participante_reuniao" ADD CONSTRAINT "participante_reuniao_reuniao_id_fkey" FOREIGN KEY ("reuniao_id") REFERENCES "reuniao"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "penalidade" ADD CONSTRAINT "penalidade_casa_id_fkey" FOREIGN KEY ("casa_id") REFERENCES "casa"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "penalidade" ADD CONSTRAINT "penalidade_instancia_tarefa_id_fkey" FOREIGN KEY ("instancia_tarefa_id") REFERENCES "instancia_tarefa"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "penalidade" ADD CONSTRAINT "penalidade_participacao_id_fkey" FOREIGN KEY ("participacao_id") REFERENCES "participacao"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "perfil_convivencia_casa" ADD CONSTRAINT "perfil_convivencia_casa_casa_id_fkey" FOREIGN KEY ("casa_id") REFERENCES "casa"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "permissao_participacao" ADD CONSTRAINT "permissao_participacao_concedida_por_participacao_id_fkey" FOREIGN KEY ("concedida_por_participacao_id") REFERENCES "participacao"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "permissao_participacao" ADD CONSTRAINT "permissao_participacao_participacao_id_fkey" FOREIGN KEY ("participacao_id") REFERENCES "participacao"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pet" ADD CONSTRAINT "pet_casa_id_fkey" FOREIGN KEY ("casa_id") REFERENCES "casa"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pet" ADD CONSTRAINT "pet_criado_por_participacao_id_fkey" FOREIGN KEY ("criado_por_participacao_id") REFERENCES "participacao"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "proposta_regra" ADD CONSTRAINT "fk_proposta_regra_regra" FOREIGN KEY ("regra_id") REFERENCES "regra_convivencia"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "proposta_regra" ADD CONSTRAINT "proposta_regra_casa_id_fkey" FOREIGN KEY ("casa_id") REFERENCES "casa"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "proposta_regra" ADD CONSTRAINT "proposta_regra_proposta_por_participacao_id_fkey" FOREIGN KEY ("proposta_por_participacao_id") REFERENCES "participacao"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "proposta_regra" ADD CONSTRAINT "proposta_regra_subgrupo_id_fkey" FOREIGN KEY ("subgrupo_id") REFERENCES "subgrupo"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rateio_despesa" ADD CONSTRAINT "rateio_despesa_despesa_id_fkey" FOREIGN KEY ("despesa_id") REFERENCES "despesa"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rateio_despesa" ADD CONSTRAINT "rateio_despesa_participacao_id_fkey" FOREIGN KEY ("participacao_id") REFERENCES "participacao"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "regra_convivencia" ADD CONSTRAINT "regra_convivencia_atualizada_por_participacao_id_fkey" FOREIGN KEY ("atualizada_por_participacao_id") REFERENCES "participacao"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "regra_convivencia" ADD CONSTRAINT "regra_convivencia_casa_id_fkey" FOREIGN KEY ("casa_id") REFERENCES "casa"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "regra_convivencia" ADD CONSTRAINT "regra_convivencia_criada_por_participacao_id_fkey" FOREIGN KEY ("criada_por_participacao_id") REFERENCES "participacao"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "regra_convivencia" ADD CONSTRAINT "regra_convivencia_proposta_origem_id_fkey" FOREIGN KEY ("proposta_origem_id") REFERENCES "proposta_regra"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "regra_convivencia" ADD CONSTRAINT "regra_convivencia_subgrupo_id_fkey" FOREIGN KEY ("subgrupo_id") REFERENCES "subgrupo"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reuniao" ADD CONSTRAINT "reuniao_casa_id_fkey" FOREIGN KEY ("casa_id") REFERENCES "casa"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reuniao" ADD CONSTRAINT "reuniao_criada_por_participacao_id_fkey" FOREIGN KEY ("criada_por_participacao_id") REFERENCES "participacao"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reuniao" ADD CONSTRAINT "reuniao_reagendada_de_id_fkey" FOREIGN KEY ("reagendada_de_id") REFERENCES "reuniao"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "saldo_negociacao" ADD CONSTRAINT "saldo_negociacao_participacao_id_fkey" FOREIGN KEY ("participacao_id") REFERENCES "participacao"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "solicitacao_troca_tarefa" ADD CONSTRAINT "solicitacao_troca_tarefa_destinatario_participacao_id_fkey" FOREIGN KEY ("destinatario_participacao_id") REFERENCES "participacao"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "solicitacao_troca_tarefa" ADD CONSTRAINT "solicitacao_troca_tarefa_instancia_tarefa_id_fkey" FOREIGN KEY ("instancia_tarefa_id") REFERENCES "instancia_tarefa"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "solicitacao_troca_tarefa" ADD CONSTRAINT "solicitacao_troca_tarefa_solicitante_participacao_id_fkey" FOREIGN KEY ("solicitante_participacao_id") REFERENCES "participacao"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "subgrupo" ADD CONSTRAINT "subgrupo_casa_id_fkey" FOREIGN KEY ("casa_id") REFERENCES "casa"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "subgrupo" ADD CONSTRAINT "subgrupo_criado_por_participacao_id_fkey" FOREIGN KEY ("criado_por_participacao_id") REFERENCES "participacao"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "password_reset" ADD CONSTRAINT "password_reset_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "voto_negociacao" ADD CONSTRAINT "voto_negociacao_negociacao_id_fkey" FOREIGN KEY ("negociacao_id") REFERENCES "negociacao_penalidade"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "voto_negociacao" ADD CONSTRAINT "voto_negociacao_participacao_id_fkey" FOREIGN KEY ("participacao_id") REFERENCES "participacao"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "voto_proposta_regra" ADD CONSTRAINT "voto_proposta_regra_participacao_id_fkey" FOREIGN KEY ("participacao_id") REFERENCES "participacao"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "voto_proposta_regra" ADD CONSTRAINT "voto_proposta_regra_proposta_id_fkey" FOREIGN KEY ("proposta_id") REFERENCES "proposta_regra"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

