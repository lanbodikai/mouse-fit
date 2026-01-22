"use client";

import { useMemo } from "react";
import SwipeDeck from "./SwipeDeck";
import { useReportStore } from "@/lib/reportStore";

const demoBest = {
  name: "Logitech G Pro X Superlight 2",
  score: 92,
  size: "medium",
  recommendedGrip: "palm",
  notes: "Balanced feel with a stable rear hump and familiar shape.",
  alternatives: ["Razer Viper V3 Pro", "Lamzu Maya X", "Vaxee XE"],
};

const formatGrip = (grip: string) => grip.charAt(0).toUpperCase() + grip.slice(1);

export default function RightStack() {
  const { bestMouse } = useReportStore();
  const display = bestMouse ?? demoBest;
  const isDemo = !bestMouse;

  const slides = useMemo(
    () => [
      {
        id: "slide-fit",
        content: (
          <div className="space-y-3">
            <div className="text-[0.65rem] uppercase tracking-[0.3em] text-white/45 transition-colors">
              {isDemo ? "test to show results" : "latest report"}
            </div>
            <div className="text-2xl font-semibold text-theme-primary transition-colors">{display.name}</div>
            <div className="text-sm text-white/70 transition-colors">Match score {Math.round(display.score)}%</div>
            <div className="rounded-2xl bg-white/5 p-3 text-xs text-white/65 transition-colors">
              {display.notes}
            </div>
          </div>
        ),
      },
      {
        id: "slide-why",
        content: (
          <div className="space-y-4">
            <div className="text-sm font-semibold text-theme-primary transition-colors">Why it fits</div>
            <ul className="space-y-2 text-sm text-white/70 transition-colors">
              <li>Hand size: {display.size}</li>
              <li>Recommended grip: {formatGrip(display.recommendedGrip)}</li>
              <li>{display.notes}</li>
            </ul>
          </div>
        ),
      },
      {
        id: "slide-alt",
        content: (
          <div className="space-y-3">
            <div className="text-sm font-semibold text-theme-primary transition-colors">Suggested alternatives</div>
            <div className="space-y-2 text-sm text-white/70 transition-colors">
              {display.alternatives.length ? (
                display.alternatives.map((alt) => (
                  <div key={alt} className="rounded-2xl bg-white/5 px-3 py-2">
                    {alt}
                  </div>
                ))
              ) : (
                <div className="text-xs text-white/50">No alternatives yet.</div>
              )}
            </div>
          </div>
        ),
      },
    ],
    [display, isDemo]
  );

  return (
    <div className="flex h-full flex-col gap-5">
      <div className="rounded-[28px] bg-[color:var(--panel)] p-5 transition-colors">
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/45">
          <span>Best Fit Result</span>
          <span>{isDemo ? "Demo" : "Swipe"}</span>
        </div>
        <div className="mt-4">
          <SwipeDeck slides={slides} />
        </div>
      </div>

      <div className="flex-1 rounded-[28px] bg-[color:var(--panel)] p-5" />
    </div>
  );
}
