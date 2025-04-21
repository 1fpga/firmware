import { useSyncExternalStore } from "react";

/**
 * A global store that can be used across
 */
export interface GlobalStore<T> {
  subscribe(listener: () => void): () => void;

  set(newValue: T | ((oldValue: T) => T)): void;

  get(): T;

  use(): T;
}

/**
 * Create a global store that updates across React roots.
 * @param defaultValue The default value of the store.
 */
export function createGlobalStore<T>(defaultValue: T): GlobalStore<T> {
  let value = defaultValue;
  let listeners: (() => void)[] = [];

  function subscribe(fn: () => void) {
    listeners = [...listeners, fn];
    return () => unsubscribe(fn);
  }

  function unsubscribe(fn: () => void) {
    listeners = listeners.filter((l) => l !== fn);
  }

  function dispatch() {
    for (let listener of listeners) {
      listener();
    }
  }

  function set(newValue: T | ((oldValue: T) => T)) {
    if (newValue instanceof Function) {
      newValue = newValue(value);
    }
    if (value !== newValue) {
      value = newValue;
      dispatch();
    }
  }

  function get(): Readonly<T> {
    return value;
  }

  function use(): Readonly<T> {
    return useSyncExternalStore(subscribe, get, get);
  }

  return {
    subscribe,
    set,
    get,
    use,
  };
}
