"use server";

import path from "node:path";

export async function pathOf(p: string): Promise<string> {
  if (path.isAbsolute(p)) {
    return path.join("./.next/fs", p);
  } else {
    return path.join("./.next/fs/media/fat", p);
  }
}
