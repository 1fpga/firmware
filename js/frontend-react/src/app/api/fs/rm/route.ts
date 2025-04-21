import * as fs from 'node:fs/promises';

import { pathOf } from '@/utils/server/filesystem';

export const GET = () => {
  return new Response(null, { status: 403 });
};

// Define the POST request handler function
export const POST = async (req: Request) => {
  try {
    const { path: p } = await req.json();
    const path = await pathOf(p);

    if ((await fs.lstat(path)).isFile()) {
      await fs.rm(path);
    } else {
      return new Response(`${path} not a file.`, { status: 500 });
    }
  } catch (e) {
    return new Response(`${e}`, { status: 500 });
  }
};
