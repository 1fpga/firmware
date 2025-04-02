"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";

export default function Home() {
  const Main = dynamic(() => import("@/components/Main").then((x) => x.Main), {
    ssr: false,
  });

  return (
    <>
      <Suspense fallback={"Please wait..."}>
        <Main />
      </Suspense>
    </>
  );
}
