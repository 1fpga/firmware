import { Row } from '1fpga:db';

import type { CoreRow } from '@/services/database/cores';
import type { PlaylistsRow } from '@/services/database/playlists';
import { NormalizedCore, NormalizedSystem } from '@/services/remote/catalog';
import { sql } from '@/utils';

import { User } from '../user';
import type { GamesId } from './games_identification';

/**
 * A Row from the Games table.
 */
export interface GamesRow extends Row {
  id: number;
  name: string;
  gamesId: number;
  coresId: number;
  path: string;
  size: number;
  sha256: string;
}

/**
 * A Row from the ExtendedGamesView which links games with their systems and
 * other useful information.
 */
export interface ExtendedGamesRow extends Row {
  id: number;
  name: string;
  romPath: string | null;
  rbfPath: string;
  systemName: string;
  coresId: number;
  favorite: boolean | null;
  lastPlayedAt: string | null;
}

export enum GameSortOrder {
  NameAsc = 'name ASC',
  NameDesc = 'name DESC',
  SystemAsc = 'systemName ASC',
  LastPlayed = 'lastPlayedAt DESC',
  Favorites = 'favorite DESC, lastPlayedAt DESC',
}

export interface GamesListOptions {
  /**
   * The sort order.
   */
  sort?: GameSortOrder;

  limit?: number;

  index?: number;

  /**
   * Merge games with the same game identification.
   */
  includeUnplayed?: boolean;
  includeUnfavorites?: boolean;
  system?: string;

  playlist?: PlaylistsRow;
}

function buildSqlQuery(options: GamesListOptions) {
  return sql`
    SELECT *
    FROM ExtendedGamesView ${
      options.playlist !== undefined
        ? sql`
          LEFT JOIN PlaylistsGames ON PlaylistsGames.gamesId = ExtendedGamesView.id
        LEFT JOIN Playlists ON Playlists.id = PlaylistsGames.playlistsId
        `
        : undefined
    }

    WHERE ${sql.and(
      true,
      options.system
        ? sql`systems.uniqueName =
        ${options.system}`
        : undefined,
      (options.includeUnplayed ?? true) ? undefined : sql`UserGames.lastPlayedAt IS NOT NULL`,
      (options.includeUnfavorites ?? true) ? undefined : sql`UserGames.favorite = true`,
      options.playlist
        ? sql`Playlists.id =
        ${options.playlist.id}`
        : undefined,
    )}
    ORDER BY ${sql.raw(options.sort ?? GameSortOrder.NameAsc)}
    LIMIT ${options.limit ?? 100} OFFSET ${options.index ?? 0}
  `;
}

export async function count(options: GamesListOptions = {}) {
  const [{ count }] = await sql<{ count: number }>`
    SELECT COUNT(*) as count
    FROM (${buildSqlQuery(options)})
  `;
  return count;
}

const asArray = <T>(v: T | T[]): T[] => (Array.isArray(v) ? v : [v]);

/**
 * Get one or multiple extended games rows based on their IDs. If `id` is an array,
 * this will return the rows in the exact order they were received.
 * @param id
 * @param keys
 */
export async function getExtended(id: number): Promise<ExtendedGamesRow>;
export async function getExtended(id: number[]): Promise<ExtendedGamesRow[]>;
export async function getExtended<T extends keyof ExtendedGamesRow = keyof ExtendedGamesRow>(
  id: number,
  keys?: T | T[],
): Promise<Pick<ExtendedGamesRow, T>>;
export async function getExtended<T extends keyof ExtendedGamesRow = keyof ExtendedGamesRow>(
  id: number[],
  keys?: T | T[],
): Promise<Pick<ExtendedGamesRow, T>[]>;
export async function getExtended<T extends keyof ExtendedGamesRow = keyof ExtendedGamesRow>(
  id: number | number[],
  keys?: T | T[],
): Promise<Pick<ExtendedGamesRow, T> | Pick<ExtendedGamesRow, T>[]> {
  if (Array.isArray(id)) {
    return sql<ExtendedGamesRow>`
      SELECT ${sql.raw(keys !== undefined ? asArray(keys).join(',') : '*')}
      FROM ExtendedGamesView
      WHERE ${sql.in('id', id)}
    `;
  }

  const [row] = await sql<ExtendedGamesRow>`
    SELECT ${sql.raw(keys !== undefined ? asArray(keys).join(',') : '*')}
    FROM ExtendedGamesView
    WHERE id = ${id}
  `;
  return row;
}

/**
 * Returns a map of all IDs -> ExtendedGamesRow.
 * @param ids
 * @param keys
 */
export async function map<T extends keyof ExtendedGamesRow = keyof ExtendedGamesRow>(
  ids: number[],
  keys?: T | T[],
): Promise<Map<number, Pick<ExtendedGamesRow, T>>> {
  return (await getExtended<T | 'id'>([...new Set(ids)], keys && [...asArray(keys), 'id'])).reduce(
    (a, g) => a.set(g.id, g),
    new Map<number, Pick<ExtendedGamesRow, T>>(),
  );
}

export async function lastPlayedExtended() {
  const [row] = await sql<ExtendedGamesRow>`
    SELECT *
    FROM ExtendedGamesView
    WHERE UserGames.lastPlayedAt IS NOT NULL
    ORDER BY UserGames.lastPlayedAt DESC
    LIMIT 1
  `;
  return row ?? null;
}

/**
 * Return the first game we can find.
 */
export async function first() {
  const [row] = await sql<ExtendedGamesRow>`
    SELECT *
    FROM ExtendedGamesView
    LIMIT 1
  `;
  return row ?? null;
}

export async function listExtended(options: GamesListOptions = {}) {
  const games = await sql<ExtendedGamesRow>`${buildSqlQuery(options)}`;
  const total = await count(options);

  return { total, games };
}

export async function setFavorite(row: ExtendedGamesRow, favorite: boolean) {
  if (row.favorite !== favorite) {
    await sql`INSERT INTO UserGames
                ${sql.insertValues({
                  usersId: User.loggedInUser(true).id,
                  gamesId: row.id,
                  favorite,
                })}
              ON CONFLICT
    DO
    UPDATE SET favorite = excluded.favorite`;
  }
  row.favorite = favorite;
}

export async function setLastPlayedAt(g: ExtendedGamesRow, lastPlayedAt: Date) {
  await sql`INSERT INTO UserGames
              ${sql.insertValues({
                usersId: User.loggedInUser(true).id,
                gamesId: g.id,
                lastPlayedAt: lastPlayedAt.toString(),
              })}
            ON CONFLICT
  DO
  UPDATE SET lastPlayedAt = excluded.lastPlayedAt`;
}

export async function createIdentifiedGame(g: GamesId): Promise<GamesRow> {
  const [row] = await sql<GamesRow>`
    INSERT INTO Games ${sql.insertValues({
      name: g.title,
      systemsId: g.systemsId,
      path: g.path,
      size: g.size,
      sha256: g.sha256,
    })}
      RETURNING *
  `;

  // Create tags and regions
  for (const name of JSON.parse(g.regions)) {
    const [{ id }] = await sql<{ id: number }>`INSERT INTO Regions ${sql.insertValues({ name })}
                                               ON CONFLICT
    DO UPDATE SET name = excluded.name RETURNING id`;

    await sql`INSERT INTO GamesRegions ${sql.insertValues({
      gamesId: row.id,
      regionsId: id,
    })}`;
  }
  for (const name of JSON.parse(g.tags)) {
    const [{ id }] = await sql<{ id: number }>`INSERT INTO Tags ${sql.insertValues({ name })}
                                               ON CONFLICT
    DO UPDATE SET name = excluded.name RETURNING id`;

    await sql`INSERT INTO GamesTags ${sql.insertValues({
      gamesId: row.id,
      tagsId: id,
    })}`;
  }

  return row;
}

export async function createCoreGame(
  core: NormalizedCore,
  coreRow: CoreRow,
  s: NormalizedSystem[],
) {
  const [row] = await sql<GamesRow>`
    INSERT INTO Games
      ${sql.insertValues({
        name: core.gameName ?? core.name,
        coresId: coreRow.id,
      })}
      RETURNING *
  `;

  return row;
}
