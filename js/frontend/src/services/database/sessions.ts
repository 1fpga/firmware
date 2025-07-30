import { Row } from '1fpga:db';

import { assert, sql } from '@/utils';

export interface SessionsRow extends Row {
  id: number;
  usersId: number;
  gamesId: number;
  startedAt: string;
  secondsPlayed: number;
}

export async function create(user: { id: number }, game: { id: number }): Promise<number> {
  const [{ id }] = await sql<SessionsRow>`
    INSERT INTO Sessions ${sql.insertValues({
      usersId: user.id,
      gamesId: game.id,
    })} RETURNING id`;

  return id;
}

export async function update(id: number, secondsPlayed: number) {
  await sql<SessionsRow>`UPDATE Sessions
                         SET secondsPlayed = ${secondsPlayed}
                         WHERE id = ${id}`;
}
