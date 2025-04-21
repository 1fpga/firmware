import * as zod from 'zod';

export const StartOnSetting = zod.union([
  zod.object({
    kind: zod.enum(['main-menu', 'game-library', 'last-game']),
  }),
  zod.object({
    kind: zod.literal('start-game'),
    game: zod.number(),
  }),
]);

export type StartOnSetting = zod.TypeOf<typeof StartOnSetting>;
