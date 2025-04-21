import { sql } from '@/utils';

import { User } from '../user';
import { ExtendedGamesRow } from './games';

interface ScreenshotRow {
  id: number;
  gamesId: number;
  path: string;
  createdAt: Date;
}

export interface LookupScreenshotOptions {
  game?: ExtendedGamesRow;
}

export async function list(game?: ExtendedGamesRow): Promise<ScreenshotRow[]> {
  return await sql<ScreenshotRow>`SELECT *
                                  FROM Screenshots ${
                                    game &&
                                    sql`WHERE gamesId =
                                    ${game.id}`
                                  }`;
}

/**
 * Save a screenshot to the database.
 * @param game
 * @param path
 */
export async function create(
  game: {
    id: number;
    name: string;
    systemName: string;
  },
  path: string,
): Promise<ScreenshotRow> {
  const user = User.loggedInUser(true);
  const [row] = await sql<ScreenshotRow>`INSERT INTO Screenshots ${sql.insertValues({
    gamesId: game.id,
    path,
    usersId: user.id,
  })}
                                           RETURNING *`;

  return row;
}

export async function count() {
  const user = User.loggedInUser(true);
  const [{ count }] = await sql<{ count: number }>`SELECT COUNT(*) as count
                                                   FROM Screenshots
                                                   WHERE usersId = ${user.id}`;

  return count;
}
