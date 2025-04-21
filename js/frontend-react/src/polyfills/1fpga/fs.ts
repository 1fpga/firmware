export async function writeFile(
  path: string,
  data: string | Uint8Array | ArrayBuffer,
): Promise<void> {
  if (data instanceof ArrayBuffer) {
    data = new Uint8Array(data);
  } else if (typeof data === 'string') {
    data = new TextEncoder().encode(data);
  }

  let bytes = Array.from(data, byte => byte.toString(16).padStart(2, '0')).join('');

  const result = await fetch('/api/fs/write', {
    method: 'POST',
    body: JSON.stringify({
      path,
      bytes,
    }),
  });

  if (!result.ok) {
    throw new Error(`Failed to writeFile: ${result.statusText}`);
  }
}

// export function readFile(path: string): Promise<ArrayBuffer>;
//
// export function readTextFile(path: string): Promise<string>;

export async function deleteFile(path: string): Promise<void> {
  const result = await fetch('/api/fs/rm', {
    method: 'POST',
    body: JSON.stringify({ path }),
  });

  if (!result.ok) {
    throw new Error(`Failed to writeFile: ${result.statusText}`);
  }
}

// export function readDir(path: string): Promise<string[]>;
//
// export function isFile(path: string): Promise<boolean>;

export async function mkdir(path: string, all?: boolean): Promise<void> {
  const result = await fetch('/api/fs/mkdir', {
    method: 'POST',
    body: JSON.stringify({ path, all }),
  });

  if (!result.ok) {
    throw new Error(`Failed to writeFile: ${result.statusText}`);
  }
}

export async function rmdir(path: string, recursive?: boolean): Promise<void> {
  const result = await fetch('/api/fs/rmdir', {
    method: 'POST',
    body: JSON.stringify({ path, recursive }),
  });

  if (!result.ok) {
    throw new Error(`Failed to writeFile: ${result.statusText}`);
  }
}

export function isDir(path: string): Promise<boolean> {
  throw new Error('Not implemented');
}

export async function findAllFiles(
  root: string,
  options?: { extensions?: string[] },
): Promise<string[]> {
  const response = await fetch(`/api/fs/list`, {
    method: 'POST',
    body: JSON.stringify({
      dir: root,
      recursive: true,
      extensions: options?.extensions,
    }),
  });
  if (!response.ok) {
    throw new Error(`HTTP error: ${response.statusText}`);
  }
  let all: [string, boolean][] = await response.json();

  const files = all.filter(([_, isDir]) => !isDir).map(([name]) => `${root}/${name}`);
  return files;
}

export function sha256(path: string): Promise<string>;
export function sha256(path: string[]): Promise<string[]>;
export async function sha256(path: string | string[]): Promise<string | string[]> {
  const response = await fetch(`/api/fs/sha256`, {
    method: 'POST',
    body: JSON.stringify({ path: Array.isArray(path) ? path : [path] }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.statusText}`);
  }

  const shas = await response.json();
  if (Array.isArray(path)) {
    return shas;
  } else {
    return shas[0];
  }
}

export function fileSize(path: string): Promise<number>;
export function fileSize(path: string[]): Promise<number[]>;
export async function fileSize(path: string | string[]): Promise<number | number[]> {
  const response = await fetch(`/api/fs/size`, {
    method: 'POST',
    body: JSON.stringify({ path: Array.isArray(path) ? path : [path] }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.statusText}`);
  }

  const shas = await response.json();
  if (Array.isArray(path)) {
    return shas;
  } else {
    return shas[0];
  }
}
