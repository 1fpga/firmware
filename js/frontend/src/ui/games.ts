import * as osd from '1fpga:osd';

import { StartGameCommand } from '@/commands/games';
import * as services from '@/services';

const PAGE_SIZE = 100;

const SORT_LABEL = {
  [services.db.games.GameSortOrder.NameAsc]: 'Name (A-Z)',
  [services.db.games.GameSortOrder.NameDesc]: 'Name (Z-A)',
  [services.db.games.GameSortOrder.SystemAsc]: 'System (A-Z)',
  [services.db.games.GameSortOrder.LastPlayed]: 'Last Played',
  [services.db.games.GameSortOrder.MostPlayed]: 'Most Played',
  [services.db.games.GameSortOrder.Favorites]: 'Favorites',
};

export interface PickGameOptions {
  /**
   * The title of the game selection menu.
   */
  title?: string;

  /**
   * Whether to include unplayed games in the list.
   */
  includeUnplayed?: boolean;

  /**
   * Whether to allow the player to show details on a game.
   */
  details?: boolean;

  /**
   * The system to filter the games by.
   */
  system?: string;

  /**
   * Whether to allow the player to load a ROM directly.
   */
  allowFile?: boolean;
}

function ellipses(max: number, end = false) {
  if (end) {
    return (s: string) => (s.length > max ? s.slice(0, max - 3) + '...' : s);
  } else {
    return (s: string) => (s.length > max ? '...' + s.slice(-max + 3) : s);
  }
}

/**
 * Pick a game from the list of games available on the platform.
 * @param options Options for the game selection.
 * @returns The selected game, or `null` if no game was selected (e.g. "Back").
 */
export async function pickGame(
  options: PickGameOptions = {},
): Promise<services.db.games.ExtendedGamesRow | null> {
  const user = services.user.User.loggedInUser(true);
  const userSettings = await services.settings.UserSettings.forLoggedInUser();
  const sort = await userSettings.getGameSort();

  let currentSort = Object.keys(SORT_LABEL).indexOf(sort);
  if (currentSort === -1) {
    currentSort = 0;
  }

  let includeUnplayed = options.includeUnplayed ?? true;
  let index = 0;

  async function buildItems(): Promise<
    osd.TextMenuItem<services.db.games.ExtendedGamesRow | string>[]
  > {
    const { total, games } = await services.db.games.listExtended({
      system: options.system,
      includeUnplayed,
      sort: Object.keys(SORT_LABEL)[currentSort] as services.db.games.GameSortOrder,
      limit: PAGE_SIZE,
      includeSecondsPlayed: { userId: user.id },
    });

    const gameSet: Map<String, services.db.games.ExtendedGamesRow[]> = games.reduce((acc, game) => {
      if (!acc.has(game.name)) {
        acc.set(game.name, []);
      }
      acc.get(game.name).push(game);
      return acc;
    }, new Map());

    const gameSetItems = [...gameSet.entries()].map(([name, gameArray]) => ({
      label: '' + name,
      select: async () => {
        return gameArray[0];
      },
      details: async () => {
        const result = await showGameDetailsMenu('' + name, gameArray);
        if (result) {
          return result;
        }
      },
      marker: gameArray[0]?.systemName ?? '',
    }));

    return [
      ...gameSetItems,
      ...(total > PAGE_SIZE
        ? [
            {
              label: 'Next page...',
              select: async () => {
                index += PAGE_SIZE;
                return 'next';
              },
            },
          ]
        : []),
    ];
  }

  let selected: string | services.db.games.ExtendedGamesRow = 'next';

  while (selected === 'next') {
    const items = await buildItems();
    selected = await osd.textMenu<string | services.db.games.ExtendedGamesRow>({
      title: options.title ?? '',
      back: 'back',
      sort_label: Object.values(SORT_LABEL)[currentSort],
      sort: async () => {
        currentSort = (currentSort + 1) % Object.keys(SORT_LABEL).length;
        index = 0;
        const order = Object.keys(SORT_LABEL)[currentSort] as services.db.games.GameSortOrder;
        await userSettings.setGameSort(order);

        return {
          sort_label: Object.values(SORT_LABEL)[currentSort],
          items: await buildItems(),
        };
      },
      details: 'Details',
      items,
    });
  }
  return typeof selected == 'string' ? null : selected;
}

async function showGameDetailsMenu(
  name: string,
  gameArray: services.db.games.ExtendedGamesRow[],
): Promise<services.db.games.ExtendedGamesRow | null> {
  let highlighted: number | undefined = undefined;

  while (true) {
    const result = await showGameDetailsMenuInner(name, gameArray, highlighted);
    if (typeof result === 'number') {
      highlighted = result;
      continue;
    }
    if (result) {
      return result;
    }

    return null;
  }
}

async function showGameDetailsMenuInner(
  name: string,
  gameArray: services.db.games.ExtendedGamesRow[],
  highlighted: number | undefined,
): Promise<services.db.games.ExtendedGamesRow | false | number> {
  const shortcuts =
    services.db.Commands.get(StartGameCommand)?.shortcutsWithMeta.filter(s => {
      return gameArray.some(ga => ga.id === s.meta.gameId);
    }) ?? [];

  const result = await osd.textMenu<services.db.games.ExtendedGamesRow | false | number>({
    title: name,
    back: false,
    highlighted,
    items: [
      {
        label: 'Favorite',
        marker: gameArray[0].favorite ? 'Yes' : 'No',
        select: async item => {
          await services.db.games.setFavorite(gameArray[0], !gameArray[0].favorite);
          item.marker = gameArray[0].favorite ? 'Yes' : 'No';
        },
      },
      ...(gameArray.length > 1
        ? [
            '-',
            'Multiple versions available:',
            ...gameArray.map(game => {
              return {
                label: '  ' + ellipses(40)(game.romPath ?? '<NO PATH>'),
                select: async () => {
                  return game;
                },
              };
            }),
          ]
        : [
            {
              label: 'Launch',
              select: async () => {
                return gameArray[0];
              },
            },
          ]),
      '-',
      ...(shortcuts.length > 0
        ? [
            'Remove Shortcuts:',
            ...shortcuts.map((s, i) => ({
              label: ` ${s.shortcut}`,
              select: async () => {
                const command = await services.db.Commands.get(StartGameCommand);
                if (command) {
                  const choice = await osd.alert({
                    title: 'Deleting shortcut',
                    message: `Are you sure you want to delete this shortcut?\n${s.shortcut}`,
                    choices: ['Cancel', 'Delete shortcut'],
                  });
                  if (choice === 1) {
                    await command.deleteShortcut(s.shortcut);

                    // Return the new highlighted index.
                    return (
                      1 + // Favorite
                      (gameArray.length > 1 ? gameArray.length + 2 : 1) + // Multiple versions
                      1 + // Separator
                      i + // Shortcut index
                      1
                    );
                  }
                }
              },
            })),
          ]
        : []),
      {
        label: 'Add new shortcut...',
        select: async () => {
          const newShortcut = await osd.promptShortcut(name, 'Enter the shortcut:');
          if (!newShortcut) {
            return;
          }
          const command = services.db.Commands.get(StartGameCommand);
          if (command) {
            const maybeCommand = await services.db.Commands.find(newShortcut);
            if (maybeCommand) {
              // Find the type if necessary.
              const meta = maybeCommand.shortcutsWithMeta.find(({ shortcut }) => {
                return shortcut === newShortcut;
              });

              const labelOf = await maybeCommand.labelOf(meta?.meta);
              await osd.alert({
                title: 'Shortcut already exists',
                message: `The selected shortcut:\n${newShortcut}\nIs already in use by the command:\n${labelOf}`,
              });

              return;
            }
            await command.addShortcut(newShortcut, { gameId: gameArray[0].id });
            // Return the new hightlighted index.
            return (
              1 +
              (gameArray.length > 1 ? gameArray.length + 2 : 1) +
              1 +
              (shortcuts.length > 0 ? shortcuts.length + 2 : 1)
            );
          }
        },
      },
    ],
  });

  return result;
}

export async function gamesMenu() {
  while (true) {
    const game = await pickGame({ title: 'Game Library', allowFile: true });
    if (game) {
      await services.launch.game(game);
    } else {
      return;
    }
  }
}
