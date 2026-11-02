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
const pantryMigrationSql = await readFile(
    new URL(
        "../../prisma/migrations/20261101000000_add_pantry_categories/migration.sql",
        import.meta.url
    ),
    "utf8"
);
const shoppingListMigrationSql = await readFile(
    new URL(
        "../../prisma/migrations/20261101010000_add_shopping_list/migration.sql",
        import.meta.url
    ),
    "utf8"
);

describe.skipIf(!testDatabaseUrl)("Sprint 02 PostgreSQL migrations", () => {
    let client: PgClient;
    let schemaName: string;

    beforeEach(async () => {
        client = new Client({ connectionString: testDatabaseUrl! });
        await client.connect();
        schemaName = `sprint02_migration_${randomUUID().replaceAll("-", "")}`;
        await client.query("CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public");
        await client.query(`CREATE SCHEMA "${schemaName}"`);
        await client.query("SELECT set_config('search_path', $1, false)", [
            `"${schemaName}", public`,
        ]);
        await client.query("CREATE TABLE casa (id uuid PRIMARY KEY)");
        await client.query(`
            CREATE TABLE item_despensa (
                id uuid PRIMARY KEY,
                casa_id uuid NOT NULL REFERENCES casa(id),
                categoria varchar(80) NOT NULL
            )
        `);
        await client.query(
            "CREATE TYPE unidade_item_enum AS ENUM ('UNIDADE', 'KG', 'G', 'L', 'ML', 'PACOTE')"
        );
        await client.query("CREATE TABLE participacao (id uuid PRIMARY KEY)");
    });

    afterEach(async () => {
        if (!client) return;
        await client.query("ROLLBACK").catch(() => undefined);
        await client.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`).catch(() => undefined);
        await client.end();
    });

    it("preserves legacy labels, maps categories per residence, and enforces database constraints", async () => {
        const firstHome = "00000000-0000-4000-8000-000000000001";
        const secondHome = "00000000-0000-4000-8000-000000000002";
        const firstItem = "00000000-0000-4000-8000-000000000011";
        const secondItem = "00000000-0000-4000-8000-000000000012";
        const thirdItem = "00000000-0000-4000-8000-000000000013";

        await client.query("INSERT INTO casa (id) VALUES ($1), ($2)", [firstHome, secondHome]);
        await client.query(
            `INSERT INTO item_despensa (id, casa_id, categoria)
             VALUES ($1, $2, $3), ($4, $2, $5), ($6, $7, $5)`,
            [firstItem, firstHome, "graos", secondItem, "Padaria", thirdItem, secondHome]
        );

        await client.query(pantryMigrationSql);

        const householdCategories = await client.query(`
            SELECT casa_id, count(*)::int AS total
            FROM categoria_despensa
            GROUP BY casa_id
            ORDER BY casa_id
        `);
        expect(householdCategories.rows).toEqual([
            { casa_id: firstHome, total: 9 },
            { casa_id: secondHome, total: 9 },
        ]);

        const mappedItems = await client.query(`
            SELECT item.casa_id, item.categoria AS legacy_label,
                   category.nome AS category_name, category.casa_id AS category_home
            FROM item_despensa AS item
            JOIN categoria_despensa AS category ON category.id = item.categoria_id
            ORDER BY item.id
        `);
        expect(mappedItems.rows).toEqual([
            {
                casa_id: firstHome,
                legacy_label: "graos",
                category_name: "Grãos",
                category_home: firstHome,
            },
            {
                casa_id: firstHome,
                legacy_label: "Padaria",
                category_name: "Padaria",
                category_home: firstHome,
            },
            {
                casa_id: secondHome,
                legacy_label: "Padaria",
                category_name: "Padaria",
                category_home: secondHome,
            },
        ]);

        await expect(
            client.query(
                `INSERT INTO categoria_despensa (casa_id, nome, nome_normalizado)
                 VALUES ($1, 'padaria duplicada', 'padaria')`,
                [firstHome]
            )
        ).rejects.toMatchObject({ code: "23505" });

        const foreignCategory = await client.query(
            "SELECT id FROM categoria_despensa WHERE casa_id = $1 AND nome_normalizado = 'padaria'",
            [secondHome]
        );
        await expect(
            client.query("UPDATE item_despensa SET categoria_id = $1 WHERE id = $2", [
                foreignCategory.rows[0].id as string,
                firstItem,
            ])
        ).rejects.toMatchObject({ code: "23503" });
    });

    it.each([
        { label: "blank legacy category", names: ["   "], message: /categoria vazia/i },
        {
            label: "ambiguous custom labels",
            names: ["Padaria", " padaria "],
            message: /rótulos legados ambíguos/i,
        },
    ])("rolls back the migration for $label", async ({ names, message }) => {
        const home = "00000000-0000-4000-8000-000000000021";
        await client.query("INSERT INTO casa (id) VALUES ($1)", [home]);
        for (const [index, name] of names.entries()) {
            await client.query(
                "INSERT INTO item_despensa (id, casa_id, categoria) VALUES ($1, $2, $3)",
                [`00000000-0000-4000-8000-${String(index + 31).padStart(12, "0")}`, home, name]
            );
        }

        await expect(client.query(pantryMigrationSql)).rejects.toThrow(message);
        await client.query("ROLLBACK");

        const migrationArtifacts = await client.query(
            `
            SELECT
                EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_schema = $1 AND table_name = 'categoria_despensa'
                ) AS category_table_exists,
                EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = $1 AND table_name = 'item_despensa'
                      AND column_name = 'categoria_id'
                ) AS category_id_exists
        `,
            [schemaName]
        );
        expect(migrationArtifacts.rows[0]).toEqual({
            category_table_exists: false,
            category_id_exists: false,
        });
    });

    it("creates versioned shopping items and enforces lifecycle and field constraints", async () => {
        const home = "00000000-0000-4000-8000-000000000041";
        const member = "00000000-0000-4000-8000-000000000042";
        await client.query("INSERT INTO casa (id) VALUES ($1)", [home]);
        await client.query("INSERT INTO participacao (id) VALUES ($1)", [member]);
        await client.query(shoppingListMigrationSql);

        const created = await client.query(
            `INSERT INTO item_lista_compras (casa_id, nome, criado_por_participacao_id)
             VALUES ($1, 'Leite', $2)
             RETURNING id, status::text AS status, versao, quantidade, unidade::text AS unidade`,
            [home, member]
        );
        expect(created.rows[0]).toMatchObject({
            status: "PENDENTE",
            versao: 1,
            quantidade: null,
            unidade: null,
        });
        const itemId = created.rows[0].id as string;

        const firstUpdate = await client.query(
            `UPDATE item_lista_compras SET nome = 'Leite integral', versao = versao + 1
             WHERE id = $1 AND casa_id = $2 AND versao = 1 RETURNING versao`,
            [itemId, home]
        );
        const staleUpdate = await client.query(
            `UPDATE item_lista_compras SET nome = 'Nome desatualizado', versao = versao + 1
             WHERE id = $1 AND casa_id = $2 AND versao = 1 RETURNING versao`,
            [itemId, home]
        );
        expect(firstUpdate.rows).toEqual([{ versao: 2 }]);
        expect(staleUpdate.rows).toEqual([]);

        await expect(
            client.query(
                `INSERT INTO item_lista_compras (casa_id, nome, quantidade, unidade)
                 VALUES ($1, 'Açúcar', 2, NULL)`,
                [home]
            )
        ).rejects.toMatchObject({ code: "23514" });
        await expect(
            client.query(
                `INSERT INTO item_lista_compras (
                    casa_id, nome, status, comprado_em, comprado_por_participacao_id
                 ) VALUES ($1, 'Café', 'COMPRADO', CURRENT_TIMESTAMP, NULL)`,
                [home]
            )
        ).rejects.toMatchObject({ code: "23514" });
        await expect(
            client.query("UPDATE item_lista_compras SET versao = 0 WHERE id = $1", [itemId])
        ).rejects.toMatchObject({ code: "23514" });
    });
});
