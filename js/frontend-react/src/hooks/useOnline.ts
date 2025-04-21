import { createGlobalStore } from '@/utils/client';

export const isOnlineStore = createGlobalStore(true, 'isOnline');

export function useOnline() {
  return isOnlineStore.use();
}

export function isOnline() {
  return isOnlineStore.get();
}

export function setIsOnline(isOnline: boolean) {
  return isOnlineStore.set(isOnline);
}

export function toggleIsOnline() {
  return isOnlineStore.set(x => !x);
}
