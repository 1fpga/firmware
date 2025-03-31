import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";

// Let's initialize it as null initially, and we will assign the actual database instance later.
let db: Database | null = null;

export const GET = () => {
  return new Response(null, { status: 403 });
};

// Define the POST request handler function
export const POST = async (req: Request) => {
  // Check if the database instance has been initialized
  if (!db) {
    // If the database instance is not initialized, open the database connection
    db = await open({
      filename: "./1fpga.sqlite", // Specify the database file path
      driver: sqlite3.Database, // Specify the database driver (sqlite3 in this case)
    });
  }

  try {
    const { query, params } = await req.json();

    if (!query) {
      return new Response("No query specified", {
        status: 400,
      });
    }

    const result = await db.run(query.toString(), params ?? []);

    // Return the items as a JSON response with status 200
    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    return new Response(e.message, { status: 500 });
  }
};
