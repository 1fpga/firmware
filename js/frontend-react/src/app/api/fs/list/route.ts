import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { pathOf } from '@/utils/server/filesystem';

export const GET = () => {
  return new Response(null, { status: 403 });
};

// Define the POST request handler function
export const POST = async (req: Request) => {
  async function walk(root: string, dir: string, recursive: boolean, extensions?: string[]) {
    const fileNames = await fs.readdir(dir);
    const files: [string, boolean, number][] = [];
    for (const name of fileNames) {
      const p = path.relative(root, path.join(dir, name));
      const ext = path.extname(p).slice(1);

      const stat = await fs.stat(path.join(root, p));
      const isDir = stat.isDirectory();

      console.log(extensions, ext);
      if (extensions === undefined || extensions.includes(ext)) {
        files.push([p, isDir, stat.size]);
      }

      if (isDir && recursive) {
        files.push(...(await walk(root, p, recursive)));
      }
    }

    return files;
  }

  try {
    const { dir, recursive, extensions } = await req.json();
    const p = await pathOf(dir);

    if (!(await fs.stat(p)).isDirectory()) {
      return new Response(`Dir ${dir} not a directory`, { status: 400 });
    }

    const allFiles = await walk(p, p, !!recursive, extensions);
    return Response.json(allFiles);
  } catch (e) {
    return new Response(`${e}`, { status: 500 });
  }
};
