import * as fs from 'node:fs/promises';
import nodePath from 'node:path';

import { pathOf } from '@/utils/server/filesystem';

export const GET = () => {
  return new Response(null, { status: 403 });
};

// Define the POST request handler function
export const POST = async (req: Request) => {
  try {
    const { path: p, bytes } = await req.json();
    const path = await pathOf(p);

    if (!bytes || typeof bytes !== 'string' || !bytes.match(/^([0-9a-zA-Z]{2})*$/)) {
      return new Response('body unspecified or incorrect', {
        status: 400,
      });
    }

    const content = Buffer.from(bytes, 'hex');
    console.log(`Writing ${content.length} bytes to ${path}`);
    await fs.mkdir(nodePath.dirname(path), { recursive: true });
    await fs.writeFile(path, content);
    return new Response('');
  } catch (e) {
    return new Response(`${e}`, { status: 500 });
  }
};
