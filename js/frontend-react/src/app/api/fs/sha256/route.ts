import { createHash } from 'node:crypto';
import * as fs from 'node:fs';

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
        p = await pathOf(p);
        const { promise, resolve, reject } = Promise.withResolvers();
        const hash = createHash('sha256');
        const rs = fs.createReadStream(p);
        rs.on('error', reject);
        rs.on('data', chunk => hash.update(chunk));
        rs.on('end', () => resolve(hash.digest('hex')));

        return promise;
      }),
    );
    return Response.json(sizes);
  } catch (e) {
    return new Response(`${e}`, { status: 500 });
  }
};
