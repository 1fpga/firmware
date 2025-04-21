import { Row } from '1fpga:db';

import { CatalogRow } from '@/services/database/catalog';
import { NormalizedCore } from '@/services/remote/catalog';
import { sql } from '@/utils';

export interface CoreRow extends Row {
  id: number;
  catalogsId: number;
  name: string;
  uniqueName: string;
  rbfPath: string | null;
}

export async function create(catalog: CatalogRow, core: NormalizedCore, rbfPath: string | null) {
  const [row] = await sql<CoreRow>`INSERT INTO Cores ${sql.insertValues({
    catalogsId: catalog.id,
    name: core.name,
    uniqueName: core.uniqueName,
    rbfPath,
  })} RETURNING *`;

  for (const s of Array.isArray(core.systems) ? core.systems : [core.systems]) {
    const [{ id: systemsId }] = await sql<{ id: number }>`SELECT id
                                                          FROM Systems
                                                          WHERE uniqueName = ${s}`;
    await sql`INSERT INTO CoresSystems ${sql.insertValues({
      coresId: row.id,
      systemsId,
    })}`;
  }

  return row;
}

export async function getById(id: number): Promise<CoreRow | null> {
  const [row] = await sql<CoreRow>`SELECT *
                                   FROM Cores
                                   WHERE id = ${id}
                                   LIMIT 1`;
  return row;
}

export interface LookupCoreOptions {
  system?: { id: number };
  catalog?: { id: number };
}

function whereClause({ system, catalog }: LookupCoreOptions) {
  return sql.and(
    true,
    system
      ? sql`systemsId =
      ${system.id}`
      : undefined,
    catalog
      ? sql`catalogsId =
      ${catalog.id}`
      : undefined,
  );
}

export async function count(options: LookupCoreOptions = {}): Promise<number> {
  const [{ count }] = await sql<{ count: number }>`SELECT COUNT(*) as count
                                                   FROM Cores
                                                   WHERE ${whereClause(options)}`;

  return count;
}

export async function list(options: LookupCoreOptions = {}): Promise<CoreRow[]> {
  const rows = await sql<CoreRow>`SELECT *
                                  FROM Cores
                                  WHERE ${whereClause(options)}`;

  return rows;
}
