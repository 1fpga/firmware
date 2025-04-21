import * as fs from 'node:fs';
import path from 'node:path';
import { Database, open } from 'sqlite';
import sqlite3 from 'sqlite3';

import * as filesystem from '@/utils/server/filesystem';

const DB_MAP = new Map<string, Database>();

async function pathOf(name: string): Promise<string> {
  const filename = await filesystem.pathOf(name);
  await fs.promises.mkdir(path.dirname(filename), { recursive: true });

  return filename;
}

export async function connect(p: string): Promise<Database> {
  if (!DB_MAP.has(p)) {
    const filename = await pathOf(p);
    await fs.promises.mkdir(path.dirname(filename), { recursive: true });

    // If the database instance is not initialized, open the database connection
    const db = await open({
      filename,
      driver: sqlite3.Database,
    });
    DB_MAP.set(p, db);
  }

  return (
    DB_MAP.get(p) ??
    (() => {
      throw Error(`Database ${p} not found`);
    })()
  );
}

export async function reset(name: string) {
  console.log(`Reset database "${name}"`);

  await DB_MAP.get(name)?.close();
  DB_MAP.delete(name);

  const filename = await pathOf(name);
  await fs.promises.unlink(filename);

  // Recreate the entry, empty.
  await connect(name);
}

export async function resetAll() {
  const dir = path.dirname(await pathOf(''));
  const files = await fs.promises.readdir(dir);

  for (const file of files.filter(n => n.endsWith('.sqlite'))) {
    await reset(file.slice(0, -7));
  }

  DB_MAP.clear();
}
