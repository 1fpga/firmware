import * as core from '1fpga:core';

import { StartGameAction } from '@/actions/start_game';
import { db } from '@/services';

interface GameDef {
  gameId: number;
}

export class StartGameCommand extends db.GeneralCommandImpl<GameDef> {
  key = 'startSpecificGame';
  label = 'Launch a specific game';
  category = 'Core';

  validate(v: unknown): v is GameDef {
    return typeof v == 'object' && v !== null && typeof (v as any)['gameId'] == 'number';
  }

  async labelOf(game: GameDef) {
    const g = await db.games.getExtended(game.gameId);
    return `Launch "${g.name}"`;
  }

  async execute(_: core.OneFpgaCore, game: GameDef) {
    const g = await db.games.getExtended(game.gameId);
    throw new StartGameAction(g);
  }
}

export class StartLastPlayedCommand extends db.GeneralCommandImpl {
  key = 'startLastPlayed';
  label = 'Start the last played game';
  category = 'Core';

  async execute() {
    const maybeGame = await db.games.lastPlayedExtended();
    if (maybeGame) {
      throw new StartGameAction(maybeGame);
    }
  }
}

export async function init() {
  await db.Commands.register(StartGameCommand);
  await db.Commands.register(StartLastPlayedCommand);
}
