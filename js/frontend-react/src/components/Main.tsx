import "@/polyfills/globals";
import { Osd } from "./Osd";
import { use } from "react";

/**
 * Load the main function of the frontend and execute it, delayed by 1 msec
 * to let the importmap (and polyfills) load.
 * @constructor
 */
export const Main = () => {
  const main = use(import("@onefpga/frontend").then((mod) => mod.main));
  const result = main();
  result.then(
    () => console.log("done"),
    (err) => console.error(err),
  );

  return (
    <div>
      <Osd id="main-osd" />
    </div>
  );
};
