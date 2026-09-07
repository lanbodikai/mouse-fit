"use client";

import dynamic from "next/dynamic";

const MouseFitSimulatorPage = dynamic(
  () => import("@/features/mouse-fit-simulator/components/MouseFitSimulatorPage"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[calc(100dvh-7rem)] min-h-[620px] items-center justify-center rounded-xl border border-[var(--shell-border-strong)] bg-[#090b0e] text-sm text-[#9ca3ad] md:h-[calc(100dvh-3.5rem)]">
        Preparing Mouse Fit Simulator…
      </div>
    ),
  },
);

export default function MouseFitSimulatorRoute() {
  return <MouseFitSimulatorPage />;
}
