import * as fs from 'node:fs/promises';

import { pathOf } from '@/utils/server/filesystem';

export const GET = () => {
  return new Response(null, { status: 403 });
};

// Define the POST request handler function
export const POST = async (req: Request) => {
  try {
    const { path: inPath }: { path: string[] } = await req.json();
    const sizes = await Promise.all(
      inPath.map(async p => {
        const stat = await fs.stat(await pathOf(p));
        return stat.size;
      }),
    );
    return Response.json(sizes);
  } catch (e) {
    return new Response(`${e}`, { status: 500 });
  }
};
