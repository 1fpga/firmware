import "@/polyfills/globals";
import { use } from "react";

export interface OsdProps {
  id?: string;
}

export function Osd({ id }: OsdProps) {
  return (
    <div className="flex flex-col items-center spacing-">
      <h1>OSD</h1>
      <div id={id} className="border-amber-50 border-2 h-96 w-1/2"></div>
    </div>
  );
}

/**
 * Load the main function of the frontend and execute it, delayed by 1 msec
 * to let the importmap (and polyfills) load.
 * @constructor
 */
export const Main = () => {
  const main = use(import("@1fpga/frontend").then((mod) => mod.main));
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
