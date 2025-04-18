"use client";

import { useEffect, useRef } from "react";
import { useView } from "@/hooks";
import { createRoot, Root } from "react-dom/client";

export default function Osd() {
  const view = useView("osd");
  const viewRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let root: Root;
    const id = setTimeout(() => {
      if (!viewRef.current) {
        throw new Error("Could not find DOM element for OSD");
      }

      root = createRoot(viewRef.current);
      queueMicrotask(() => {
        root.render(view?.render());
      });
    }, 0);

    return () => {
      clearTimeout(id);
      queueMicrotask(() => {
        root?.unmount();
      });
    };
  });

  return <div ref={viewRef} />;
}
