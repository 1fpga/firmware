'use server';

import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function initFilesystem() {
  const root = process.env['FS_ROOT'] ?? './.next/fs';
  if (fsSync.existsSync(root)) {
    return root;
  }

  await fs.mkdir(path.join(root, 'media/fat'), { recursive: true });
  const mounts = process.env['FS_MOUNT'] ?? '';
  for (const m of mounts.split(':')) {
    console.log('mount', m, path.join(root, 'media/fat/'));

    await fs.symlink(m, path.join(root, 'media/fat', path.basename(m)));
  }

  return root;
}

export async function pathOf(p: string): Promise<string> {
  const root = await initFilesystem();
  p = path.isAbsolute(p) ? path.join(root, p) : path.join(root, 'media/fat', p);
  try {
    return await fs.realpath(p);
  } catch (err) {
    return p;
  }
}
