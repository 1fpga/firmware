import { resetAll } from "../db/database";
import * as fs from "node:fs/promises";
import { pathOf } from "@/utils/server/filesystem";

export const GET = () => {
  return new Response(null, { status: 403 });
};

// Define the POST request handler function
export async function POST() {
  try {
    // First, delete all files.
    await fs.rm(await pathOf("/"), { recursive: true });
    // Then, delete all databases.
    await resetAll();
    return new Response(null, { status: 200 });
  } catch (e) {
    return new Response(`${e}`, { status: 500 });
  }
}
