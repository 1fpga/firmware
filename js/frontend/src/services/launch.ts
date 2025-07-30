import * as oneFpgaCore from '1fpga:core';

import { showOsd } from '@/services/core';
import * as db from '@/services/database';
import { User } from '@/services/user';
import { assert } from '@/utils';

let sessionId: NodeJS.Timeout | undefined;

let runningGame: db.games.ExtendedGamesRow | null = null;

let runningCore: db.cores.CoreRow | null = null;

export function running() {
  return { game: runningGame, core: runningCore };
}

/**
 * Options when starting a core.
 */
export interface CoreOptions {
  /**
   * Show the OSD menu when the core starts.
   */
  menu?: boolean;
}

/**
 * Launch a core, and the core loop. Does not show the menu.
 */
export async function core(coreRow: db.cores.CoreRow | string, { menu = false }: CoreOptions = {}) {
  const path = typeof coreRow === 'string' ? coreRow : coreRow.rbfPath;
  assert.not.null_(path, 'Core does not have an RBF path');

  try {
    console.log(`Starting core: ${JSON.stringify(coreRow)}`);
    runningCore = typeof coreRow !== 'string' ? coreRow : null;
    const c = await oneFpgaCore.load({
      core: { type: 'Path', path },
    });

    const settings = await (
      await import('@/services/settings/user')
    ).UserSettings.forLoggedInUser();

    c.volume = await settings.defaultVolume();
    if (menu) {
      await showOsd(c, runningCore);
    }
    await c.loop();
  } finally {
    runningCore = null;
  }
}

/**
 * Launch a game.
 * @param gameRow
 */
export async function game(gameRow: db.games.ExtendedGamesRow) {
  console.log('Launching game: ', JSON.stringify(db));

  // Insert last played time at.
  await db.games.setLastPlayedAt(gameRow, new Date());

  const user = User.loggedInUser(true);
  const settings = await (await import('@/services/settings/user')).UserSettings.forLoggedInUser();

  try {
    runningCore = await db.cores.getById(gameRow.coresId);
    runningGame = gameRow;

    const c = await oneFpgaCore.load({
      core: { type: 'Path', path: gameRow.rbfPath },
      ...(gameRow.romPath ? { game: { type: 'RomPath', path: gameRow.romPath } } : {}),
    });

    c.volume = await settings.defaultVolume();
    c.on('saveState', async (savestate: Uint8Array, screenshot: Image) => {
      const ss = db.savestates.create(gameRow, savestate, screenshot);
      console.log('Saved state: ', JSON.stringify(ss));
    });

    if (sessionId) {
      clearInterval(sessionId);
      sessionId = undefined;
    }
    // Start recording the session.
    const id = await db.sessions.create(user, gameRow);
    const start = Date.now();
    sessionId = setInterval(() => {
      db.sessions.update(id, Math.floor((Date.now() - start) / 1000));
    }, 1000);

    await c.loop();
  } finally {
    if (sessionId) {
      clearInterval(sessionId);
      sessionId = undefined;
    }
    runningGame = null;
    runningCore = null;
  }
}
