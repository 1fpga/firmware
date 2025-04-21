// This must be the first thing.
import "@/polyfills/globals";

async function main(): Promise<void> {
  const { main } = await import("@1fpga/frontend");

  queueMicrotask(() => postMessage({ kind: "started" }));
  await main();
  console.log(":: done");
}

main().catch(e => {
  console.error(e);
});
