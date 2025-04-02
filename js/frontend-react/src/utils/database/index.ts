import { Database, open } from "sqlite";
import sqlite3 from "sqlite3";

const DB_MAP = new Map<string, Database>();

export async function connect(name: string): Promise<Database> {
  if (!DB_MAP.has(name)) {
    // If the database instance is not initialized, open the database connection
    const db = await open({
      filename: "./1fpga.sqlite", // Specify the database file path
      driver: sqlite3.Database, // Specify the database driver (sqlite3 in this case)
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
