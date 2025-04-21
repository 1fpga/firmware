import * as core from '1fpga:core';

import { db, settings } from '@/services';

/**
 * A command to set the volume to 0.
 */
export class VolumeMuteCommand extends db.GeneralCommandImpl {
  key = 'volumeMute';
  label = 'Mute volume';
  category = 'Audio';

  private settings_: undefined | settings.UserSettings;

  async execute(core?: core.OneFpgaCore) {
    if (!core) {
      return;
    }
    if (!this.settings_) {
      this.settings_ = await settings.UserSettings.forLoggedInUser();
    }

    const newVolume = 0;
    core.volume = newVolume;
    await this.settings_.setDefaultVolume(newVolume);
  }
}

/**
 * A command to set the volume to 100%.
 */
export class VolumeMaxCommand extends db.GeneralCommandImpl {
  key = 'volumeMax';
  label = 'Max volume (100%)';
  category = 'Audio';

  private settings_: undefined | settings.UserSettings;

  async execute(core?: core.OneFpgaCore) {
    if (!core) {
      return;
    }
    if (!this.settings_) {
      this.settings_ = await settings.UserSettings.forLoggedInUser();
    }

    const newVolume = 1.0;
    core.volume = newVolume;
    await this.settings_.setDefaultVolume(newVolume);
  }
}

/**
 * A command to raise the volume by 10%.
 */
export class VolumeUpCommand extends db.GeneralCommandImpl {
  key = 'volumeUp';
  label = 'Volume up by 10%';
  category = 'Audio';
  default = "'VolumeUp'";

  private settings_: undefined | settings.UserSettings;

  async execute(core?: core.OneFpgaCore) {
    if (!core) {
      return;
    }
    if (!this.settings_) {
      this.settings_ = await settings.UserSettings.forLoggedInUser();
    }

    const volume = core.volume;
    const newVolume = Math.min(1, volume + 0.1);
    core.volume = newVolume;
    await this.settings_.setDefaultVolume(newVolume);
  }
}

/**
 * A command to lower the volume by 10%.
 */
export class VolumeDownCommand extends db.GeneralCommandImpl {
  key = 'volumeDown';
  label = 'Volume down by 10%';
  category = 'Audio';
  default = "'VolumeDown'";

  private settings_: undefined | settings.UserSettings;

  async execute(core?: core.OneFpgaCore) {
    if (!core) {
      return;
    }
    if (!this.settings_) {
      this.settings_ = await settings.UserSettings.forLoggedInUser();
    }

    const volume = core.volume;
    const newVolume = Math.max(0, volume - 0.1);
    core.volume = newVolume;
    await this.settings_.setDefaultVolume(newVolume);
  }
}

export async function init() {
  await db.Commands.register(VolumeMuteCommand);
  await db.Commands.register(VolumeMaxCommand);
  await db.Commands.register(VolumeUpCommand);
  await db.Commands.register(VolumeDownCommand);
}
