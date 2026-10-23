/* global process, console */

import bcrypt from "bcrypt";
import { randomBytes, randomUUID } from "node:crypto";
import pg from "pg";

const {
    DATABASE_URL,
    NODE_ENV,
    HOME_TEST_SEED,
    HOME_TEST_OWNER_EMAIL,
    HOME_TEST_RESIDENCE_ID,
    HOME_TEST_MEMBER_EMAIL,
    HOME_TEST_MEMBER_PASSWORD,
} = process.env;

if (NODE_ENV === "production") {
    throw new Error("A carga de teste não pode ser executada em produção.");
}
if (HOME_TEST_SEED !== "1") {
    throw new Error("Defina HOME_TEST_SEED=1 para confirmar a carga de teste.");
}
if (!DATABASE_URL) throw new Error("Defina DATABASE_URL antes de executar a carga.");
if (!HOME_TEST_OWNER_EMAIL || !HOME_TEST_MEMBER_EMAIL) {
    throw new Error("Defina HOME_TEST_OWNER_EMAIL e HOME_TEST_MEMBER_EMAIL.");
}
if (!HOME_TEST_MEMBER_PASSWORD || HOME_TEST_MEMBER_PASSWORD.length < 8) {
    throw new Error("Defina HOME_TEST_MEMBER_PASSWORD com pelo menos 8 caracteres.");
}
if (HOME_TEST_OWNER_EMAIL.toLowerCase() === HOME_TEST_MEMBER_EMAIL.toLowerCase()) {
    throw new Error("A conta de teste precisa ter um e-mail diferente do morador atual.");
}

const testMemberName = "Morador de teste FullHouse";
const testTaskPrefix = "TESTE FULLHOUSE:";
const pool = new pg.Pool({ connectionString: DATABASE_URL });
const codeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

async function makePersonalCode(db) {
    for (let attempt = 0; attempt < 10; attempt += 1) {
        const code = [...randomBytes(6)]
            .map((byte) => codeAlphabet[byte % codeAlphabet.length])
            .join("");
        const result = await db.query('SELECT 1 FROM "usuario" WHERE codigo_pessoal = $1', [code]);
        if (result.rowCount === 0) return code;
    }
    throw new Error("Não foi possível gerar um código pessoal disponível.");
}

function fortalezaDate(offsetDays = 0) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Fortaleza",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    const date = new Date(
        Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day) + offsetDays)
    );
    return date.toISOString().slice(0, 10);
}

function deadlineAt(date) {
    return `${date}T18:00:00-03:00`;
}

async function findResidence(db, ownerEmail) {
    const result = await db.query(
        `SELECT c.id, c.nome
         FROM "casa" c
         JOIN "participacao" p ON p.casa_id = c.id
         JOIN "usuario" u ON u.id = p.usuario_id
         WHERE lower(u.email::text) = lower($1)
           AND p.data_saida IS NULL
           AND c.status = 'ATIVA'
           AND c.excluido_em IS NULL
           AND ($2::uuid IS NULL OR c.id = $2::uuid)
         ORDER BY c.nome`,
        [ownerEmail, HOME_TEST_RESIDENCE_ID || null]
    );
    if (result.rowCount !== 1) {
        throw new Error(
            result.rowCount === 0
                ? "Não encontrei uma residência ativa desse morador com os dados informados."
                : "Esse morador participa de mais de uma residência ativa. Defina HOME_TEST_RESIDENCE_ID."
        );
    }
    return result.rows[0];
}

async function getOrCreateTestMember(db) {
    const existing = await db.query(
        'SELECT id, nome FROM "usuario" WHERE lower(email::text) = lower($1)',
        [HOME_TEST_MEMBER_EMAIL]
    );
    if (existing.rowCount) {
        if (existing.rows[0].nome !== testMemberName) {
            throw new Error(
                "Esse e-mail já pertence a outra conta. Use um e-mail de teste exclusivo."
            );
        }
        return { id: existing.rows[0].id, created: false };
    }

    const userId = randomUUID();
    await db.query(
        `INSERT INTO "usuario"
            (id, codigo_pessoal, nome, apelido, email, senha_hash, status_moradia)
         VALUES ($1, $2, $3, $4, $5, $6, 'MORANDO')`,
        [
            userId,
            await makePersonalCode(db),
            testMemberName,
            "Morador teste",
            HOME_TEST_MEMBER_EMAIL,
            await bcrypt.hash(HOME_TEST_MEMBER_PASSWORD, 12),
        ]
    );
    return { id: userId, created: true };
}

async function ensureMembership(db, residenceId, userId) {
    const memberships = await db.query(
        `SELECT id, data_saida
         FROM "participacao"
         WHERE casa_id = $1 AND usuario_id = $2
         ORDER BY data_saida NULLS FIRST`,
        [residenceId, userId]
    );
    const activeMembership = memberships.rows.find((membership) => membership.data_saida === null);
    if (activeMembership) return activeMembership.id;
    if (memberships.rowCount) {
        throw new Error(
            "A conta de teste já teve vínculo com essa residência, mas está inativo. Não reativei esse vínculo automaticamente."
        );
    }

    const membershipId = randomUUID();
    await db.query(
        `INSERT INTO "participacao" (id, casa_id, usuario_id, papel)
         VALUES ($1, $2, $3, 'MORADOR')`,
        [membershipId, residenceId, userId]
    );
    return membershipId;
}

async function ensureTaskDefinition(db, definition) {
    const existing = await db.query(
        `SELECT id
         FROM "definicao_tarefa"
         WHERE escopo = $1
           AND titulo = $2
           AND casa_id IS NOT DISTINCT FROM $3::uuid
           AND usuario_id IS NOT DISTINCT FROM $4::uuid
         LIMIT 1`,
        [
            definition.scope,
            definition.title,
            definition.residenceId ?? null,
            definition.userId ?? null,
        ]
    );
    if (existing.rowCount) return existing.rows[0].id;

    const id = randomUUID();
    await db.query(
        `INSERT INTO "definicao_tarefa"
            (id, escopo, casa_id, usuario_id, titulo, periodicidade,
             regra_recorrencia, tipo_atribuicao, responsavel_fixo_participacao_id,
             data_inicio, data_fim)
         VALUES ($1, $2, $3, $4, $5, 'PERSONALIZADA',
                 '{"repeats": false}'::jsonb, 'FIXA', $6, $7, $7)`,
        [
            id,
            definition.scope,
            definition.residenceId ?? null,
            definition.userId ?? null,
            definition.title,
            definition.assigneeMembershipId ?? null,
            definition.dueDate,
        ]
    );
    return id;
}

async function ensureTaskInstance(db, task) {
    const definitionId = await ensureTaskDefinition(db, task);
    const existing = await db.query(
        `SELECT id
         FROM "instancia_tarefa"
         WHERE definicao_tarefa_id = $1 AND data_prevista = $2::date
         LIMIT 1`,
        [definitionId, task.dueDate]
    );
    if (existing.rowCount) return;

    await db.query(
        `INSERT INTO "instancia_tarefa"
            (id, definicao_tarefa_id, data_prevista, prazo_limite,
             responsavel_participacao_id, responsavel_usuario_id,
             status, concluida_em, concluida_por_participacao_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
            randomUUID(),
            definitionId,
            task.dueDate,
            deadlineAt(task.dueDate),
            task.assigneeMembershipId ?? null,
            task.assigneeUserId ?? null,
            task.status ?? "PENDENTE",
            task.completedAt ?? null,
            task.completedByMembershipId ?? null,
        ]
    );
}

async function ensureExpense(db, expense) {
    const existing = await db.query(
        `SELECT id FROM "despesa"
         WHERE descricao = $1
           AND escopo = $2
           AND casa_id IS NOT DISTINCT FROM $3::uuid
           AND usuario_id IS NOT DISTINCT FROM $4::uuid
         LIMIT 1`,
        [expense.description, expense.scope, expense.residenceId ?? null, expense.userId ?? null]
    );
    if (existing.rowCount) return;

    await db.query(
        `INSERT INTO "despesa"
            (id, escopo, casa_id, usuario_id, descricao, valor_total, tipo,
             estrategia_rateio, data_vencimento, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'VARIAVEL',
                 'IGUALITARIO', $7, 'ABERTA')`,
        [
            randomUUID(),
            expense.scope,
            expense.residenceId ?? null,
            expense.userId ?? null,
            expense.description,
            expense.amount,
            expense.dueDate,
        ]
    );
}

const client = await pool.connect();
try {
    await client.query("BEGIN");
    const residence = await findResidence(client, HOME_TEST_OWNER_EMAIL);
    const ownerResult = await client.query(
        `SELECT u.id AS user_id, p.id AS membership_id
         FROM "usuario" u
         JOIN "participacao" p ON p.usuario_id = u.id
         WHERE lower(u.email::text) = lower($1)
           AND p.casa_id = $2
           AND p.data_saida IS NULL`,
        [HOME_TEST_OWNER_EMAIL, residence.id]
    );
    const owner = ownerResult.rows[0];
    if (!owner) throw new Error("A conta principal não é moradora ativa dessa residência.");

    const member = await getOrCreateTestMember(client);
    const memberMembershipId = await ensureMembership(client, residence.id, member.id);
    const yesterday = fortalezaDate(-1);
    const today = fortalezaDate();
    const tomorrow = fortalezaDate(1);
    const inThreeDays = fortalezaDate(3);
    const tasks = [
        {
            scope: "CASA",
            residenceId: residence.id,
            title: `${testTaskPrefix} Casa atrasada - responsável teste`,
            dueDate: yesterday,
            assigneeMembershipId: memberMembershipId,
        },
        {
            scope: "CASA",
            residenceId: residence.id,
            title: `${testTaskPrefix} Casa para hoje - responsável principal`,
            dueDate: today,
            assigneeMembershipId: owner.membership_id,
        },
        {
            scope: "CASA",
            residenceId: residence.id,
            title: `${testTaskPrefix} Casa concluída nesta semana`,
            dueDate: today,
            assigneeMembershipId: owner.membership_id,
            status: "CONCLUIDA",
            completedAt: new Date(),
            completedByMembershipId: owner.membership_id,
        },
        {
            scope: "INDIVIDUAL",
            userId: owner.user_id,
            title: `${testTaskPrefix} Pessoal para hoje - principal`,
            dueDate: today,
            assigneeUserId: owner.user_id,
        },
        {
            scope: "INDIVIDUAL",
            userId: member.id,
            title: `${testTaskPrefix} Pessoal para hoje - teste`,
            dueDate: today,
            assigneeUserId: member.id,
        },
    ];
    for (const task of tasks) await ensureTaskInstance(client, task);

    const expenses = [
        {
            scope: "CASA",
            residenceId: residence.id,
            description: `${testTaskPrefix} Conta compartilhada`,
            amount: "89.90",
            dueDate: tomorrow,
        },
        {
            scope: "INDIVIDUAL",
            userId: owner.user_id,
            description: `${testTaskPrefix} Conta pessoal principal`,
            amount: "29.90",
            dueDate: inThreeDays,
        },
        {
            scope: "INDIVIDUAL",
            userId: member.id,
            description: `${testTaskPrefix} Conta pessoal teste`,
            amount: "19.90",
            dueDate: inThreeDays,
        },
    ];
    for (const expense of expenses) await ensureExpense(client, expense);

    await client.query("COMMIT");
    console.log(`Residência selecionada: ${residence.nome} (${residence.id})`);
    console.log(
        `Morador de teste: ${HOME_TEST_MEMBER_EMAIL} (${member.created ? "conta criada" : "conta existente"})`
    );
    console.log(`Tarefas e despesas de teste criadas ou preservadas para ${today}.`);
    console.log(
        "Use a senha definida em HOME_TEST_MEMBER_PASSWORD para entrar com a conta de teste."
    );
} catch (error) {
    await client.query("ROLLBACK");
    throw error;
} finally {
    client.release();
    await pool.end();
}
