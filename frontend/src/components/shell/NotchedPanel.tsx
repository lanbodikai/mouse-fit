"use client";

import type { ReactNode } from "react";

type NotchedPanelProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

const NOTCHED_PATH =
  "M0.5 20.9865V535.648L45.1018 559.632H305.196L356.312 610.599V726.023L386.882 760.5H1069.44L1095.5 726.023V57.4625C1095.5 57.4625 1054.91 0.49999 1034.86 0.5H774.768L717.637 57.4625H492.122L441.507 0.5H29.0652L0.5 20.9865Z";

export default function NotchedPanel({ children, className, contentClassName }: NotchedPanelProps) {
  return (
    <section className={`notched-panel ${className ?? ""}`}>
      <div className="notched-panel__surface" aria-hidden="true" />
      <svg
        className="pointer-events-none absolute inset-0 z-[3] h-full w-full"
        viewBox="0 0 1096 761"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d={NOTCHED_PATH} fill="none" stroke="rgba(255,255,255,0.10)" strokeLinejoin="round" />
      </svg>
      <div className={`notched-panel__content ${contentClassName ?? ""}`}>{children}</div>
    </section>
  );
}
