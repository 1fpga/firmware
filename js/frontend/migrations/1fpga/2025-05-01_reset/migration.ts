import { SqlTag } from '@sqltags/core';
import { oneLine } from 'common-tags';

import * as osd from '1fpga:osd';

import { resetAll } from '@/utils';

export async function post(_: SqlTag<unknown, unknown>, { initial }: { initial: boolean }) {
  if (initial) {
    return;
  }

  await osd.alert(
    '1FPGA must be reset',
    oneLine`
      A breaking change occurred that makes all database information invalid.
      This includes identified games, users and settings.
      You will have to restart the first time setup again.
      Things will be smoother from now on.
  `,
  );

  await resetAll(true);
}
