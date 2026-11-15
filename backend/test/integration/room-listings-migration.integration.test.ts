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
const roomMigrationSql = await readFile(
    new URL("../../prisma/migrations/20261109000000_add_room_listing_fields/migration.sql", import.meta.url),
    "utf8"
);

describe.skipIf(!testDatabaseUrl)("Room listings PostgreSQL migration", () => {
    let client: PgClient;
    let schemaName: string;

    beforeEach(async () => {
        client = new Client({ connectionString: testDatabaseUrl! });
        await client.connect();
        await client.query("BEGIN");
        schemaName = `room_listing_migration_${randomUUID().replaceAll("-", "")}`;
        await client.query(`CREATE SCHEMA "${schemaName}"`);
        await client.query("SELECT set_config('search_path', $1, true)", [
            `"${schemaName}", public`,
        ]);
        await client.query("CREATE TYPE status_anuncio_enum AS ENUM ('ABERTO', 'FECHADO')");
        await client.query(
            "CREATE TYPE status_interesse_anuncio_enum AS ENUM ('PENDENTE', 'ACEITO', 'RECUSADO')"
        );
        await client.query("CREATE TABLE casa (id uuid PRIMARY KEY)");
        await client.query("CREATE TABLE participacao (id uuid PRIMARY KEY)");
        await client.query(`
            CREATE TABLE anuncio_quarto (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                casa_id uuid NOT NULL REFERENCES casa(id) ON DELETE CASCADE,
                titulo varchar(150) NOT NULL,
                descricao text,
                valor_mensal decimal(10, 2) NOT NULL,
                cidade varchar(100) NOT NULL,
                bairro varchar(100),
                status status_anuncio_enum NOT NULL DEFAULT 'ABERTO',
                exibir_endereco boolean NOT NULL DEFAULT false,
                endereco_referencia varchar(255),
                exibir_contato boolean NOT NULL DEFAULT false,
                criado_por_participacao_id uuid NOT NULL REFERENCES participacao(id)
            )
        `);
        await client.query(`
            CREATE TABLE interesse_anuncio (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                anuncio_id uuid NOT NULL REFERENCES anuncio_quarto(id) ON DELETE CASCADE,
                usuario_id uuid NOT NULL,
                mensagem text,
                status status_interesse_anuncio_enum NOT NULL DEFAULT 'PENDENTE'
            )
        `);
    });

    afterEach(async () => {
        if (!client) return;
        await client.query("ROLLBACK").catch(() => undefined);
        const schema = await client.query("SELECT to_regnamespace($1) AS schema", [schemaName]);
        expect(schema.rows[0].schema).toBeNull();
        await client.end();
    });

    it("adds listing fields while preserving legacy listings, references, flags, and interests", async () => {
        const houseId = "00000000-0000-4000-8000-000000000001";
        const memberId = "00000000-0000-4000-8000-000000000002";
        const listingId = "00000000-0000-4000-8000-000000000003";
        const interestId = "00000000-0000-4000-8000-000000000004";
        await client.query("INSERT INTO casa (id) VALUES ($1)", [houseId]);
        await client.query("INSERT INTO participacao (id) VALUES ($1)", [memberId]);
        await client.query(
            `INSERT INTO anuncio_quarto (
                id, casa_id, titulo, descricao, valor_mensal, cidade, bairro,
                exibir_endereco, endereco_referencia, exibir_contato, criado_por_participacao_id
             ) VALUES ($1, $2, 'Quarto legado', 'Descrição existente', 420.00, 'Quixadá',
                       'Centro', false, 'Próximo à praça', false, $3)`,
            [listingId, houseId, memberId]
        );
        await client.query(
            `INSERT INTO interesse_anuncio (id, anuncio_id, usuario_id, mensagem)
             VALUES ($1, $2, $3, 'Tenho interesse')`,
            [interestId, listingId, "00000000-0000-4000-8000-000000000005"]
        );

        await client.query(roomMigrationSql);

        const migratedListing = await client.query(
            `SELECT id, titulo, endereco_referencia, endereco_completo, contato,
                    exibir_endereco, exibir_contato, tipo_moradia::text AS tipo_moradia,
                    aceita_pets, fotos, status::text AS status
             FROM anuncio_quarto WHERE id = $1`,
            [listingId]
        );
        expect(migratedListing.rows[0]).toMatchObject({
            id: listingId,
            titulo: "Quarto legado",
            endereco_referencia: "Próximo à praça",
            endereco_completo: null,
            contato: null,
            exibir_endereco: false,
            exibir_contato: false,
            tipo_moradia: "QUARTO_INDIVIDUAL",
            aceita_pets: false,
            fotos: [],
            status: "ABERTO",
        });

        const migratedInterest = await client.query(
            `SELECT id, anuncio_id, usuario_id, mensagem, status::text AS status
             FROM interesse_anuncio WHERE id = $1`,
            [interestId]
        );
        expect(migratedInterest.rows[0]).toEqual({
            id: interestId,
            anuncio_id: listingId,
            usuario_id: "00000000-0000-4000-8000-000000000005",
            mensagem: "Tenho interesse",
            status: "PENDENTE",
        });

        const indexes = await client.query(
            `SELECT indexname FROM pg_indexes
             WHERE schemaname = $1 AND tablename = 'anuncio_quarto'`,
            [schemaName]
        );
        expect(indexes.rows.map((row) => row.indexname)).toEqual(
            expect.arrayContaining([
                "idx_anuncio_quarto_status_criado_em",
                "idx_anuncio_quarto_valor_mensal",
                "idx_anuncio_quarto_tipo_pets",
            ])
        );
    });
});
