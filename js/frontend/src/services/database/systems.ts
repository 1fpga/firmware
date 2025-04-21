import { Row } from '1fpga:db';

import { CatalogRow } from '@/services/database/catalog';
import { NormalizedSystem } from '@/services/remote/catalog';
import { sql } from '@/utils';

export interface SystemsRow extends Row {
  id: number;
  catalogsId: number;
  name: string;
  uniqueName: string;
  dbPath: string;
}

export async function create(catalog: CatalogRow, system: NormalizedSystem, dbPath: string | null) {
  const [row] = await sql<SystemsRow>`
    INSERT INTO Systems ${sql.insertValues({
      catalogsId: catalog.id,
      name: system.name,
      uniqueName: system.uniqueName,
      dbPath,
    })}
      RETURNING *`;

  return row;
}

export async function list(): Promise<SystemsRow[]> {
  return sql<SystemsRow>`
    SELECT *
    FROM Systems
  `;
}

export interface FindOptions {
  core?: { id: number };
}

export async function find({ core }: FindOptions) {
  return sql<SystemsRow>`
    SELECT Systems.*
    FROM Systems ${
      core &&
      sql`
        LEFT JOIN CoresSystems ON CoresSystems.systemsId = Systems.id
        LEFT JOIN Cores ON Cores.id = CoresSystems.coresId = Cores.id
      `
    }
    WHERE ${sql.and(
      true,
      core
        ? sql`Cores.id =
        ${core.id}`
        : undefined,
    )}
  `;
}
