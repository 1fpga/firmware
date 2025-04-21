import * as core from '1fpga:core';
import * as fs from '1fpga:fs';

import { showOsd } from '@/services/core';
import { Commands, CoreCommandImpl } from '@/services/database/commands';
import * as screenshots from '@/services/database/screenshots';
import * as launch from '@/services/launch';
import { User } from '@/services/user';

export class ShowCoreMenuCommand extends CoreCommandImpl {
  key = 'showCoreMenu';
  label = "Show the core's menu";
  category = 'Core';
  default = ["'F12'", 'Guide'];

  // This is used to prevent the menu from being shown multiple times.
  shown = false;

  async execute(core: core.OneFpgaCore) {
    if (!this.shown) {
      try {
        const coreDb = launch.running().core;
        await showOsd(core, coreDb);
      } finally {
        this.shown = false;
      }
    }
  }
}

export class QuitCoreCommand extends CoreCommandImpl {
  key = 'quitCore';
  label = 'Quit the core and return to the main menu';
  category = 'Core';
  default = "'F10'";

  execute(core: core.OneFpgaCore) {
    core.quit();
  }
}

export class ShowDebugLogCommand extends CoreCommandImpl {
  key = 'showDebugLog';
  label = 'Show a debug log';
  category = 'Developer';
  default = "Ctrl + 'D'";

  execute() {
    console.log('Debug log.');
  }
}

export class ScreenshotCommand extends CoreCommandImpl {
  key = 'screenshot';
  label = 'Take a screenshot';
  category = 'Core';
  default = "'SysReq'";

  async execute(core: core.OneFpgaCore) {
    // Verify we have a logged-in user.
    const game = launch.running().game;
    if (!game) {
      console.error('No game running.');
      return;
    }
    try {
      const user = User.loggedInUser(true);
      const dir = `/media/fat/1fpga/screenshots/${user.username}/${game.systemName}`;
      const path = `${dir}/${game.name} ${Date.now()}.png`;
      await fs.mkdir(dir, true);

      const screenshot = await core.screenshot();
      await screenshot.save(path);
      await screenshots.create(game, path);
      console.debug('Done saving screenshot');
    } catch (e) {
      console.error('Failed to take a screenshot.', e);
    }
  }
}

export async function init() {
  await Commands.register(ShowCoreMenuCommand);
  await Commands.register(QuitCoreCommand);
  await Commands.register(ShowDebugLogCommand);
  await Commands.register(ScreenshotCommand);
}
