import "@/polyfills/globals";

/**
 * Load the main function of the frontend and execute it, delayed by 1 msec
 * to let the importmap (and polyfills) load.
 * @constructor
 */
export const Main = () => {
  return (
    <div>
      <button
        onClick={async () => {
          const { main } = await import("@onefpga/frontend");
          await main();
          console.log("done");
        }}
      >
        Click me
      </button>
    </div>
  );
};
