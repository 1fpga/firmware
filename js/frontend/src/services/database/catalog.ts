import { Row } from '1fpga:db';

import * as remote from '@/services/remote';
import { NormalizedCatalog } from '@/services/remote/catalog';
import { latestOf } from '@/services/remote/releases';
import { sql, versions } from '@/utils';

export interface CatalogRow extends Row {
  id: number;
  name: string;
  url: string;
  lastUpdateAt: string;
  version: string;
  priority: number;
  updatePending: boolean;

  json: string;
  latestJson: string | null;

  __cache: never;
}

export async function create(json: remote.catalog.NormalizedCatalog, priority: number) {
  const [catalog] = await sql<CatalogRow>`INSERT INTO Catalogs ${sql.insertValues({
    name: json.name,
    uniqueName: json.uniqueName,
    url: json._url,
    version: json._version ?? json.version ?? null,
    priority,
    json: JSON.stringify(json),
  })} RETURNING *`;
  return catalog;
}

export interface ListCatalogsOptions {
  updatePending?: boolean;
  url?: string;
}

export function parseRow(row: CatalogRow): {
  current: NormalizedCatalog;
  latest: NormalizedCatalog | null;
} {
  // Use an internal `__cache` field to cache the parsing.
  if (!(row as any)['__cache']) {
    (row as any)['__cache'] = {
      current: JSON.parse(row.json),
      latest: JSON.parse(row.latestJson ?? 'null') ?? null,
    };
  }

  return (row as any)['__cache'];
}

/**
 * Return the difference between a catalog's latestJson and its initial JSON. If there's
 * no latestJson field, the diffed catalog will be empty. The difference will include
 * every core, system and other pieces of a catalog that need to be updated.
 */
export function latestDiff(row: CatalogRow): remote.catalog.NormalizedCatalog {
  const { current, latest } = parseRow(row);
  return remote.catalog.diff(current, latest);
}

/**
 * Return an ID-to-CatalogRow map from the database.
 */
export async function map(): Promise<Map<number, CatalogRow>> {
  return new Map((await list()).map(row => [row.id, row]));
}

export async function list({ updatePending, url }: ListCatalogsOptions = {}) {
  const rows = await sql<CatalogRow>`SELECT *
                                     FROM Catalogs
                                     WHERE ${sql.and(
                                       true,
                                       url !== undefined
                                         ? sql`url =
                                         ${url}`
                                         : undefined,
                                       updatePending !== undefined
                                         ? sql`updatePending =
                                         ${updatePending}`
                                         : undefined,
                                     )}
  `;
  return rows.sort((a, b) => a.priority - b.priority);
}

export async function get(id: number): Promise<CatalogRow | undefined> {
  const [row] = await sql<CatalogRow>`
    SELECT *
    FROM Catalogs
    WHERE id = ${id}
  `;
  return row;
}

export async function anyUpdatePending() {
  const [{ up }] = await sql<{ up: boolean }>`SELECT COUNT(1) as up
                                              FROM Catalogs
                                              WHERE updatePending IS TRUE`;

  return up;
}

export async function exists(url: string) {
  const [{ found }] = await sql<{ found: boolean }>`SELECT 1 as found
                                                    FROM Catalogs
                                                    WHERE url = ${url}`;
  return found;
}

/**
 * Update the latest field in the catalog.
 * @param row
 * @param latest
 */
export async function setLatest(row: CatalogRow, latest: NormalizedCatalog) {
  await sql`UPDATE Catalogs
            SET ${sql.setValues({
              latestJson: JSON.stringify(latest),
              updatePending: true,
            })}
            WHERE id = ${row.id}`;
}
