import * as ui from "@:golem/ui";
import { User } from "../services/user";
import { getDb } from "../services/database";

export async function login(): Promise<User | null> {
  let db = await getDb();
  let allUsers = await db.query("SELECT * FROM users");

  // Check if there's no user in the database. If so, return null.
  if (allUsers.length === 0) {
    return null;
  }

  // Check if there's only 1 user in the database.
  if (allUsers.length === 1) {
    return await User.login("" + allUsers[0].username);
  }

  // If there are multiple users, prompt the user to select one.
  let user: User | null = null;

  while (user === null) {
    user = await ui.textMenu({
      title: "Select User",
      items: allUsers.map((u) => ({
        label: "" + u.username,
        marker: u.password ? ">>" : "",
        select: async () => {
          return await User.login("" + u.username);
        },
      })),
    });
  }
  return user;
}
