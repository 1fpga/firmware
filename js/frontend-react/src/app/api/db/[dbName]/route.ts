import { connect } from "../database";

export const GET = () => {
  return new Response(null, { status: 403 });
};

// Define the POST request handler function
export const POST = async (
  req: Request,
  { params }: { params: Promise<{ dbName: string }> },
) => {
  const dbName = (await params).dbName;
  if (!dbName) {
    throw new Error(`${dbName} invalid DB name`);
  }

  try {
    const db = await connect(dbName);
    const { query, bindings, mode } = await req.json();

    if (!query) {
      return new Response("No query specified", {
        status: 400,
      });
    }

    switch (mode) {
      case "exec": {
        await db.exec(query.toString());
        return new Response("null", {
          headers: { "Content-Type": "application/json" },
          status: 200,
        });
      }

      case "run": {
        await db.run(query.toString(), ...(bindings ?? []));

        return new Response("null", {
          headers: { "Content-Type": "application/json" },
          status: 200,
        });
      }

      case "get": {
        const result = await db.get(query.toString(), ...(bindings ?? []));
        // Return the items as a JSON response with status 200
        return new Response(JSON.stringify([result]), {
          headers: { "Content-Type": "application/json" },
          status: 200,
        });
      }

      default:
      case "query": {
        const result = await db.all(query.toString(), ...(bindings ?? []));
        // Return the items as a JSON response with status 200
        return new Response(JSON.stringify(result), {
          headers: { "Content-Type": "application/json" },
          status: 200,
        });
      }
    }
  } catch (e) {
    return new Response(`${e}`, { status: 500 });
  }
};
