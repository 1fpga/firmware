import { connect } from "@/utils";

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
  const db = await connect(dbName);

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
    return new Response(`${e}`, { status: 500 });
  }
};
