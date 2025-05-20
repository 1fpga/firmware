import * as oneFpgaDb from '1fpga:db';

import * as db from '@/services/database';
import { DbSqlTag, assert, sqlOf } from '@/utils';

export async function listCatalogPlaylists(): Promise<
  Map<string, [db.systems.SystemsRow, DbSqlTag][]>
> {
  const systems = await db.systems.list();
  const allPlaylists: Map<string, [db.systems.SystemsRow, DbSqlTag][]> = new Map();

  // List all systems, then query those systems for the names of their playlists.
  // A playlist with the same name across systems is the same playlist.
  for (const s of systems) {
    if (!s.dbPath) {
      continue;
    }
    const sql1 = sqlOf(await oneFpgaDb.loadPath(s.dbPath));
    const rows = await sql1<{ name: string }>`SELECT name
                                              FROM Playlists`;
    for (const r of rows) {
      if (!allPlaylists.has(r.name)) {
        allPlaylists.set(r.name, []);
      }
      allPlaylists.get(r.name)?.push([s, sql1]);
    }
  }

  return allPlaylists;
}

export interface GamesPlaylistsRow extends oneFpgaDb.Row {
  playlistsName: string;
  gamesFullname: string;
  /**
   * This is JSON
   */
  sha256: string;
  priority: number | null;
}

export async function listGamesInPlaylist(
  playlistsName: string,
  systemsRow: db.systems.SystemsRow,
  sql1?: DbSqlTag,
): Promise<GamesPlaylistsRow[]> {
  if (!sql1) {
    assert.not.null_(systemsRow.dbPath);
    sql1 = sqlOf(await oneFpgaDb.loadPath(systemsRow.dbPath));
  }

  const rows = await sql1<GamesPlaylistsRow>`
    SELECT Playlists.name                                    as playlistsName,
           GamesId.fullname                                  as gamesFullname,
           PlaylistsGamesId.priority                         as priority,
           json_group_array(lower(hex(GamesSources.sha256))) as sha256
    FROM Playlists
           LEFT JOIN PlaylistsGamesId on Playlists.id = PlaylistsGamesId.playlistsId
           LEFT JOIN GamesId on PlaylistsGamesId.gamesId = GamesId.id
           LEFT JOIN GamesSources on GamesId.id = GamesSources.gamesId
    WHERE playlistsName = ${playlistsName}
    GROUP BY GamesId.id
  `;

  return rows;
}
