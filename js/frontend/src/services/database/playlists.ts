import { Row } from '1fpga:db';

import * as services from '@/services';
import * as user from '@/services/user';
import { assert, sql } from '@/utils';

export interface PlaylistsRow extends Row {
  id: number;
  name: string;
  usersId: number;
  isPublic: boolean;
}

/**
 * Create a new playlist in the database.
 * @param name
 * @param owner
 * @param isPublic
 */
export async function create(
  name: string,
  owner: user.User = user.User.loggedInUser(true),
  isPublic = false,
): Promise<PlaylistsRow> {
  const [row] = await sql<PlaylistsRow>`
    INSERT INTO Playlists ${sql.insertValues({
      name,
      usersId: owner.id,
      isPublic,
    })}
      RETURNING *
  `;
  return row;
}

export interface ListOptions {
  all?: boolean;
  name?: string;
  isPublic?: boolean;
  usersId?: number;
}

function buildQuery({ all = false, name, isPublic = true, usersId }: ListOptions) {
  return sql`
    WHERE
    ${sql.and(
      usersId
        ? sql`usersId = ${usersId}`
        : all
          ? sql`usersId = ${user.User.loggedInUser(true).id}`
          : undefined,
      isPublic && sql`(isPublic IS TRUE OR usersId = ${user.User.loggedInUser(true).id})`,
      name === undefined ? undefined : sql`name = ${name}`,
    )}`;
}

export function list(options: ListOptions = {}): Promise<PlaylistsRow[]> {
  return sql<PlaylistsRow>`SELECT *
                           FROM Playlists ${buildQuery(options)}
                           ORDER BY name`;
}

export async function exists(name: string, u?: user.User) {
  if (!u) {
    u = user.User.loggedInUser(true);
  }
  return (await count({ name, usersId: u.id })) > 0;
}

export async function count(options: ListOptions = {}) {
  const [row] = await sql<{ count: number }>`SELECT COUNT(*) as count
                                             FROM Playlists ${buildQuery(options)}`;
  return row?.count;
}

export async function removeGame(playlist: PlaylistsRow, game: { id: number }) {
  const user = services.user.User.loggedInUser(true);
  assert.assert(playlist.usersId === user.id || user.admin);

  await sql`DELETE
            FROM PlaylistsGames
            WHERE playlistsId = ${playlist.id}
              AND gamesId = ${game.id}`;
}

export async function addGame(playlist: PlaylistsRow, game: { id: number }, priority?: number) {
  const user = services.user.User.loggedInUser(true);
  assert.assert(playlist.usersId === user.id || user.admin);

  await sql`INSERT INTO PlaylistsGames ${sql.insertValues({
    playlistsId: playlist.id,
    gamesId: game.id,
    ...(priority !== undefined ? { priority } : {}),
  })}
            ON CONFLICT
  DO NOTHING`;
}

export async function delete_(playlist: PlaylistsRow) {
  const user = services.user.User.loggedInUser(true);
  assert.assert(playlist.usersId === user.id || user.admin);

  await sql`DELETE
            FROM Playlists
            WHERE id = ${playlist.id}`;
}
