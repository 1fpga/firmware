import { Games } from "./games";
import { User } from "../user";
import * as fs from "1fpga:fs";
import { sql } from "@/utils";

interface ScreenshotRow {
  id: number;
  game_id: number;
  path: string;
  created_at: Date;
}

export class Screenshot {
  private static fromRow(row: ScreenshotRow) {
    return new Screenshot(row);
  }

  public static async list(game?: Games): Promise<Screenshot[]> {
    const rows = await sql<ScreenshotRow>`SELECT *
                                          FROM screenshots ${
      game
        ? sql`WHERE game_id =
                                                          ${game.id}`
        : undefined
    }`;

    return rows.map(Screenshot.fromRow);
  }

  /**
   * Save a screenshot to the database.
   * @param game
   * @param screenshot
   */
  public static async create(
    game: Games,
    screenshot: Image,
  ): Promise<Screenshot> {
    const user = User.loggedInUser(true);
    const screenshot_dir = `/media/fat/1fpga/screenshots/${user.username}/${game.systemName}`;
    const screenshot_path = `${screenshot_dir}/${game.name} ${Date.now()}.png`;
    await fs.mkdir(screenshot_dir, true);

    await screenshot.save(screenshot_path);

    const [row] =
      await sql<ScreenshotRow>`INSERT INTO screenshots ${sql.insertValues({
        game_id: game.id,
        path: screenshot_path,
        user_id: user.id,
      })}
                                   RETURNING *`;

    return Screenshot.fromRow(row);
  }

  static async count() {
    const user = User.loggedInUser(true);
    const [{ count }] = await sql<{ count: number }>`SELECT COUNT(*) as count
                                                     FROM screenshots
                                                     WHERE user_id = ${user.id}`;

    return count;
  }

  private constructor(private readonly row_: ScreenshotRow) {
  }

  public async getGame(): Promise<Games> {
    return await Games.byId(this.row_.game_id);
  }

  public get path() {
    return this.row_.path;
  }

  public get createdAt() {
    return this.row_.created_at;
  }
}
