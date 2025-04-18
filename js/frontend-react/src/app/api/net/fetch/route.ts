export const GET = () => {
  return new Response(null, { status: 403 });
};

// Define the POST request handler function
export async function POST(req: Request) {
  const { url } = await req.json();
  if (!url) {
    throw new Error(`${url} invalid URL`);
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} failed with status code ${response.status}`);
  }

  return new Response(response.body, { status: 200 });
}
