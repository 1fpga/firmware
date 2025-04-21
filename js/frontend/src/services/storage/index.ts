import { sql } from '@/utils';

interface UserStorageRow {
  value: string;
}

export class DbStorage {
  static async user(id: number): Promise<DbStorage> {
    return new DbStorage(id);
  }

  static async global(): Promise<DbStorage> {
    return new DbStorage(undefined);
  }

  private constructor(private readonly usersId: number | undefined) {}

  async get<T>(key: string, validator?: (v: unknown) => v is T): Promise<T | undefined> {
    let value: string | undefined;
    if (this.usersId === undefined) {
      const rows = await sql<UserStorageRow>`SELECT value
                                             FROM GlobalStorage
                                             WHERE key = ${key}
                                             LIMIT 1`;
      value = rows[0]?.value;
    } else {
      let rows = await sql<UserStorageRow>`
        SELECT value
        FROM UserStorage
        WHERE key = ${key}
          AND usersId = ${this.usersId}
        LIMIT 1`;
      value = rows[0]?.value;
    }

    if (value === undefined) {
      return undefined;
    }
    const json = JSON.parse(value);
    if (validator && !validator(json)) {
      throw new Error(`Invalid value schema: key=${JSON.stringify(key)}`);
    }
    return json as T;
  }

  async set<T>(key: string, value: T): Promise<void> {
    const valueJson = JSON.stringify(value);
    if (this.usersId === undefined) {
      await sql`INSERT INTO GlobalStorage ${sql.insertValues({
        key,
        value: valueJson,
      })}
                ON CONFLICT (key)
      DO UPDATE SET value = excluded.value`;
    } else {
      await sql`INSERT INTO UserStorage ${sql.insertValues({
        key,
        value: valueJson,
        usersId: this.usersId,
      })}
                ON CONFLICT (key, usersId)
      DO UPDATE SET value = excluded.value`;
    }
  }

  async remove(key: string): Promise<void> {
    if (this.usersId === undefined) {
      await sql`DELETE
                FROM GlobalStorage
                WHERE key = ${key}`;
    } else {
      await sql`DELETE
                FROM UserStorage
                WHERE key = ${key}
                  AND usersId = ${this.usersId}`;
    }
  }
}
