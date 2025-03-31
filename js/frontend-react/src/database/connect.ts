import { verbose } from "sqlite3";

const sqlite3 = verbose();

// Connecting to or creating a new SQLite database file
export const db = new sqlite3.Database(
  "./1fpga.sqlite",
  sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
  (err) => {
    if (err) {
      console.error(err.message);
      throw err;
    }
    console.log("Connected to the SQlite database.");
  },
);
