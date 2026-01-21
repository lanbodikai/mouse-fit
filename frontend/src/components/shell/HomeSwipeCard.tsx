"use client";

import Link from "next/link";
import { useRef, useState } from "react";

const tabs = [
  {
    id: "measure",
    title: "MouseFit Measure",
    description: "Capture your hand size and unlock fast-fitting recommendations.",
    primary: { label: "Go to Measure Checker", href: "/measure" },
  },
  {
    id: "grip",
    title: "MouseFit Grip",
    description: "Identify your grip style and refine your match score.",
    primary: { label: "Go to Grip Checker", href: "/grip" },
  },
];

export default function HomeSwipeCard() {
  const [activeIndex, setActiveIndex] = useState(0);
  const startX = useRef<number | null>(null);

  const clampIndex = (next: number) => Math.max(0, Math.min(next, tabs.length - 1));

  const handleStart = (clientX: number) => {
    startX.current = clientX;
  };

  const handleEnd = (clientX: number) => {
    if (startX.current === null) return;
    const delta = clientX - startX.current;
    if (Math.abs(delta) > 40) {
      setActiveIndex((prev) => clampIndex(delta < 0 ? prev + 1 : prev - 1));
    }
    startX.current = null;
  };

  return (
    <div
      className="rounded-[28px] border border-white/10 bg-[color:var(--panel2)] p-5 shadow-[0_30px_60px_rgba(0,0,0,0.45)]"
      onTouchStart={(event) => handleStart(event.touches[0]?.clientX ?? 0)}
      onTouchEnd={(event) => handleEnd(event.changedTouches[0]?.clientX ?? 0)}
      onMouseDown={(event) => handleStart(event.clientX)}
      onMouseUp={(event) => handleEnd(event.clientX)}
      onMouseLeave={() => {
        startX.current = null;
      }}
    >
      <div className="relative grid grid-cols-2 text-[0.65rem] uppercase tracking-[0.32em] text-white/60">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveIndex(index)}
            className={`pb-3 text-left transition ${
              index === activeIndex ? "text-white" : "text-white/50 hover:text-white/80"
            }`}
          >
            {tab.title}
          </button>
        ))}
        <span
          className="absolute bottom-0 left-0 h-[2px] w-1/2 rounded-full bg-white/70 transition-transform duration-300"
          style={{ transform: `translateX(${activeIndex * 100}%)` }}
        />
      </div>

      <div className="mt-4 overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {tabs.map((tab) => (
            <div key={tab.id} className="min-w-full space-y-4 pr-6">
              <div>
                <div className="text-lg font-semibold text-white">{tab.title}</div>
                <p className="mt-2 text-sm text-white/60">{tab.description}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href={tab.primary.href}
                  className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                >
                  {tab.primary.label}
                </Link>
                <button
                  type="button"
                  className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white/60 transition hover:border-white/20 hover:text-white"
                >
                  Instructions
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
