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
const lockoutMigrationSql = await readFile(
    new URL(
        "../../prisma/migrations/20261115100000_add_login_lockout/migration.sql",
        import.meta.url
    ),
    "utf8"
);

describe.skipIf(!testDatabaseUrl)("Account login lockout PostgreSQL migration", () => {
    let client: PgClient;
    let schemaName: string;

    beforeEach(async () => {
        client = new Client({ connectionString: testDatabaseUrl! });
        await client.connect();
        await client.query("BEGIN");
        schemaName = `login_lockout_${randomUUID().replaceAll("-", "")}`;
        await client.query(`CREATE SCHEMA "${schemaName}"`);
        await client.query("SELECT set_config('search_path', $1, true)", [
            `"${schemaName}", public`,
        ]);
        await client.query('CREATE TABLE "usuario" ("id" UUID PRIMARY KEY)');
    });

    afterEach(async () => {
        if (!client) return;
        await client.query("ROLLBACK").catch(() => undefined);
        await client.end();
    });

    it("adds a zeroed counter, optional lock date, and non-negative counter constraint", async () => {
        await client.query(lockoutMigrationSql);
        await client.query("INSERT INTO usuario (id) VALUES ($1)", [
            "821f394d-6215-48b4-89a9-0af953ba8a76",
        ]);

        const account = await client.query(
            "SELECT falhas_login, login_bloqueado_ate FROM usuario WHERE id = $1",
            ["821f394d-6215-48b4-89a9-0af953ba8a76"]
        );
        expect(account.rows[0]).toEqual({ falhas_login: 0, login_bloqueado_ate: null });

        await expect(
            client.query("UPDATE usuario SET falhas_login = -1 WHERE id = $1", [
                "821f394d-6215-48b4-89a9-0af953ba8a76",
            ])
        ).rejects.toMatchObject({ code: "23514" });
    });
});
