import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { pathOf } from '@/utils/server/filesystem';

import { resetAll } from '../db/database';

export const GET = () => {
  return new Response(null, { status: 403 });
};

// Define the POST request handler function
export async function POST() {
  // Calling `fs.rm(..., { recursive: true })` leads to deleting
  // content of symlinks. We don't want that.
  async function rm(dir: string) {
    await Promise.all(
      (await fs.readdir(dir)).map(async name => {
        const p = path.join(dir, name);
        const stat = await fs.lstat(p);

        if (stat.isDirectory() && !stat.isSymbolicLink()) {
          await rm(p);
        } else {
          await fs.rm(p);
        }
      }),
    );
    await fs.rmdir(dir);
  }

  try {
    await resetAll();

    // First, delete everything.
    await rm(await pathOf('/'));

    return new Response('');
  } catch (e) {
    return new Response(`${e}`, { status: 500 });
  }
}
