import { Dispatch, SetStateAction, useSyncExternalStore } from 'react';

/**
 * A global store that can be used across
 */
export interface GlobalStore<T> {
  subscribe(listener: () => void): () => void;

  set(newValue: T | ((oldValue: T) => T)): void;

  get(): T;

  use(): T;

  useState(): [T, Dispatch<SetStateAction<T>>];
}

/**
 * Create a global store that updates across React roots.
 * @param defaultValue The default value of the store.
 * @param localStorageKey If specified, this will persist the value in localStorage.
 *                        This uses `JSON.stringify` and `JSON.parse` for serialization.
 */
export function createGlobalStore<T>(defaultValue: T, localStorageKey?: string): GlobalStore<T> {
  let value: T = defaultValue;
  if (typeof localStorage === 'undefined') {
    localStorageKey = undefined;
  }

  if (localStorageKey) {
    const maybeValue = localStorage.getItem(localStorageKey);
    if (maybeValue !== null) {
      value = JSON.parse(maybeValue);
    }
  }

  let listeners: (() => void)[] = [];

  function subscribe(fn: () => void) {
    listeners = [...listeners, fn];
    return () => unsubscribe(fn);
  }

  function unsubscribe(fn: () => void) {
    listeners = listeners.filter(l => l !== fn);
  }

  function dispatch() {
    for (let listener of listeners) {
      listener();
    }
  }

  function set(newValue: T | SetStateAction<T>) {
    if (newValue instanceof Function) {
      newValue = newValue(value);
    }
    if (value !== newValue) {
      value = newValue;
      if (localStorageKey) {
        localStorage.setItem(localStorageKey, JSON.stringify(value));
      }
      dispatch();
    }
  }

  function get(): Readonly<T> {
    return value;
  }

  function use(): Readonly<T> {
    return useSyncExternalStore(subscribe, get, get);
  }

  function useState(): [T, Dispatch<SetStateAction<T>>] {
    return [use(), set];
  }

  if (localStorageKey) {
    window.addEventListener('storage', e => {
      if (localStorageKey === e.key && e.storageArea === localStorage) {
        if (e.newValue !== null) {
          set(JSON.parse(e.newValue));
        } else {
          set(defaultValue);
        }
      }
    });
  }

  return {
    subscribe,
    set,
    get,
    use,
    useState,
  };
}
