import { createGlobalStore } from "@/utils/client";
import { registerHandlers } from "@/hooks/handlers";

export enum OneFpgaWorkerState {
  Stopped = 0,
  Starting = 1,
  Started = 2,
  Stopping = 3,
}

export interface OneFpgaWorker {
  state: OneFpgaWorkerState;
  worker: Worker | null;

  register<T extends { kind: string }>(kind: string, handler: (data: T) => Promise<any>): void;

  send<T extends { kind: string; id: never }>(data: T): Promise<any>;
}

const workerStore = createGlobalStore<OneFpgaWorker>({
  state: OneFpgaWorkerState.Stopped,
  worker: null,
  register,
  send,
});

let handlerRegistry: Record<string, <T extends { kind: string }>(data: T) => Promise<any>> = {};
let responses: { resolve: (result: any) => void; reject: (reason: any) => void }[] = [];

export function register(kind: string, handler: (data: any) => Promise<any>) {
  if (kind in handlerRegistry) {
    console.error(`Handler for kind "${kind}" already registered`);
  }
  handlerRegistry[kind] = handler;
}

export async function send<T extends { kind: string; id: never }>(data: T): Promise<any> {
  const worker = workerStore.get().worker;
  if (!worker) {
    throw new Error("Worker not running...");
  }

  const { promise, resolve, reject } = Promise.withResolvers<any>();
  const id = responses.push({ resolve, reject }) - 1;
  worker.postMessage({ ...data, id });
  return await promise;
}

async function startInner() {
  const worker = new Worker(new URL("../workers/OneFpga", import.meta.url));

  worker.addEventListener("message", async e => {
    const { kind, id } = e.data as { kind: string; id?: number };

    switch (kind) {
      case "started":
        workerStore.set(w => w && ({ ...w, state: OneFpgaWorkerState.Started }));
        return;
      case "response": {
        if (id !== undefined) {
          const o = responses[id];
          o && o.resolve(e.data);
          delete responses[id];
        }
        return;
      }
      case "error": {
        if (id !== undefined) {
          const o = responses[id];
          o && o.reject(e.data);
          delete responses[id];
        }
        return;
      }
      default: {
        const handler = handlerRegistry[kind];
        if (!handler) {
          throw new Error(`Kind "${kind}" has no handler`);
        }

        const result = await handler(e.data);
        console.log("startInner response:", { kind: "response", id, result });
        worker.postMessage({ kind: "response", id, result });
        return;
      }
    }
  });
  worker.addEventListener("error", e => {
    console.error("Error from the worker:", e.message);
  });

  registerHandlers();

  workerStore.set({ worker, state: OneFpgaWorkerState.Starting, register, send });
  console.log(":. 1FPGA Started");
}

async function start() {
  if (workerStore.get().state === OneFpgaWorkerState.Stopped) {
    await startInner();
  }

  const worker = workerStore.get();
  if (!worker) {
    throw new Error("Worker not found.");
  }
}

async function stop() {
  const worker = workerStore.get();
  if (!worker) {
    return;
  }
  workerStore.set(w => ({ ...w, state: OneFpgaWorkerState.Stopping }));

  worker.worker?.terminate();
  workerStore.set(w => ({ ...w, worker: null, state: OneFpgaWorkerState.Stopped }));
  responses = [];
  handlerRegistry = {};
}

export function useOneFpga() {
  const worker = workerStore.use();

  return {
    started: worker?.state === OneFpgaWorkerState.Started,
    start,
    stop,
  };
}
