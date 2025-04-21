import * as fs from "node:fs/promises";
import { pathOf } from "@/utils/server/filesystem";
import path from "node:path";

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
  const dst =
    destination ??
    `/downloads/${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const canonDest = await pathOf(dst);
  const bytes = await response.arrayBuffer();
  await fs.mkdir(path.dirname(canonDest), { recursive: true });
  await fs.writeFile(canonDest, Buffer.from(bytes));

  return new Response(dst, { status: 200 });
}
