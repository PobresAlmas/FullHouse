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
const negotiationMigrationSql = await readFile(
    new URL(
        "../../prisma/migrations/20261115100000_add_room_negotiations/migration.sql",
        import.meta.url
    ),
    "utf8"
);

describe.skipIf(!testDatabaseUrl)("Room negotiation PostgreSQL migration", () => {
    let client: PgClient;
    let schemaName: string;

    beforeEach(async () => {
        client = new Client({ connectionString: testDatabaseUrl! });
        await client.connect();
        await client.query("BEGIN");
        schemaName = `room_negotiation_${randomUUID().replaceAll("-", "")}`;
        await client.query(`CREATE SCHEMA "${schemaName}"`);
        await client.query("SELECT set_config('search_path', $1, true)", [
            `"${schemaName}", public`,
        ]);
        await client.query("CREATE TABLE usuario (id uuid PRIMARY KEY)");
        await client.query("CREATE TABLE anuncio_quarto (id uuid PRIMARY KEY)");
        await client.query(`
            CREATE TABLE interesse_anuncio (
                id uuid PRIMARY KEY,
                anuncio_id uuid NOT NULL REFERENCES anuncio_quarto(id),
                usuario_id uuid NOT NULL REFERENCES usuario(id),
                status text NOT NULL
            )
        `);
        await client.query("CREATE TABLE convite_casa (id uuid PRIMARY KEY)");
    });

    afterEach(async () => {
        if (!client) return;
        await client.query("ROLLBACK").catch(() => undefined);
        const schema = await client.query("SELECT to_regnamespace($1) AS schema", [schemaName]);
        expect(schema.rows[0].schema).toBeNull();
        await client.end();
    });

    it("preserves existing interests and supports private negotiation messages and linked invitations", async () => {
        const userId = "00000000-0000-4000-8000-000000000001";
        const listingId = "00000000-0000-4000-8000-000000000002";
        const interestId = "00000000-0000-4000-8000-000000000003";
        const invitationId = "00000000-0000-4000-8000-000000000004";
        await client.query("INSERT INTO usuario (id) VALUES ($1)", [userId]);
        await client.query("INSERT INTO anuncio_quarto (id) VALUES ($1)", [listingId]);
        await client.query(
            "INSERT INTO interesse_anuncio (id, anuncio_id, usuario_id, status) VALUES ($1, $2, $3, 'ACEITO')",
            [interestId, listingId, userId]
        );
        await client.query("INSERT INTO convite_casa (id) VALUES ($1)", [invitationId]);

        await client.query(negotiationMigrationSql);

        const negotiation = await client.query(
            "INSERT INTO negociacao_anuncio (interesse_id) VALUES ($1) RETURNING id",
            [interestId]
        );
        const negotiationId = negotiation.rows[0].id;
        await client.query(
            "INSERT INTO mensagem_negociacao_anuncio (negociacao_id, autor_usuario_id, conteudo) VALUES ($1, $2, $3)",
            [negotiationId, userId, "Vamos conversar sobre a vaga."]
        );
        await client.query("UPDATE convite_casa SET negociacao_anuncio_id = $1 WHERE id = $2", [
            negotiationId,
            invitationId,
        ]);

        const preservedInterest = await client.query(
            "SELECT id, status FROM interesse_anuncio WHERE id = $1",
            [interestId]
        );
        expect(preservedInterest.rows[0]).toEqual({ id: interestId, status: "ACEITO" });
        const message = await client.query(
            "SELECT conteudo FROM mensagem_negociacao_anuncio WHERE negociacao_id = $1",
            [negotiationId]
        );
        expect(message.rows[0].conteudo).toBe("Vamos conversar sobre a vaga.");
        const linkedInvitation = await client.query(
            "SELECT negociacao_anuncio_id FROM convite_casa WHERE id = $1",
            [invitationId]
        );
        expect(linkedInvitation.rows[0].negociacao_anuncio_id).toBe(negotiationId);
        await expect(
            client.query("INSERT INTO negociacao_anuncio (interesse_id) VALUES ($1)", [interestId])
        ).rejects.toMatchObject({ code: "23505" });
    });
});
