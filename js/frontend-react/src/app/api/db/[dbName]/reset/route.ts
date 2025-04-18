import { reset } from "../../database";

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
    await reset(dbName);
    return new Response(null, { status: 200 });
  } catch (e) {
    return new Response(`${e}`, { status: 500 });
  }
};
