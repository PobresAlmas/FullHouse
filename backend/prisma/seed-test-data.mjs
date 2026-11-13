/* global process, console */

import pg from "pg";

if (process.env.NODE_ENV === "production") {
    throw new Error("A carga de teste não pode ser executada em produção.");
}
if (process.env.SEED_TEST_DATA !== "1") {
    throw new Error("Defina SEED_TEST_DATA=1 para confirmar a carga de teste.");
}
if (!process.env.DATABASE_URL) throw new Error("Defina DATABASE_URL no arquivo .env.");
if (!process.env.DEMO_USER_PASSWORD || process.env.DEMO_USER_PASSWORD.length < 8) {
    throw new Error("Defina DEMO_USER_PASSWORD com pelo menos 8 caracteres no arquivo .env.");
}
if (!process.env.HOME_TEST_MEMBER_PASSWORD || process.env.HOME_TEST_MEMBER_PASSWORD.length < 8) {
    throw new Error(
        "Defina HOME_TEST_MEMBER_PASSWORD com pelo menos 8 caracteres no arquivo .env."
    );
}

const ownerEmail = process.env.HOME_TEST_OWNER_EMAIL || "demo@example.com";
const memberEmail = process.env.HOME_TEST_MEMBER_EMAIL || "morador.teste@example.com";
if (ownerEmail.toLowerCase() === memberEmail.toLowerCase()) {
    throw new Error("A conta do morador de teste precisa ter um e-mail diferente.");
}

process.env.SEED_DEMO_DATA = "1";
await import("./seed.mjs");

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
    const result = await pool.query(
        `SELECT c.id
         FROM "casa" c
         JOIN "participacao" p ON p.casa_id = c.id
         JOIN "usuario" u ON u.id = p.usuario_id
         WHERE lower(u.email::text) = lower($1)
           AND c.nome = 'Casa de demonstração'
           AND c.status = 'ATIVA'
           AND c.excluido_em IS NULL
           AND p.data_saida IS NULL
         ORDER BY c.id
         LIMIT 1`,
        [ownerEmail]
    );
    if (!result.rowCount) {
        throw new Error(`Não encontrei a Casa de demonstração ativa de ${ownerEmail}.`);
    }
    process.env.HOME_TEST_RESIDENCE_ID = result.rows[0].id;
} finally {
    await pool.end();
}

process.env.HOME_TEST_SEED = "1";
process.env.HOME_TEST_OWNER_EMAIL = ownerEmail;
process.env.HOME_TEST_MEMBER_EMAIL = memberEmail;
await import("./seed-two-person-home-test.mjs");

console.log("Carga de teste concluída. Nenhum dado foi apagado.");
