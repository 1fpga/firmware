const responses: {
  resolve: (result: any) => void;
  reject: (reason: any) => void;
}[] = [];

addEventListener('message', e => {
  const { kind, id } = e.data as { kind: string; id?: number };

  switch (kind) {
    case 'response': {
      if (id !== undefined) {
        const o = responses[id];
        o && o.resolve(e.data.result);
        delete responses[id];
      }
      return;
    }
    case 'error': {
      if (id !== undefined) {
        const o = responses[id];
        o && o.reject(e.data);
        delete responses[id];
      }
      return;
    }
  }
});

export async function postMessageAndWait(data: any) {
  const { promise, resolve, reject } = Promise.withResolvers<any>();
  const id = responses.push({ resolve, reject }) - 1;

  postMessage({ ...data, id });

  const result = await promise;
  return result;
}
