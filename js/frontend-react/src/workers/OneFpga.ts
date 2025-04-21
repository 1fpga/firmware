let started = false;

async function main(): Promise<void> {
  await import("@/polyfills/globals");

  const { main } = await import("@1fpga/frontend");

  queueMicrotask(() => postMessage({ kind: "started" }));
  await main();
  console.log(":: done");
}

addEventListener("message", (event: MessageEvent) => {
  if (event.data.kind === "start") {
    if (started) {
      throw new Error("Already started.");
    }
    (global as any)["__startupWorkerMessage"] = event.data;

    main().catch((e) => console.error(e));
  }
});
