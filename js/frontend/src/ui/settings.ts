import * as osd from '1fpga:osd';
import * as oneFpgaSettings from '1fpga:settings';
import * as video from '1fpga:video';

import { db, settings, user } from '@/services';
import { pickGame } from '@/ui/games';
import { accountsSettingsMenu } from '@/ui/settings/accounts';
import { assert } from '@/utils';

import { networkSettingsMenu } from './settings/network';
import { shortcutsMenu } from './settings/shortcuts';

const UPDATE_FREQUENCY_LABELS = {
  [settings.CatalogCheckFrequency.Manually]: 'Manually',
  [settings.CatalogCheckFrequency.EveryStartup]: 'On Startup',
  [settings.CatalogCheckFrequency.Daily]: 'Daily',
  [settings.CatalogCheckFrequency.Weekly]: 'Once a week',
  [settings.CatalogCheckFrequency.Monthly]: 'Once a month',
};

const FONT_SIZE_LABELS: { [key in oneFpgaSettings.FontSize]: string } = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
};

const DATETIME_FORMAT_LABELS: {
  [key in oneFpgaSettings.DateTimeFormat]: string;
} = {
  default: 'Default',
  short: 'Short',
  timeOnly: 'Time Only',
  hidden: 'Hidden',
};

function setMode(mode: string) {
  try {
    video.setMode(mode);
  } catch (e) {
    console.error('Could not set video mode: ' + e);
  }
}

async function selectVideoMode() {
  await osd.textMenu({
    back: false,
    title: 'Select Video Mode',
    items: [
      { label: 'V1280x720r60', select: () => setMode('V1280x720r60') },
      { label: 'V1024x768r60', select: () => setMode('V1024x768r60') },
      { label: 'V720x480r60', select: () => setMode('V720x480r60') },
      { label: 'V720x576r50', select: () => setMode('V720x576r50') },
      { label: 'V1280x1024r60', select: () => setMode('V1280x1024r60') },
      { label: 'V800x600r60', select: () => setMode('V800x600r60') },
      { label: 'V640x480r60', select: () => setMode('V640x480r60') },
      { label: 'V1280x720r50', select: () => setMode('V1280x720r50') },
      { label: 'V1920x1080r60', select: () => setMode('V1920x1080r60') },
      { label: 'V1920x1080r50', select: () => setMode('V1920x1080r50') },
      { label: 'V1366x768r60', select: () => setMode('V1366x768r60') },
      { label: 'V1024x600r60', select: () => setMode('V1024x600r60') },
      { label: 'V1920x1440r60', select: () => setMode('V1920x1440r60') },
      { label: 'V2048x1536r60', select: () => setMode('V2048x1536r60') },
      { label: 'V2560x1440r60', select: () => setMode('V2560x1440r60') },
    ],
  });
}

async function startOptionsMenu(userSettings: settings.UserSettings) {
  const labels = {
    [settings.StartOnKind.MainMenu]: 'Main Menu',
    [settings.StartOnKind.GameLibrary]: 'Game Library',
    [settings.StartOnKind.LastGamePlayed]: 'Last Game Played',
    [settings.StartOnKind.SpecificGame]: 'Specific Game',
  };

  let done = false;

  let startOn = await userSettings.startOn();
  let maybeGame: undefined | db.games.ExtendedGamesRow;
  while (!done) {
    if (startOn.kind === settings.StartOnKind.SpecificGame) {
      maybeGame = await db.games.getExtended(startOn.game);
    }

    done = await osd.textMenu({
      back: true,
      title: 'Startup Options',
      items: [
        {
          label: 'Start on:',
          marker: labels[startOn.kind],
          select: async item => {
            // Cannot select specific game from this menu.
            const keys = Object.keys(labels);
            let kind = keys[(keys.indexOf(startOn.kind) + 1) % keys.length] as settings.StartOnKind;

            switch (kind) {
              case settings.StartOnKind.SpecificGame:
                const g = maybeGame ?? (await db.games.first());
                if (g) {
                  maybeGame = g;
                  startOn = { kind, game: g.id };
                } else {
                  while (kind === settings.StartOnKind.SpecificGame) {
                    kind = keys[(keys.indexOf(kind) + 1) % keys.length] as settings.StartOnKind;
                  }
                  startOn = { kind };
                }
                break;
              default:
                startOn = { kind };
                break;
            }

            item.marker = labels[startOn.kind];
            await userSettings.setStartOn(startOn);
            console.log('Start on:', JSON.stringify(await userSettings.startOn()));
            return false;
          },
        },
        ...(startOn.kind === settings.StartOnKind.SpecificGame
          ? [
              {
                label: '  ',
                marker: maybeGame?.name ?? '',
                select: async (item: osd.TextMenuItem<boolean>) => {
                  const game = await pickGame({
                    title: 'Select a game',
                  });
                  if (game) {
                    maybeGame = game;
                    startOn = { kind: settings.StartOnKind.SpecificGame, game: game.id };
                    await userSettings.setStartOn(startOn);
                    item.marker = game.name;
                  }
                },
              },
            ]
          : []),
      ],
    });
  }
}

export async function uiSettingsMenu() {
  await assert.user.isAdmin();

  const s = await settings.GlobalSettings.create();
  await osd.textMenu({
    title: 'UI Settings',
    back: 0,
    items: [
      {
        label: 'Show FPS',
        marker: (await s.getShowFps()) ? 'On' : 'Off',
        select: async item => {
          item.marker = (await s.toggleShowFps()) ? 'On' : 'Off';
        },
      },
      {
        label: 'Font Size',
        marker: FONT_SIZE_LABELS[await s.getFontSize()],
        select: async item => {
          item.marker = FONT_SIZE_LABELS[await s.toggleFontSize()];
        },
      },
      {
        label: 'Toolbar Date Format',
        marker: DATETIME_FORMAT_LABELS[await s.getDatetimeFormat()],
        select: async item => {
          item.marker = DATETIME_FORMAT_LABELS[await s.toggleDatetimeFormat()];
        },
      },
      {
        label: 'Invert Toolbar',
        marker: (await s.getInvertToolbar()) ? 'On' : 'Off',
        select: async item => {
          item.marker = (await s.toggleInvertToolbar()) ? 'On' : 'Off';
        },
      },
    ],
  });

  return false;
}

async function setTimezone() {
  const s = await settings.GlobalSettings.create();
  return await osd.textMenu({
    title: 'Pick a Timezone',
    back: null,
    items: [
      ...oneFpgaSettings.listTimeZones().map(tz => ({
        label: tz,
        select: async () => {
          await s.setTimeZone(tz);
          return tz;
        },
      })),
    ],
  });
}

interface DateTimeMenuValues {
  title: string;
  value: string;

  choices(): string[];
}

/**
 * Show a series of menus to set the date or time.
 * @param values The list of values to set.
 * @returns Whether the user completed the menu (or false if cancelled).
 */
async function setDateTimeUi(values: DateTimeMenuValues[]): Promise<boolean> {
  let i = 0;
  while (i < values.length) {
    const menu = values[i];
    const choices = menu.choices();
    const currentValue = choices.indexOf(menu.value);
    const pick = await osd.textMenu({
      title: menu.title,
      back: -1,
      highlighted: currentValue == -1 ? 0 : currentValue,
      items: [
        ...menu.choices().map(choice => ({
          label: choice,
          select: async () => {
            menu.value = choice;
            return 0;
          },
        })),
      ],
    });

    if (pick === -1) {
      if (i === 0) {
        return false;
      }
      i--;
    } else {
      i++;
    }
  }
  return true;
}

async function setDateMenu() {
  let date = new Date();
  const completed = await setDateTimeUi([
    {
      get title() {
        return `Year (____-${date.getMonth() + 1}-${date.getDate()})`;
      },
      get value() {
        return date.getFullYear().toString();
      },
      set value(value) {
        date.setFullYear(parseInt(value, 10));
      },
      choices: () =>
        Array.from({ length: 100 }, (_, i) => (date.getFullYear() + i - 50).toString()),
    },
    {
      get title() {
        return `Month (${date.getFullYear()}-__-${date.getDate()})`;
      },
      get value() {
        return (date.getMonth() + 1).toString();
      },
      set value(value) {
        date.setMonth(parseInt(value, 10) - 1);
      },
      choices: () => Array.from({ length: 12 }, (_, i) => (i + 1).toString()),
    },
    {
      get title() {
        return `Day (${date.getFullYear()}-${date.getMonth() + 1}-__)`;
      },
      get value() {
        return date.getDate().toString();
      },
      set value(value) {
        date.setDate(parseInt(value, 10));
      },
      choices: () => {
        const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
        return Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString());
      },
    },
  ]);

  if (completed) {
    oneFpgaSettings.setDateTime(date);
    return date;
  } else {
    return null;
  }
}

async function setTimeMenu() {
  let date = new Date();
  const completed = await setDateTimeUi([
    {
      get title() {
        return `Hour (__:${date.getMinutes()}:${date.getSeconds()})`;
      },
      get value() {
        return date.getHours().toString();
      },
      set value(value) {
        date.setHours(parseInt(value, 10));
      },
      choices: () => {
        return Array.from({ length: 24 }, (_, i) => i.toString());
      },
    },
    {
      get title() {
        return `Minutes (${date.getHours()}:__:${date.getSeconds()})`;
      },
      get value() {
        return date.getMinutes().toString();
      },
      set value(value) {
        date.setMinutes(parseInt(value, 10));
      },
      choices: () => {
        return Array.from({ length: 60 }, (_, i) => i.toString());
      },
    },
    {
      get title() {
        return `Seconds (${date.getHours()}:${date.getMinutes()}:__)`;
      },
      get value() {
        return date.getSeconds().toString();
      },
      set value(value) {
        date.setSeconds(parseInt(value, 10));
      },
      choices: () => {
        return Array.from({ length: 60 }, (_, i) => i.toString());
      },
    },
  ]);

  if (completed) {
    oneFpgaSettings.setDateTime(date);
    return date;
  } else {
    return null;
  }
}

async function settingsMenuDateTime() {
  await assert.user.isAdmin();

  const s = await settings.GlobalSettings.create();
  while (true) {
    const type = await s.getDateTimeUpdate();
    const d = new Date();
    let items: osd.TextMenuItem<any>[] = [];
    if (type !== settings.DatetimeUpdate.Automatic) {
      items.push({
        label: 'Set TimeZone...',
        marker: await s.getTimeZone(oneFpgaSettings.getTimeZone() ?? 'UTC'),
        select: async (item: osd.TextMenuItem<undefined>) => {
          const newTZ = await setTimezone();
          if (newTZ !== null) {
            item.marker = newTZ;
            await s.setTimeZone(newTZ);
          }
        },
      });
    }
    if (type === settings.DatetimeUpdate.Manual) {
      items.push(
        {
          label: 'Set Date',
          marker: `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`,
          select: async item => {
            const n = await setDateMenu();
            if (n) {
              item.marker = `${n.getFullYear()}-${n.getMonth() + 1}-${n.getDate()}`;
            }
          },
        },
        {
          label: 'Set Time',
          marker: `${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}`,
          select: async item => {
            const n = await setTimeMenu();
            if (n) {
              item.marker = `${n.getHours()}:${n.getMinutes()}:${n.getSeconds()}`;
            }
          },
        },
      );
    }

    let marker;
    switch (type) {
      case settings.DatetimeUpdate.Automatic:
        marker = 'Automatic';
        break;
      case settings.DatetimeUpdate.Manual:
        marker = 'Manual';
        break;
      case settings.DatetimeUpdate.AutoWithTz:
        marker = 'Automatic (with TZ)';
        break;
    }

    const result = await osd.textMenu({
      title: 'Date and Time',
      back: 0,
      items: [
        {
          label: 'Update Date and Time',
          marker,
          select: async () => {
            const next =
              type === settings.DatetimeUpdate.Automatic
                ? settings.DatetimeUpdate.AutoWithTz
                : type === settings.DatetimeUpdate.AutoWithTz
                  ? settings.DatetimeUpdate.Manual
                  : settings.DatetimeUpdate.Automatic;
            await s.setDateTimeUpdate(next);
            return 1;
          },
        },
        ...items,
      ],
    });
    if (result === 0) {
      break;
    }
  }

  return false;
}

export async function settingsMenu() {
  const u = user.User.loggedInUser(true);
  const s = await settings.UserSettings.forLoggedInUser();
  const globals = await settings.GlobalSettings.create();
  let reloadMainMenu = false;

  await osd.textMenu({
    back: 0,
    title: 'Settings',
    items: [
      ...(u.admin
        ? [
            {
              label: 'Network...',
              select: async () => {
                await networkSettingsMenu();
              },
            },
            {
              label: 'UI...',
              select: async () => {
                if (await uiSettingsMenu()) {
                  reloadMainMenu = true;
                }
              },
            },
            {
              label: 'Date and Time...',
              select: async () => {
                if (await settingsMenuDateTime()) {
                  reloadMainMenu = true;
                }

                await (await settings.GlobalSettings.create()).updateDateTimeIfNecessary();
              },
            },
            {
              label: 'Check for Updates',
              marker: UPDATE_FREQUENCY_LABELS[await globals.getCatalogCheckFrequency()],
              select: async (item: osd.TextMenuItem<any>) => {
                item.marker = UPDATE_FREQUENCY_LABELS[await globals.toggleCatalogCheckFrequency()];
              },
            },
          ]
        : []),
      {
        label: 'Accounts...',
        select: async () => {
          reloadMainMenu = reloadMainMenu || (await accountsSettingsMenu());
        },
      },
      '---',
      {
        label: 'Shortcuts...',
        select: shortcutsMenu,
      },
      {
        label: 'Startup Options...',
        select: async () => await startOptionsMenu(s),
      },
      '-',
      {
        label: 'Developer Tools',
        marker: (await s.getDevTools()) ? 'On' : 'Off',
        select: async item => {
          await s.toggleDevTools();
          item.marker = (await s.getDevTools()) ? 'On' : 'Off';
          reloadMainMenu = true;
        },
      },
      {
        label: 'Video',
        select: async () => {
          await selectVideoMode();
        },
      },
    ],
  });

  return reloadMainMenu ? true : undefined;
}
