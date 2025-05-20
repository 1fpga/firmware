import * as osd from '1fpga:osd';

import * as services from '@/services';
import { delete_ } from '@/services/database/playlists';
import * as games from '@/ui/games';

export async function manage(playlist: services.db.playlists.PlaylistsRow) {
  let done = false;
  const user = services.user.User.loggedInUser(true);

  while (!done) {
    const { games: gameList } = await services.db.games.listExtended({
      playlist,
    });
    const canManage = playlist.usersId === user.id || user.admin;

    done = await osd.textMenu({
      title: `Manage "${playlist.name}"`,
      back: true,
      items: [
        playlist.name,
        '-',
        'Games:',
        ...gameList.map(g => ({
          label: `  ${g.name}`,
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

export async function create(): Promise<boolean> {
  let name: string | undefined = undefined;
  let error = '';

  do {
    name = await osd.prompt(`Enter a name for your new playlist: ${error && `\n(${error})`}`);
    name = name?.trim(); // Make sure it doesn't only contains/starts/ends with spaces.
    if (!name) {
      return false;
    }

    error = '';
    if (name.length > 50) {
      error = 'Name should be 50 characters or less';
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
      ],
    });
  }
}
