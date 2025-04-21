export function shutdown(): never {
  // This runs in the worker.
  postMessage({ kind: 'shutdown' });
  while (true) {}
}

/**
 * Restart is like shutdown here.
 */
export function restart(): never {
  // This runs in the worker.
  postMessage({ kind: 'shutdown' });
  while (true) {}
}
