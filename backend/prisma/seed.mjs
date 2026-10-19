/* global process, console */

import bcrypt from "bcrypt";
import { randomBytes, randomUUID } from "node:crypto";
import pg from "pg";

if (process.env.NODE_ENV === "production") {
    throw new Error("A carga de demonstração não pode ser executada em produção.");
}
if (process.env.SEED_DEMO_DATA !== "1") {
    throw new Error("Defina SEED_DEMO_DATA=1 para confirmar a carga de dados de teste.");
}
if (!process.env.DATABASE_URL) throw new Error("Defina DATABASE_URL antes de executar a carga.");
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
            await db.query(
                'UPDATE "participacao" SET data_saida = NULL, papel = $2 WHERE id = $1',
                [existing.id, role]
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
    await ensureMembership(client, houseId, bruno.id, "MORADOR");

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
        const itemId = randomUUID();
        await client.query(
            'INSERT INTO "item_despensa" (id, casa_id, nome, categoria, propriedade, dono_participacao_id, unidade, criado_por_participacao_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [
                itemId,
                houseId,
                itemData.name,
                itemData.category,
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
    console.log("Casa de demonstração pronta com Emilson, Ana e Bruno e itens de despensa.");
    console.log("Usuários de teste novos usam o valor de DEMO_USER_PASSWORD.");
} catch (error) {
    await client.query("ROLLBACK");
    throw error;
} finally {
    client.release();
    await pool.end();
}
