import { isOnline as isOnlineSetting } from "@/hooks";

export function isOnline() {
  return isOnlineSetting();
}

export async function fetchJson(url: string): Promise<any> {
  if (!isOnlineSetting()) {
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
  if (!isOnlineSetting()) {
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

export function interfaces() {}
