/* global process, console */

import bcrypt from "bcrypt";
import { randomBytes, randomUUID } from "node:crypto";
import pg from "pg";
import { assertLocalSeedDatabase } from "./seed-safety.mjs";

if (process.env.NODE_ENV === "production") {
    throw new Error("A carga de demonstração não pode ser executada em produção.");
}
if (process.env.SEED_DEMO_DATA !== "1") {
    throw new Error("Defina SEED_DEMO_DATA=1 para confirmar a carga de dados de teste.");
}
if (!process.env.DATABASE_URL) throw new Error("Defina DATABASE_URL antes de executar a carga.");
assertLocalSeedDatabase(process.env.DATABASE_URL);
if (!process.env.DEMO_USER_PASSWORD || process.env.DEMO_USER_PASSWORD.length < 8) {
    throw new Error("Defina DEMO_USER_PASSWORD com pelo menos 8 caracteres.");
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const demoPassword = process.env.DEMO_USER_PASSWORD;
const codes = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

async function makePersonalCode(db) {
    for (let attempt = 0; attempt < 10; attempt += 1) {
        const bytes = randomBytes(6);
        const code = [...bytes].map((byte) => codes[byte % codes.length]).join("");
        const result = await db.query('SELECT 1 FROM "usuario" WHERE codigo_pessoal = $1', [code]);
        if (result.rowCount === 0) return code;
    }
    throw new Error("Não foi possível gerar código pessoal disponível.");
}

async function getOrCreateUser(db, { email, name, nickname }) {
    const existing = await db.query('SELECT id FROM "usuario" WHERE email = $1', [email]);
    if (existing.rowCount) return existing.rows[0];
    const id = randomUUID();
    await db.query(
        'INSERT INTO "usuario" (id, codigo_pessoal, nome, apelido, email, senha_hash) VALUES ($1, $2, $3, $4, $5, $6)',
        [id, await makePersonalCode(db), name, nickname, email, await bcrypt.hash(demoPassword, 12)]
    );
    return { id };
}

async function ensureMembership(db, houseId, userId, role) {
    const result = await db.query(
        'SELECT id, data_saida, papel FROM "participacao" WHERE casa_id = $1 AND usuario_id = $2 LIMIT 1',
        [houseId, userId]
    );
    const existing = result.rows[0];
    if (existing) {
        if (existing.data_saida || existing.papel !== role) {
            throw new Error(
                `O vínculo de teste existente está inativo ou tem papel diferente (${existing.id}). Não alterei esse vínculo.`
            );
        }
        return { id: existing.id };
    }
    const id = randomUUID();
    await db.query(
        'INSERT INTO "participacao" (id, casa_id, usuario_id, papel) VALUES ($1, $2, $3, $4)',
        [id, houseId, userId, role]
    );
    return { id };
}

function normalizeCategoryName(name) {
    return name
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}

async function ensurePantryCategory(db, houseId, name) {
    const normalizedName = normalizeCategoryName(name);
    const existing = await db.query(
        'SELECT id FROM "categoria_despensa" WHERE casa_id = $1 AND nome_normalizado = $2 LIMIT 1',
        [houseId, normalizedName]
    );
    if (existing.rowCount) return existing.rows[0].id;

    const id = randomUUID();
    await db.query(
        'INSERT INTO "categoria_despensa" (id, casa_id, nome, nome_normalizado, atualizado_em) VALUES ($1, $2, $3, $4, NOW())',
        [id, houseId, name, normalizedName]
    );
    return id;
}

function currentFortalezaMonth() {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Fortaleza",
        year: "numeric",
        month: "2-digit",
    }).formatToParts(new Date());
    const get = (type) => parts.find((part) => part.type === type)?.value ?? "";
    return { year: Number(get("year")), month: Number(get("month")) };
}

function monthAtOffset(offset) {
    const { year, month } = currentFortalezaMonth();
    const date = new Date(Date.UTC(year, month - 1 + offset, 1));
    return date.toISOString().slice(0, 7);
}

function paymentTimestamp(date) {
    return new Date(`${date}T18:00:00-03:00`);
}

async function ensureInsightsSubgroup(db, houseId, creatorParticipationId, memberIds) {
    const name = "DEMO INSIGHTS — Mercado compartilhado";
    const existing = await db.query(
        'SELECT id FROM "subgrupo" WHERE casa_id = $1 AND nome = $2 AND excluido_em IS NULL LIMIT 1',
        [houseId, name]
    );
    const subgroupId = existing.rows[0]?.id ?? randomUUID();
    if (!existing.rowCount) {
        await db.query(
            'INSERT INTO "subgrupo" (id, casa_id, nome, criado_por_participacao_id) VALUES ($1, $2, $3, $4)',
            [subgroupId, houseId, name, creatorParticipationId]
        );
    }
    for (const participationId of memberIds) {
        const currentMembership = await db.query(
            'SELECT 1 FROM "membro_subgrupo" WHERE subgrupo_id = $1 AND participacao_id = $2',
            [subgroupId, participationId]
        );
        if (currentMembership.rowCount) continue;
        await db.query(
            'INSERT INTO "membro_subgrupo" (subgrupo_id, participacao_id) VALUES ($1, $2)',
            [subgroupId, participationId]
        );
    }
    return subgroupId;
}

async function insertInsightsExpense(db, houseId, creatorUserId, expense) {
    const existing = await db.query(
        "SELECT id FROM \"despesa\" WHERE casa_id = $1 AND escopo = 'CASA' AND descricao = $2 LIMIT 1",
        [houseId, expense.description]
    );
    if (existing.rowCount) return false;

    const id = randomUUID();
    const paidAt = paymentTimestamp(expense.dueDate);
    await db.query(
        `INSERT INTO "despesa"
            (id, escopo, casa_id, criado_por_usuario_id, subgrupo_id, descricao,
             valor_total, tipo, estrategia_rateio, data_vencimento,
             pago_por_participacao_id, status, quitada_em)
         VALUES ($1, 'CASA', $2, $3, $4, $5, $6, 'VARIAVEL', $7, $8, $9, $10, $11)`,
        [
            id,
            houseId,
            creatorUserId,
            expense.subgroupId ?? null,
            expense.description,
            expense.amount,
            expense.strategy,
            expense.dueDate,
            expense.paidByParticipationId ?? null,
            expense.paidByParticipationId ? "QUITADA" : "ABERTA",
            expense.paidByParticipationId ? paidAt : null,
        ]
    );

    for (const allocation of expense.allocations ?? []) {
        await db.query(
            `INSERT INTO "rateio_despesa"
                (id, despesa_id, participacao_id, valor_devido, pago, pago_em)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
                randomUUID(),
                id,
                allocation.participationId,
                allocation.amount,
                allocation.paid,
                allocation.paid ? paidAt : null,
            ]
        );
    }
    return true;
}

async function seedInsightsExpenses(db, { houseId, creatorUserId, members }) {
    const subgroupId = await ensureInsightsSubgroup(
        db,
        houseId,
        members[0].id,
        members.slice(1).map((member) => member.id)
    );
    let inserted = 0;

    for (let ageIndex = 0; ageIndex < 6; ageIndex += 1) {
        const month = monthAtOffset(ageIndex - 5);
        const energyDate = `${month}-05`;
        const internetDate = `${month}-12`;
        const marketDate = `${month}-20`;
        const energyPayer = members[ageIndex % members.length];
        const internetPayer = members[(ageIndex + 1) % members.length];
        const marketPayer = members[(ageIndex + 2) % members.length];

        const expenses = [
            {
                description: `DEMO INSIGHTS — Energia — ${month}`,
                amount: "210.00",
                strategy: "IGUALITARIO",
                dueDate: energyDate,
                paidByParticipationId: energyPayer.id,
                allocations: members.map((member, index) => ({
                    participationId: member.id,
                    amount: "70.00",
                    paid:
                        index === 0 ||
                        (index === 1 && ageIndex < 4) ||
                        (index === 2 && ageIndex < 2),
                })),
            },
            {
                description: `DEMO INSIGHTS — Internet — ${month}`,
                amount: "90.00",
                strategy: "IGUALITARIO",
                dueDate: internetDate,
                paidByParticipationId: ageIndex % 2 === 0 ? internetPayer.id : null,
                allocations: members.map((member, index) => ({
                    participationId: member.id,
                    amount: "30.00",
                    paid:
                        (index === 0 && ageIndex < 5) ||
                        (index === 1 && ageIndex % 2 === 0) ||
                        (index === 2 && ageIndex < 3),
                })),
            },
            {
                description: `DEMO INSIGHTS — Mercado do subgrupo — ${month}`,
                amount: "150.00",
                strategy: "PERSONALIZADO",
                subgroupId,
                dueDate: marketDate,
                paidByParticipationId: ageIndex % 3 === 0 ? marketPayer.id : null,
                allocations: [
                    { participationId: members[1].id, amount: "90.00", paid: ageIndex < 5 },
                    { participationId: members[2].id, amount: "60.00", paid: ageIndex < 2 },
                ],
            },
        ];

        for (const expense of expenses) {
            if (await insertInsightsExpense(db, houseId, creatorUserId, expense)) inserted += 1;
        }
    }

    const legacyMonth = monthAtOffset(-5);
    const legacyExpense = {
        description: `DEMO INSIGHTS — Despesa antiga sem rateio — ${legacyMonth}`,
        amount: "45.00",
        strategy: "IGUALITARIO",
        dueDate: `${legacyMonth}-25`,
        allocations: [],
    };
    if (await insertInsightsExpense(db, houseId, creatorUserId, legacyExpense)) inserted += 1;

    return { subgroupId, inserted };
}

async function seedOtherModules(db, { houseId, members }) {
    const [creator, ana, bruno] = members;
    let inserted = 0;

    const petName = "DEMO — Luna";
    const existingPet = await db.query(
        'SELECT id FROM "pet" WHERE casa_id = $1 AND nome = $2 LIMIT 1',
        [houseId, petName]
    );
    const petId = existingPet.rows[0]?.id ?? randomUUID();
    if (!existingPet.rowCount) {
        await db.query(
            'INSERT INTO "pet" (id, casa_id, nome, especie, raca, criado_por_participacao_id) VALUES ($1, $2, $3, $4, $5, $6)',
            [petId, houseId, petName, "Cachorro", "Vira-lata", creator.id]
        );
        inserted += 1;
    }

    const careTitle = "DEMO — Consulta veterinária";
    const existingCare = await db.query(
        'SELECT id FROM "cuidado_pet" WHERE pet_id = $1 AND titulo = $2 LIMIT 1',
        [petId, careTitle]
    );
    if (!existingCare.rowCount) {
        await db.query(
            `INSERT INTO "cuidado_pet"
                (id, pet_id, tipo, titulo, descricao, data_cuidado, valor,
                 pago_por_participacao_id, proxima_ocorrencia, registrado_por_participacao_id)
             VALUES ($1, $2, 'VET_VISIT', $3, $4, $5, $6, $7, $8, $9)`,
            [
                randomUUID(),
                petId,
                careTitle,
                "Consulta preventiva de demonstração.",
                `${monthAtOffset(0)}-10`,
                "85.00",
                ana.id,
                `${monthAtOffset(1)}-10`,
                creator.id,
            ]
        );
        inserted += 1;
    }

    const shoppingItems = [
        {
            name: "DEMO — Café para a casa",
            quantity: "1.000",
            unit: "KG",
            status: "PENDENTE",
            boughtBy: null,
        },
        {
            name: "DEMO — Detergente comprado",
            quantity: "2.000",
            unit: "UNIDADE",
            status: "COMPRADO",
            boughtBy: bruno.id,
        },
    ];
    for (const item of shoppingItems) {
        const existing = await db.query(
            'SELECT id FROM "item_lista_compras" WHERE casa_id = $1 AND nome = $2 LIMIT 1',
            [houseId, item.name]
        );
        if (existing.rowCount) continue;
        await db.query(
            `INSERT INTO "item_lista_compras"
                (id, casa_id, nome, quantidade, unidade, observacao, status,
                 criado_por_participacao_id, atualizado_em,
                 comprado_por_participacao_id, comprado_em)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10)`,
            [
                randomUUID(),
                houseId,
                item.name,
                item.quantity,
                item.unit,
                "Registro local de demonstração.",
                item.status,
                creator.id,
                item.boughtBy,
                item.boughtBy ? new Date() : null,
            ]
        );
        inserted += 1;
    }

    const ruleTitle = "DEMO — Horário de silêncio";
    const existingRule = await db.query(
        'SELECT id FROM "regra_convivencia" WHERE casa_id = $1 AND titulo = $2 LIMIT 1',
        [houseId, ruleTitle]
    );
    if (!existingRule.rowCount) {
        await db.query(
            `INSERT INTO "regra_convivencia"
                (id, casa_id, titulo, descricao, escopo, status, criada_por_participacao_id)
             VALUES ($1, $2, $3, $4, 'CASA', 'VIGENTE', $5)`,
            [
                randomUUID(),
                houseId,
                ruleTitle,
                "Manter o volume baixo nas áreas comuns depois das 22h.",
                creator.id,
            ]
        );
        inserted += 1;
    }

    const meetingTitle = "DEMO — Reunião de organização da casa";
    const existingMeeting = await db.query(
        'SELECT id FROM "reuniao" WHERE casa_id = $1 AND titulo = $2 LIMIT 1',
        [houseId, meetingTitle]
    );
    const meetingId = existingMeeting.rows[0]?.id ?? randomUUID();
    if (!existingMeeting.rowCount) {
        await db.query(
            `INSERT INTO "reuniao"
                (id, casa_id, titulo, pauta, data_hora, status, criada_por_participacao_id)
             VALUES ($1, $2, $3, $4, $5, 'AGENDADA', $6)`,
            [
                meetingId,
                houseId,
                meetingTitle,
                "Revisar despesas, compras e tarefas da próxima semana.",
                new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                creator.id,
            ]
        );
        inserted += 1;
    }
    for (const member of members) {
        const existing = await db.query(
            'SELECT 1 FROM "participante_reuniao" WHERE reuniao_id = $1 AND participacao_id = $2',
            [meetingId, member.id]
        );
        if (existing.rowCount) continue;
        await db.query(
            `INSERT INTO "participante_reuniao" (reuniao_id, participacao_id, situacao, respondido_em)
             VALUES ($1, $2, $3, $4)`,
            [
                meetingId,
                member.id,
                member.id === creator.id ? "CONFIRMADO" : "PENDENTE",
                member.id === creator.id ? new Date() : null,
            ]
        );
    }

    const existingConversation = await db.query(
        "SELECT id FROM \"conversa\" WHERE casa_id = $1 AND tipo = 'CASA' LIMIT 1",
        [houseId]
    );
    const conversationId = existingConversation.rows[0]?.id ?? randomUUID();
    if (!existingConversation.rowCount) {
        await db.query(
            "INSERT INTO \"conversa\" (id, casa_id, tipo, titulo) VALUES ($1, $2, 'CASA', $3)",
            [conversationId, houseId, "Casa de demonstração"]
        );
        inserted += 1;
    }
    const messages = [
        { participationId: creator.id, content: "DEMO — Bem-vindos à Casa de demonstração!" },
        { participationId: ana.id, content: "DEMO — Vou revisar a lista de compras." },
    ];
    for (const message of messages) {
        const existing = await db.query(
            'SELECT id FROM "mensagem" WHERE conversa_id = $1 AND conteudo = $2 LIMIT 1',
            [conversationId, message.content]
        );
        if (existing.rowCount) continue;
        await db.query(
            'INSERT INTO "mensagem" (id, conversa_id, autor_participacao_id, conteudo) VALUES ($1, $2, $3, $4)',
            [randomUUID(), conversationId, message.participationId, message.content]
        );
        inserted += 1;
    }

    return { inserted };
}

const client = await pool.connect();
try {
    await client.query("BEGIN");
    const emilson = await getOrCreateUser(client, {
        email: "demo@example.com",
        name: "Emilson Silva",
        nickname: "Emilson",
    });
    const ana = await getOrCreateUser(client, {
        email: "ana@example.com",
        name: "Ana Souza",
        nickname: "Ana",
    });
    const bruno = await getOrCreateUser(client, {
        email: "bruno@example.com",
        name: "Bruno Lima",
        nickname: "Bruno",
    });

    const membershipResult = await client.query(
        'SELECT p.casa_id FROM "participacao" p JOIN "casa" c ON c.id = p.casa_id WHERE p.usuario_id = $1 AND p.data_saida IS NULL AND c.nome = $2 LIMIT 1',
        [emilson.id, "Casa de demonstração"]
    );
    const emilsonMembership = membershipResult.rows[0];
    let houseId = emilsonMembership?.casa_id;
    if (!houseId) {
        const houseResult = await client.query(
            'SELECT id FROM "casa" WHERE nome = $1 AND criada_por_usuario_id = $2 AND excluido_em IS NULL LIMIT 1',
            ["Casa de demonstração", emilson.id]
        );
        houseId = houseResult.rows[0]?.id ?? randomUUID();
        if (!houseResult.rowCount) {
            await client.query(
                'INSERT INTO "casa" (id, nome, cidade, bairro, criada_por_usuario_id) VALUES ($1, $2, $3, $4, $5)',
                [houseId, "Casa de demonstração", "Fortaleza", "Grifinória", emilson.id]
            );
        }
    }

    const emilsonMember = await ensureMembership(client, houseId, emilson.id, "LIDER");
    const anaMember = await ensureMembership(client, houseId, ana.id, "MORADOR");
    const brunoMember = await ensureMembership(client, houseId, bruno.id, "MORADOR");

    const insightsSeed = await seedInsightsExpenses(client, {
        houseId,
        creatorUserId: emilson.id,
        members: [emilsonMember, anaMember, brunoMember],
    });
    const otherModuleSeed = await seedOtherModules(client, {
        houseId,
        members: [emilsonMember, anaMember, brunoMember],
    });

    const items = [
        {
            name: "Arroz",
            category: "Grãos",
            property: "COMUNITARIO",
            owner: null,
            unit: "KG",
            quantity: 2,
        },
        {
            name: "Feijão",
            category: "Grãos",
            property: "COMUNITARIO",
            owner: null,
            unit: "KG",
            quantity: 1,
        },
        {
            name: "Leite",
            category: "Laticínios",
            property: "DONO_ESPECIFICO",
            owner: emilsonMember.id,
            unit: "UNIDADE",
            quantity: 1,
        },
        {
            name: "Café",
            category: "Bebidas",
            property: "COMUNITARIO",
            owner: null,
            unit: "G",
            quantity: 500,
        },
        {
            name: "Macarrão",
            category: "Massas",
            property: "COMUNITARIO",
            owner: null,
            unit: "UNIDADE",
            quantity: 3,
        },
        {
            name: "Chocolate",
            category: "Doces",
            property: "DONO_ESPECIFICO",
            owner: anaMember.id,
            unit: "UNIDADE",
            quantity: 2,
        },
        {
            name: "Detergente",
            category: "Limpeza",
            property: "COMUNITARIO",
            owner: null,
            unit: "UNIDADE",
            quantity: 1,
        },
        {
            name: "Papel higiênico",
            category: "Higiene",
            property: "COMUNITARIO",
            owner: null,
            unit: "UNIDADE",
            quantity: 4,
        },
        {
            name: "Shampoo",
            category: "Higiene",
            property: "COMUNITARIO",
            owner: null,
            unit: "UNIDADE",
            quantity: 4,
        },
        {
            name: "Biscoito do Emilson",
            category: "Doces",
            property: "PRIVADO",
            owner: emilsonMember.id,
            unit: "PACOTE",
            quantity: 1,
        },
    ];

    for (const itemData of items) {
        const existing = await client.query(
            'SELECT 1 FROM "item_despensa" WHERE casa_id = $1 AND nome = $2 LIMIT 1',
            [houseId, itemData.name]
        );
        if (existing.rowCount) continue;
        const categoryId = await ensurePantryCategory(client, houseId, itemData.category);
        const itemId = randomUUID();
        await client.query(
            'INSERT INTO "item_despensa" (id, casa_id, nome, categoria, categoria_id, propriedade, dono_participacao_id, unidade, criado_por_participacao_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
            [
                itemId,
                houseId,
                itemData.name,
                itemData.category,
                categoryId,
                itemData.property,
                itemData.owner,
                itemData.unit,
                emilsonMember.id,
            ]
        );
        await client.query(
            'INSERT INTO "movimentacao_despensa" (id, item_despensa_id, tipo, quantidade, participacao_id) VALUES ($1, $2, $3, $4, $5)',
            [randomUUID(), itemId, "ENTRADA", itemData.quantity, emilsonMember.id]
        );
    }

    await client.query("COMMIT");
    console.log(
        `Casa de demonstração pronta com Emilson, Ana e Bruno; ${insightsSeed.inserted} despesas de Insights e ${otherModuleSeed.inserted} registros de outros módulos foram adicionados.`
    );
    console.log("Usuários de teste novos usam o valor de DEMO_USER_PASSWORD.");
} catch (error) {
    await client.query("ROLLBACK");
    throw error;
} finally {
    client.release();
    await pool.end();
}
