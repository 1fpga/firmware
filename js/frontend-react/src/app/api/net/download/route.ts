import * as fs from 'node:fs/promises';
import path from 'node:path';

import { pathOf } from '@/utils/server/filesystem';

export const GET = () => {
  return new Response(null, { status: 403 });
};

// Define the POST request handler function
export async function POST(req: Request) {
  const { url, destination } = await req.json();
  if (!url) {
    throw new Error(`${url} invalid URL`);
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} failed with status code ${response.status}`);
  }

  // Save the file.
  const fileNameHeader = response.headers
    .get('Content-Disposition')
    ?.split(';')
    .find(s => s.startsWith('filename='));
  const fileName = fileNameHeader ? JSON.parse(fileNameHeader) : path.basename(url);

  const dst = destination
    ? path.join(destination, fileName)
    : `/downloads/${Date.now()}-${Math.random().toString(36).slice(2)}-${fileName}`;
  const canonDest = await pathOf(dst);
  const bytes = await response.arrayBuffer();
  await fs.mkdir(path.dirname(canonDest), { recursive: true });
  await fs.writeFile(canonDest, Buffer.from(bytes));

  return new Response(dst);
}
