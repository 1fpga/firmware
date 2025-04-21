import * as fs from 'node:fs/promises';

import { pathOf } from '@/utils/server/filesystem';

export const GET = () => {
  return new Response(null, { status: 403 });
};

// Define the POST request handler function
export const POST = async (req: Request) => {
  try {
    const { path: p, recursive } = await req.json();
    const path = await pathOf(p);

    if (recursive === true) {
      await fs.rm(path, { recursive: true });
    } else {
      await fs.rmdir(path);
    }
  } catch (e) {
    return new Response(`${e}`, { status: 500 });
  }
};
