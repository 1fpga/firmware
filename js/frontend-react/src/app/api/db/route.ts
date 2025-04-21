import { connect } from './database';

export const GET = () => {
  return new Response(null, { status: 403 });
};

// Define the POST request handler function
export const POST = async (req: Request) => {
  try {
    const reqJson = await req.json();
    const { db: path, query, bindings, mode } = reqJson;
    const db = await connect(path);

    if (query === undefined) {
      return new Response('No query specified', {
        status: 400,
      });
    } else if (query === '') {
      return Response.json('null');
    }

    switch (mode) {
      case 'exec': {
        await db.exec(query.toString());
        return Response.json('null');
      }

      case 'run': {
        await db.run(query.toString(), ...(bindings ?? []));

        return Response.json('null');
      }

      case 'many': {
        for (const b of bindings ?? []) {
          await db.run(query.toString(), ...(b ?? []));
        }

        return Response.json('null');
      }

      case 'get': {
        const result = await db.get(query.toString(), ...(bindings ?? []));
        // Return the items as a JSON response with status 200
        return Response.json([result]);
      }

      default:
      case 'query': {
        const result = await db.all(query.toString(), ...(bindings ?? []));
        // Return the items as a JSON response with status 200
        return Response.json(result);
      }
    }
  } catch (e) {
    return new Response(`${e}`, { status: 500 });
  }
};
