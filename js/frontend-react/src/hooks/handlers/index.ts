import { isOnline, register } from '@/hooks';

import * as osd from './osd';

export function registerHandlers() {
  osd.registerHandlers();

  register('net.isOnline', async () => {
    return isOnline();
  });
}
