export * from "./database";
export * from "./remote";
export * from "./storage";
export * from "./user";

import * as golemDb from "@:golem/db";
import { SqlTag, type SqlTagDriver } from "@sqltags/core";

async function applyMigrations(db: golemDb.Db, _name: string, latest: string) {
  const migrations = await import("@:migrations");
  const allMigrations = Object.getOwnPropertyNames(migrations.up)
    .filter((m) => m.localeCompare(latest) > 0)
    .sort();

  if (allMigrations.length === 0) {
    return;
  }

  console.log(
    `Latest migration: ${latest}, applying ${allMigrations.length} migrations...`,
  );

  for (const migration of allMigrations) {
    let sqlUp = migrations.up[migration];
    await db.executeRaw(sqlUp);
    await sql`INSERT INTO __1fpga_settings ${sql.insertValues({
      key: "latest_migration",
      value: migration,
    })}
                  ON CONFLICT (key)
        DO UPDATE SET value = excluded.value`;
  }
}

async function createMigrationTable(
  db: golemDb.Db,
  name: string,
): Promise<void> {
  await sql`CREATE TABLE __1fpga_settings
              (
                  id    INTEGER PRIMARY KEY,
                  key   TEXT NOT NULL UNIQUE,
                  value TEXT NOT NULL
              )`;

  await applyMigrations(db, name, "");
}

async function initDb(db: golemDb.Db, name: string): Promise<void> {
  // Check if the migrations table exists.
  let migrationsTableExists = await sql`SELECT 1
                                          FROM sqlite_schema
                                          WHERE type = 'table'
                                            AND name = '__1fpga_settings'`;

  if (migrationsTableExists.length === 0) {
    await createMigrationTable(db, name);
  } else {
    const [{ value: latestMigration }] = await sql<{
      value: string;
    }>`SELECT value
           FROM __1fpga_settings
           WHERE key = 'latest_migration'`;

    await applyMigrations(db, name, latestMigration || "");
  }
}

let db: golemDb.Db | null = null;

export async function getDb(): Promise<golemDb.Db> {
  if (db === null) {
    db = await golemDb.load("1fpga");
    await initDb(db, "1fpga");
  }

  return db;
}

const driver: SqlTagDriver<undefined, never> = {
  cursor(
    sql: string,
    params: any[],
    options: {} | undefined,
  ): AsyncIterable<any> {
    throw new Error("Method not implemented.");
  },
  escapeIdentifier(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`;
  },
  parameterizeValue(value: any, paramIndex: number): string {
    return "?";
  },
  async query(sql: string, params: any[]): Promise<[any[], undefined]> {
    let { rows } = await (await getDb()).query(sql, params);
    return [rows, undefined];
  },
};

export const sql = new SqlTag(driver);
