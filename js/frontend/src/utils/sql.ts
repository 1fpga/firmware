import type { MigrationDetails } from '@:migrations';
import { SqlTag, type SqlTagDriver } from '@sqltags/core';

import * as oneFpgaDb from '1fpga:db';

import production from 'consts:production';

const shouldLog = !production;

async function applyMigrations(db: oneFpgaDb.Db, _name: string, latest: string) {
  const initial = latest === '';
  const migrations = (await import('@:migrations')).migrations;
  const allMigrations: [string, MigrationDetails][] = Object.getOwnPropertyNames(migrations)
    .filter(m => m.localeCompare(latest) > 0)
    .sort()
    .map(m => migrations[m].up && ([m, migrations[m].up] as [string, MigrationDetails]))
    .filter(m => m !== undefined);

  if (allMigrations.length === 0) {
    console.debug(`Latest migration: ${latest}, no migrations to apply.`);
    return;
  }

  console.log(`Latest migration: ${latest}, applying ${allMigrations.length} migrations...`);

  const sql1 = await transaction();
  for (const [name, up] of allMigrations) {
    console.debug(`Applying ${name}...`);
    const { sql, pre, post } = up;

    // Start a transaction so everything is in a single transaction.
    try {
      let context: unknown = undefined;
      if (pre) {
        context = await pre(sql1, { initial });
      }
      await sql1.db.executeRaw(sql);
      if (post) {
        await post(sql1, { initial, context });
      }
    } catch (e) {
      await sql1.rollback();
      console.error(`Error applying migration ${name}: ${e}`);
      throw e;
    }

    await sql1`INSERT INTO __1fpga_settings ${sql1.insertValues({
      key: 'latest_migration',
      value: name,
    })}
               ON CONFLICT (key)
    DO UPDATE SET value = excluded.value`;
  }
  await sql1.commit();

  console.log(
    'Migrations applied. Latest migration: ',
    (
      await sql<{ value: string }>`SELECT value
                                   FROM __1fpga_settings
                                   WHERE key = 'latest_migration'`
    )[0]?.value,
  );
}

async function createMigrationTable(db: oneFpgaDb.Db, name: string): Promise<void> {
  await sql`CREATE TABLE __1fpga_settings
            (
              id    INTEGER PRIMARY KEY,
              key   TEXT NOT NULL UNIQUE,
              value TEXT NOT NULL
            )`;

  await applyMigrations(db, name, '');
}

async function initDb(db: oneFpgaDb.Db, name: string): Promise<void> {
  // Check if the migrations table exists.
  let migrationsTableExists = await sql`SELECT 1
                                        FROM sqlite_schema
                                        WHERE type = 'table'
                                          AND name = '__1fpga_settings'`;

  if (migrationsTableExists.length === 0) {
    await createMigrationTable(db, name);
  } else {
    const [latestMigration] = await sql<{
      value: string;
    }>`SELECT value
       FROM __1fpga_settings
       WHERE key = 'latest_migration'`;

    await applyMigrations(db, name, latestMigration?.value || '');
  }
}

let db: oneFpgaDb.Db | null = null;

export async function resetDb(): Promise<void> {
  console.warn('Clearing the database. Be careful!');
  db = null;
  await oneFpgaDb.reset('1fpga');
}

export async function closeAllDb(): Promise<void> {
  db = null;
}

async function getDb(): Promise<oneFpgaDb.Db> {
  if (db === null) {
    db = await oneFpgaDb.load('1fpga');
    await initDb(db, '1fpga');
  }

  return db;
}

const driver: SqlTagDriver<undefined, never> = {
  cursor(sql: string, params: any[], options: {} | undefined): AsyncIterable<any> {
    throw new Error('Method not implemented.');
  },
  escapeIdentifier(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`;
  },
  parameterizeValue(value: any, paramIndex: number): string {
    return '?';
  },
  async query(sql: string, params: any[]): Promise<[any[], undefined]> {
    let db = await getDb();
    if (shouldLog) {
      console.debug(sql, '\n|', JSON.stringify(params));
    }
    let result = await db.query(sql, params);
    return [result.rows, undefined];
  },
};

export type DbSqlTag = SqlTag<undefined, never>;

export const sql: DbSqlTag = new SqlTag(driver);

export const sqlOf = (database: oneFpgaDb.Db) => {
  return new SqlTag<undefined, never>({
    cursor(): AsyncIterable<any> {
      throw new Error('Method not implemented.');
    },
    escapeIdentifier(identifier: string): string {
      return `"${identifier.replace(/"/g, '""')}"`;
    },
    parameterizeValue(value: any, paramIndex: number): string {
      return '?';
    },
    async query(sql: string, params: any[]): Promise<[any[], undefined]> {
      if (shouldLog) {
        console.debug('of', sql, '\n|', JSON.stringify(params));
      }
      let result = await database.query(sql, params);
      return [result.rows, undefined];
    },
  }) as DbSqlTag;
};

export interface SqlTransactionTag extends DbSqlTag {
  commit(): Promise<void>;

  rollback(): Promise<void>;

  db: oneFpgaDb.Queryable;
}

export async function transaction(): Promise<SqlTransactionTag> {
  const db = await (await getDb()).beginTransaction();

  const tag = new SqlTag({
    ...driver,
    async query(sql: string, params: any[]): Promise<[any[], undefined]> {
      if (shouldLog) {
        console.debug('tx', sql, '\n|', JSON.stringify(params));
      }
      let { rows } = await db.query(sql, params);
      return [rows, undefined];
    },
  }) as SqlTransactionTag;

  tag.commit = async () => {
    await db.commit();
  };
  tag.rollback = async () => {
    await db.rollback();
  };
  tag.db = db;
  return tag;
}
