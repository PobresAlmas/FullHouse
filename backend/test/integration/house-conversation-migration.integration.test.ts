import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";

type QueryResult = { rows: Array<Record<string, unknown>> };
type PgClient = {
    connect(): Promise<void>;
    end(): Promise<void>;
    query(query: string, values?: unknown[]): Promise<QueryResult>;
};

const require = createRequire(import.meta.url);
const { Client } = require("pg") as {
    Client: new (options: { connectionString: string }) => PgClient;
};
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const migrationSql = await readFile(
    new URL(
        "../../prisma/migrations/20261115000000_unique_house_conversation/migration.sql",
        import.meta.url
    ),
    "utf8"
);

describe.skipIf(!testDatabaseUrl)("house conversation migration", () => {
    let client: PgClient;
    let schemaName: string;

    beforeEach(async () => {
        client = new Client({ connectionString: testDatabaseUrl! });
        await client.connect();
        schemaName = `house_conversation_${randomUUID().replaceAll("-", "")}`;
        await client.query(`CREATE SCHEMA "${schemaName}"`);
        await client.query("SELECT set_config('search_path', $1, false)", [
            `"${schemaName}", public`,
        ]);
        await client.query("CREATE TYPE tipo_conversa_enum AS ENUM ('CASA', 'SUBGRUPO')");
        await client.query(
            "CREATE TABLE conversa (id uuid PRIMARY KEY, casa_id uuid NOT NULL, tipo tipo_conversa_enum NOT NULL)"
        );
        await client.query(
            "CREATE TABLE mensagem (id uuid PRIMARY KEY, conversa_id uuid NOT NULL REFERENCES conversa(id), conteudo text NOT NULL)"
        );
    });

    afterEach(async () => {
        if (!client) return;
        await client.query("ROLLBACK").catch(() => undefined);
        await client.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`).catch(() => undefined);
        await client.end();
    });

    it("allows one CASA conversation per home and keeps subgroup conversations independent", async () => {
        const home = randomUUID();
        await client.query(
            "INSERT INTO conversa (id, casa_id, tipo) VALUES ($1, $2, 'CASA'), ($3, $2, 'SUBGRUPO')",
            [randomUUID(), home, randomUUID()]
        );
        await client.query(migrationSql);

        await expect(
            client.query("INSERT INTO conversa (id, casa_id, tipo) VALUES ($1, $2, 'CASA')", [
                randomUUID(),
                home,
            ])
        ).rejects.toMatchObject({ code: "23505" });
        await client.query("INSERT INTO conversa (id, casa_id, tipo) VALUES ($1, $2, 'SUBGRUPO')", [
            randomUUID(),
            home,
        ]);
    });

    it("fails on duplicate house conversations without deleting either history", async () => {
        const home = randomUUID();
        const firstConversation = randomUUID();
        const secondConversation = randomUUID();
        const messageIds = [randomUUID(), randomUUID()];
        await client.query(
            "INSERT INTO conversa (id, casa_id, tipo) VALUES ($1, $3, 'CASA'), ($2, $3, 'CASA')",
            [firstConversation, secondConversation, home]
        );
        await client.query(
            "INSERT INTO mensagem (id, conversa_id, conteudo) VALUES ($1, $3, 'a'), ($2, $4, 'b')",
            [messageIds[0], messageIds[1], firstConversation, secondConversation]
        );

        await expect(client.query(migrationSql)).rejects.toThrow(/duplicatas/i);
        await client.query("ROLLBACK");

        const preserved = await client.query(
            "SELECT id FROM mensagem WHERE id = ANY($1::uuid[]) ORDER BY id",
            [messageIds]
        );
        expect(preserved.rows).toHaveLength(2);
        const index = await client.query("SELECT to_regclass($1) AS index_name", [
            `${schemaName}.uq_conversa_casa_tipo_casa`,
        ]);
        expect(index.rows[0].index_name).toBeNull();
    });
});
