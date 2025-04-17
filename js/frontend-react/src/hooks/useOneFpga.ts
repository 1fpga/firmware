import { createGlobalStore } from "@/utils";
import { main } from "@1fpga/frontend";

const startedStore = createGlobalStore<Promise<void> | undefined>(undefined);

async function startInner() {
  await import("@/polyfills/globals");
  try {
    const result = await main();

    console.log("Main done with result:");
    console.log(result);
  } catch (e) {
    console.log("Main exited with error:");
    console.error(e);
  }

  console.log("----");
}

function start() {
  if (!startedStore.get()) {
    startedStore.set(startInner());
  }

  const p = startedStore.get();
  if (!p) {
    throw new Error("Something wrong happened during startup...");
  }
  return p;
}

export function useOneFpga() {
  const started = !!startedStore.use();

  return {
    started,
    start,
  };
}
