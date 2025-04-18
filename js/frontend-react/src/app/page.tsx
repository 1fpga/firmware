"use client";

import { useOneFpga } from "@/hooks";
import { Button } from "@/components/ui-kit/button";
import { useRouter } from "next/navigation";

export default function Home() {
  const { start, started } = useOneFpga();
  const router = useRouter();

  if (started) {
    return <div>1FPGA is running...</div>;
  }

  async function doStart() {
    await start();
    router.push("/");
  }

  async function doReset() {
    await fetch("/api/db/resetAll", { method: "POST" });
  }

  return (
    <div>
      <Button onClick={doReset}>Reset DB</Button>
      <Button onClick={doStart}>Start 1FPGA</Button>
    </div>
  );
}
