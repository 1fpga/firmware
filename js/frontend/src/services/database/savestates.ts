import * as fs from '1fpga:fs';

import * as user from '@/services/user';
import { sql } from '@/utils';

import { ExtendedGamesRow } from './games';

interface SavestatesRow {
  id: number;
  coresId: number;
  gamesId: number;
  usersId: number;
  statePath: string;
  screenshotPath: string;
  createdAt: Date;
}

export async function create(game: ExtendedGamesRow, bytes: Uint8Array, screenshot: Image) {
  const u = user.User.loggedInUser(true);
  const statePath = `/media/fat/1fpga/savestates/${u.id}/${game.systemName}/${game.name} ${Date.now()}.ss`;
  const screenshotPath = `/media/fat/1fpga/savestates/${u.id}/${game.systemName}/${game.name} ${Date.now()}.png`;

  await fs.writeFile(statePath, bytes);
  await screenshot.save(screenshotPath);

  const [row] = await sql<SavestatesRow>`INSERT INTO Savestates ${sql.insertValues({
    coresId: game.coresId,
    gamesId: game.id,
    usersId: 0,
    statePath,
    screenshotPath,
  })}
                                           RETURNING *`;
  return row;
}
