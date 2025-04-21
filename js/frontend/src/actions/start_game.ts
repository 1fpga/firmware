import { db } from '@/services';

export class StartGameAction {
  constructor(public readonly game: db.games.ExtendedGamesRow) {}
}
