import { postMessageAndWait } from "@/utils/worker/postMessageAndWait";

export async function isOnline() {
  return await postMessageAndWait({ kind: "net.isOnline" });
}

export async function fetchJson(url: string): Promise<any> {
  if (!await isOnline()) {
    throw new Error("Not online.");
  }

  const result = await fetch("/api/net/fetch", {
    method: "POST",
    body: JSON.stringify({
      url,
    }),
  });

  if (result.ok) {
    return await result.json();
  } else {
    throw new Error(`Failed to fetch json: ${result.statusText}`);
  }
}

export async function download(
  url: string,
  destination?: string,
): Promise<string> {
  if (!await isOnline()) {
    throw new Error("Not online.");
  }

  const result = await fetch("/api/net/download", {
    method: "POST",
    body: JSON.stringify({
      url,
      destination,
    }),
  });

  if (result.ok) {
    return await result.text();
  } else {
    throw new Error(`Failed to fetch json: ${result.statusText}`);
  }
}

export function interfaces() {
  return {};
}
