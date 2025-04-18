import { resetAll } from "../database";

export const GET = () => {
  return new Response(null, { status: 403 });
};

// Define the POST request handler function
export async function POST() {
  try {
    await resetAll();
    return new Response(null, { status: 200 });
  } catch (e) {
    return new Response(`${e}`, { status: 500 });
  }
}
