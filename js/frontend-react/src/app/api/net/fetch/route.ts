export const GET = () => {
  return new Response(null, { status: 403 });
};

// Define the POST request handler function
export async function POST(req: Request) {
  const { url } = await req.json();
  if (!url) {
    throw new Error(`Invalid URL provided: ${JSON.stringify(url)}`);
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} failed with status code ${response.status}`);
  }

  return new Response(response.body, { status: 200 });
}
