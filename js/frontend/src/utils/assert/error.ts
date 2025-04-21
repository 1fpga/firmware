export class AssertionError extends Error {
  constructor(message: string) {
    super(`AssertionError: ${message}`);
  }
}

export function fail(message: string | ((...args: any[]) => string), ...args: any[]): never {
  throw new AssertionError(message instanceof Function ? message(...args) : message);
}
