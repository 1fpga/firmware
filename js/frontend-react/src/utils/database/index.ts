import { Database, open } from "sqlite";
import sqlite3 from "sqlite3";
import * as fs from "node:fs";
import path from "node:path";

const DB_MAP = new Map<string, Database>();

export async function connect(name: string): Promise<Database> {
  if (!DB_MAP.has(name)) {
    const filename = `./.next/databases/${name.replace(/[^a-zA-Z0-9_.-@%]/g, "$")}.sqlite`;
    await fs.promises.mkdir(path.dirname(filename), { recursive: true });

    // If the database instance is not initialized, open the database connection
    const db = await open({
      filename,
      driver: sqlite3.Database,
    });
    DB_MAP.set(name, db);
  }

  return (
    DB_MAP.get(name) ??
    (() => {
      throw Error(`Database ${name} not found`);
    })()
  );
}
