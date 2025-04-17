"use client";

import { useEffect } from "react";
import { useOneFpga, useView } from "@/hooks";
import { createRoot } from "react-dom/client";
import { useRouter } from "next/navigation";

export default function Osd() {
  const view = useView("osd");
  const { started } = useOneFpga();
  const router = useRouter();

  useEffect(() => {
    const el$ = document.getElementById("main-osd");
    if (!el$) {
      throw new Error("Could not find DOM element for OSD");
    }
    const root = createRoot(el$);
    root.render(view?.render());

    return () => root.unmount();
  });

  // if (!started) {
  //   router.push("/");
  //   return;
  // }

  return <div id="main-osd" />;
}
