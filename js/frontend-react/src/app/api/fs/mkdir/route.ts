import * as fs from 'node:fs/promises';

import { pathOf } from '@/utils/server/filesystem';

export const GET = () => {
  return new Response(null, { status: 403 });
};

// Define the POST request handler function
export const POST = async (req: Request) => {
  try {
    const { path, all } = await req.json();

    if (all === true) {
      await fs.mkdir(await pathOf(path), { recursive: true });
    } else {
      await fs.mkdir(await pathOf(path));
    }
  } catch (e) {
    return new Response(`${e}`, { status: 500 });
  }
};
