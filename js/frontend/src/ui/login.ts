import * as osd from '1fpga:osd';

import * as services from '@/services';
import { sql } from '@/utils';

interface UserRow {
  username: string;
  password: string | null;
}

export async function login(): Promise<services.user.User | null> {
  const rows = await sql<UserRow>`SELECT *
                                  FROM users`;

  // Check if there's no user in the database. If so, return null.
  if (rows.length === 0) {
    return null;
  }

  // Check if there's only 1 user in the database.
  if (rows.length === 1) {
    return await services.user.User.login('' + rows[0].username);
  }

  // If there are multiple users, prompt the user to select one.
  let user: services.user.User | null = null;

  while (user === null) {
    user = await osd.textMenu({
      title: 'Select User',
      items: rows.map(u => ({
        label: '' + u.username,
        marker: u.password ? '>>' : '',
        select: async () => {
          return await services.user.User.login('' + u.username);
        },
      })),
    });
  }
  return user;
}
