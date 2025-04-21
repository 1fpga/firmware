import type * as schemas from '@1fpga/schemas';
import { stripIndents } from 'common-tags';

import * as osd from '1fpga:osd';
import { TextMenuItem } from '1fpga:osd';
import * as system from '1fpga:system';

import { MainMenuAction } from '@/actions/main_menu';
import { StartGameAction } from '@/actions/start_game';
import * as services from '@/services';
import * as ui from '@/ui/index';
import { resetAll, resetDb } from '@/utils';

async function debugMenu() {
  await osd.textMenu({
    title: 'Debug',
    back: false,
    items: [
      {
        label: 'Prompt Test...',
        async select() {
          const p = await osd.prompt('Enter something:');
          await osd.alert(`You entered:\n${p ?? ''}`);
        },
      },
      {
        label: 'Input Tester...',
        select: async () => {
          await osd.inputTester();
        },
      },
      {
        label: 'Reset All...',
        select: async () => {
          const should = await osd.alert({
            title: 'Reset everything',
            message: 'Are you sure?',
            choices: ['No', 'Yes'],
          });
          if (should === 1) {
            await resetAll();
          }
        },
      },
    ],
  });
}

async function mainMenu(
  u: services.user.User,
  startOn: schemas.settings.StartOnSetting,
  s: services.settings.UserSettings,
) {
  let quit = false;
  let logout = false;

  // Check the startOn option.
  switch (startOn.kind) {
    case services.settings.StartOnKind.GameLibrary:
      await ui.games.gamesMenu();
      break;
    case services.settings.StartOnKind.LastGamePlayed:
      {
        const game = await services.db.games.lastPlayedExtended();
        if (game) {
          await services.launch.game(game);
        } else {
          await ui.games.gamesMenu();
          break;
        }
      }
      break;
    case services.settings.StartOnKind.SpecificGame:
      {
        const game = await services.db.games.getExtended(startOn.game);
        if (game) {
          await services.launch.game(game);
        }
      }
      break;

    case services.settings.StartOnKind.MainMenu:
    default:
      break;
  }

  async function notImplemented(s: string) {
    await osd.alert('Not implemented yet: ' + s);
  }

  let selected: number | undefined = 0;
  // There is no back menu, but we still need to loop sometimes (when selecting a game, for example).
  while (!(quit || logout)) {
    const nbGames = await services.db.games.count();
    const nbCores = await services.db.cores.count();
    const nbScreenshots = await services.db.screenshots.count();

    const gamesMarker = nbGames ? `(${nbGames})` : '';
    const coresMarker = nbCores ? `(${nbCores})` : '';
    const screenshotsMarker = nbScreenshots ? `(${nbScreenshots})` : '';
    const downloadMarker = (await services.db.catalog.anyUpdatePending()) ? '!' : '';

    selected = await osd.textMenu<number>({
      title: '',
      highlighted: selected,
      items: [
        {
          label: 'Game Library',
          select: () => ui.games.gamesMenu().then(() => 0),
          marker: gamesMarker,
        },
        {
          label: 'Cores',
          select: () => ui.cores.select().then(() => 1),
          marker: coresMarker,
        },
        {
          label: 'Screenshots',
          select: () => ui.screenshots.screenshotsMenu().then(() => 2),
          marker: screenshotsMarker,
        },
        '---',
        {
          label: 'Settings...',
          select: async () => ui.settings.settingsMenu().then(() => 4),
        },
        ...(u.admin
          ? [
              {
                label: 'Download Center...',
                marker: downloadMarker,
                async select(_, index) {
                  await ui.catalog.downloadCenterMenu();
                  return index;
                },
              } as TextMenuItem<number>,
            ]
          : []),
        {
          label: 'Controllers...',
          async select(_, index) {
            await osd.alert('Controllers', 'Not implemented yet.');
            return index;
          },
        },
        '---',
        {
          label: 'About',
          select: async (_, index) => (await import('@/ui/about')).about().then(() => index),
        },
        ...((await s.getDevTools())
          ? [
              '-',
              {
                label: 'Developer Tools',
                async select(_, index) {
                  await debugMenu();
                  return index;
                },
              } as TextMenuItem<number>,
            ]
          : []),
        '---',
        ...((await services.user.User.canLogOut())
          ? [
              {
                label: 'Logout',
                select(_, index) {
                  logout = true;
                },
              } as TextMenuItem<number>,
            ]
          : []),
        {
          label: 'Exit',
          select() {
            quit = true;
          },
        },
        {
          label: 'Shutdown...',
          async select(_, index) {
            const choice = await osd.alert({
              title: 'Shutdown',
              message: 'Are you sure you want to shutdown?',
              choices: ['Cancel', 'Shutdown', 'Reboot'],
            });
            switch (choice) {
              case 1:
                return system.shutdown();
              case 2:
                return system.restart();
              default:
                return index;
            }
          },
        },
      ],
    });
  }

  if (quit) {
    return true;
  } else if (logout) {
    await services.db.Commands.logout();
    await services.user.User.logout();
  }
  return false;
}

/**
 * Initialize the application.
 */
async function initAll() {
  // Before setting commands (to avoid commands to interfere with the login menu),
  // we need to initialize the user.
  let loggedInUser = await ui.login.login();

  if (loggedInUser === null) {
    // Run first time setup.
    await (await import('./wizards/first-time-setup')).firstTimeSetup();
    loggedInUser = await services.user.User.login(undefined, true);

    if (loggedInUser === null) {
      await osd.alert(
        'Error',
        stripIndents`
          Could not log in after initial setup. This is a bug.

          Please report this issue to the developers.

          The application will now exit.
        `,
      );
      return {};
    }
    await services.db.Commands.login(loggedInUser, true);
  } else {
    await services.db.Commands.login(loggedInUser, false);
  }

  const [s, global] = await Promise.all([
    services.settings.UserSettings.init(loggedInUser),
    services.settings.GlobalSettings.init(),
  ]);

  return { user: loggedInUser, settings: s, global };
}

/**
 * Main function of the frontend.
 * @returns `true` if the application should exit.
 */
export async function mainInner(): Promise<boolean> {
  const { user, settings, global } = await initAll();

  if (!user || !settings || !global) {
    const choice = await osd.alert({
      title: 'Error',
      message: 'Could not initialize the application. Do you want to reset everything?',
      choices: ['Reset', 'Exit'],
    });
    if (choice === 1) {
      // Clear the database.
      await resetDb();
      return true;
    } else {
      return false;
    }
  }

  let startOn = await settings.startOn();

  console.log('Starting on:', JSON.stringify(startOn));
  console.log('Date: ', new Date());

  let action = undefined;

  while (true) {
    try {
      if (action === undefined) {
        return await mainMenu(user, startOn, settings);
      } else if (action instanceof StartGameAction) {
        await services.launch.game(action.game);
      }
      action = undefined;
      startOn = { kind: services.settings.StartOnKind.MainMenu };
    } catch (e: any) {
      action = undefined;
      startOn = { kind: services.settings.StartOnKind.MainMenu };
      if (e instanceof StartGameAction) {
        // Set the action for the next round.
        action = e;
      } else if (e instanceof MainMenuAction) {
        // There is a quirk here that if the StartOn is GameLibrary, we will go back
        // to the game library instead of the main menu.
        switch ((await settings.startOn()).kind) {
          case services.settings.StartOnKind.GameLibrary:
            startOn = { kind: services.settings.StartOnKind.GameLibrary };
        }
      } else {
        // Rethrow to show the user the actual error.
        let choice = await osd.alert({
          title: 'An error happened',
          message: (e as Error)?.message ?? JSON.stringify(e),
          choices: ['Restart', 'Quit'],
        });
        if (choice === 1) {
          return true;
        }
      }
    }
  }
}
