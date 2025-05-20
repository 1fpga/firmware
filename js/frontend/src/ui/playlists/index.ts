import * as osd from '1fpga:osd';

import * as services from '@/services';
import { GamesPlaylistsRow } from '@/services/local';
import * as games from '@/ui/games';
import { DbSqlTag, parenthesize } from '@/utils';

export async function manage(playlist: services.db.playlists.PlaylistsRow) {
  let done = false;
  const user = services.user.User.loggedInUser(true);

  while (!done) {
    const { games: gameList } = await services.db.games.listExtended({
      playlist,
    });
    const canManage = playlist.usersId === user.id || user.admin;

    done = await osd.textMenu({
      title: playlist.name,
      back: true,
      items: [
        ...gameList.map(g => ({
          label: `${parenthesize(g.playlistPriority)} ${g.name}`,
          async select() {
            await services.launch.game(g);
          },
          details: canManage
            ? async () => {
                const choice = await osd.alert({
                  title: 'Remove?',
                  message: `Do you want to remove "${g.name}" from the playlist ${playlist.name}`,
                  choices: ['Cancel', 'Remove'],
                });
                if (choice === 1) {
                  await services.db.playlists.removeGame(playlist, g);
                  return false;
                }
              }
            : undefined,
        })),
        ...(canManage
          ? [
              '-',
              {
                label: 'Add a game to the playlist',
                async select() {
                  const g = await games.pickGame({
                    title: 'Add a game to the playlist',
                  });
                  if (g === null) {
                    return;
                  }

                  await services.db.playlists.addGame(playlist, g);
                  return false;
                },
              },
              {
                label: 'Delete the playlist',
                async select() {
                  const choice = await osd.alert({
                    title: 'Delete playlist?',
                    message: `Do you want to delete the playlist "${playlist.name}"?`,
                    choices: ['Cancel', 'Remove'],
                  });
                  if (choice === 1) {
                    await services.db.playlists.delete_(playlist);
                    return true;
                  }
                },
              },
            ]
          : []),
      ],
    });
  }
}

/**
 * Import a playlist into the database.
 * @param name The name of the playlist to replace or import.
 * @param systems An array of systems and sql tags (to save time) to query for the list of games.
 * @returns A list of missing items that were not imported, or null if the action was cancelled.
 */
async function importPlaylist(
  name: string,
  systems: [services.db.systems.SystemsRow, DbSqlTag][],
): Promise<GamesPlaylistsRow[] | null> {
  const u = services.user.User.loggedInUser(true);
  // Check if the playlist exists already.
  if (await services.db.playlists.exists(name, u)) {
    const choice = await osd.alert({
      title: 'Importing playlist...',
      message: `The playlist "${name}" already exists. Do you want to replace it?`,
      choices: ['Cancel', 'Replace'],
    });
    if (choice !== 1) {
      return null;
    }

    const rows = await services.db.playlists.list({ name, usersId: u.id });
    await services.db.playlists.delete_(rows[0]);
  }

  const missing = [];
  const playlist = await services.db.playlists.create(name);

  for (const [s, sql1] of systems) {
    const rows = await services.local.listGamesInPlaylist(name, s, sql1);
    for (const r of rows) {
      const sha256 = JSON.parse(r.sha256);
      const g = await services.db.games.first({ sha256 });

      if (g) {
        await services.db.playlists.addGame(playlist, g, r.priority ?? undefined);
      } else {
        missing.push(r);
      }
    }
  }

  return missing;
}

/**
 * Import a playlist from a catalog's system database.
 */
export async function importPlaylistMenu() {
  const playlists = await services.local.listCatalogPlaylists();

  return await osd.textMenu({
    title: 'Pick a playlist to add:',
    back: true,
    items: [...playlists.entries()].map(([name, systems]) => {
      return {
        label: name,
        async select() {
          const list = await importPlaylist(name, systems);
          if (list === null) {
            return false;
          }
          await osd.alert(
            'Imported playlist successfully',
            `The playlist was imported successfully.${
              list.length &&
              `\n\nHowever, ${list.length} games from the playlist were not found in your collection.`
            }`,
          );
          return true;
        },
      };
    }),
  });
}

export async function create(): Promise<boolean> {
  let name: string | undefined = undefined;
  let error = '';

  do {
    name = await osd.prompt(`Enter a name for your new playlist: ${error && `\n(${error})`}`);
    name = name?.trim(); // Make sure it doesn't only contain spaces or starts/ends with spaces.
    if (!name) {
      return false;
    }

    error = '';
    if (name.length > 50) {
      error = 'Name should be 50 characters or fewer';
    } else if (name.length < 3) {
      error = 'Name should be at least 3 characters';
    } else if ((await services.db.playlists.count({ name })) > 0) {
      error = 'Name already exists';
    }
  } while (error);

  const row = await services.db.playlists.create(name);
  await manage(row);
  return true;
}

export async function menu() {
  let done = false;

  while (!done) {
    const playlists = await services.db.playlists.list({});

    done = await osd.textMenu({
      title: 'Playlists',
      back: true,
      items: [
        ...playlists.map(pl => ({
          label: pl.name,
          async select() {
            await manage(pl);
            return false;
          },
        })),
        ...(playlists.length > 0 ? ['-'] : []),
        {
          label: 'Create a new playlist...',
          async select() {
            if (await create()) {
              return false;
            }
          },
        },
        {
          label: 'Import a playlist from a catalog...',
          async select() {
            if (await importPlaylistMenu()) {
              return false;
            }
          },
        },
      ],
    });
  }
}
