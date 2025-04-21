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
  const body = await response.bytes();
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
  });
}
