"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { BestMouse } from "@/lib/reportStore";
import { buildBestMouseFromStorage } from "@/lib/reportStore";

const chips = ["Features", "About", "Contact"];

export default function Home() {
  const [bestMouse, setBestMouse] = useState<BestMouse | null>(null);

  useEffect(() => {
    setBestMouse(buildBestMouseFromStorage());
  }, []);

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden animate-page-zoom">
      {/* Main Content Area - Now has TWO columns side by side */}
      <div className="flex flex-1 w-full gap-0">
        {/* LEFT COLUMN: SVG Container */}
        <div className="flex flex-1 flex-col relative">
          {/* SVG Container with chips and logo inside */}
          <div className="relative flex-1 w-5/6 min-h-[635px] overflow-visible">
            {/* SVG acts as the video placeholder */}
            <svg
              className="absolute inset-0 z-10 h-full w-full"
              viewBox="0 0 1200 800"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                <clipPath id="centerart-clip">
                  <path d="M353.5 562.5V702C353.5 721.5 371 736.5 385 736.5H1065.5C1081.5 736.5 1091.5 717 1091.5 688.5C1091.5 660 1091 85 1091 62.5C1091 40 1061 0.50003 1038.5 0.500009H782.5L701 70H507L428 0.500009H53C13 0.499979 0.500038 20.5 0.500012 40V469C0.500012 469 7.00002 519.5 53 513.5H303C325 513.5 353.5 537 353.5 562.5Z" />
                </clipPath>
              </defs>

              <defs>
                <filter id="round-filter" x="-5%" y="-5%" width="110%" height="110%">
                  <feGaussianBlur in="SourceAlpha" stdDeviation="5" result="blur" />
                  <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9" />
                  <feComposite in="SourceGraphic" in2="goo" operator="atop" />
                </filter>
              </defs>
              {/* SVG Background Fill - Plain Black with Rounded Corners */}
              <path
                d="M353.5 562.5V702C353.5 721.5 371 736.5 385 736.5H1065.5C1081.5 736.5 1091.5 717 1091.5 688.5C1091.5 660 1091 85 1091 62.5C1091 40 1061 0.50003 1038.5 0.500009H782.5L701 70H507L428 0.500009H53C13 0.499979 0.500038 20.5 0.500012 40V469C0.500012 469 7.00002 519.5 53 513.5H303C325 513.5 353.5 537 353.5 562.5Z"
                fill="#000000"
                strokeLinejoin="round"
                strokeLinecap="round"
                filter="url(#round-filter)"
              />

              <foreignObject
                x="0"
                y="0"
                width="1200"
                height="800"
                clipPath="url(#centerart-clip)"
              >
                <img
                  className="h-full w-full object-cover animate-fade-in"
                  src="/16.png"
                  alt="Center art"
                />
              </foreignObject>

              <foreignObject x="465" y="-30" width="280" height="120">
                <div className="flex h-full w-full items-center justify-center">
                  <img
                    className="h-13 w-[160px] opacity-60 [filter:brightness(0)_invert(1)]"
                    src="/21.png"
                    alt="Mousefit"
                  />
                </div>
              </foreignObject>

              <foreignObject x="0" y="540" width="350" height="400">
                <div className="h-full w-full">
                  <div className="rounded-[30px] h-[200px] bg-[#06080b] p-5">
                    <div className="flex h-full flex-col justify-between">
                      <div>
                        <div className="text-[34px] mt-1 ml-2 font-semibold text-white">Mousefit v2.1</div>
                        <p className="mt-2 text-s mt-1 ml-2 w-[300px] text-white/60">
                          CV & AI powered accurate analysis.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Link
                          href="/grip"
                          className="flex mb-1 items-center justify-between rounded-full border border-white/10 bg-white px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-white/10"
                        >
                          <span className="text-black/80 border border-white/10 text-lg">Get started</span>
                          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-black/20 bg-black text-white">
                            →
                          </span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </foreignObject>

              <path
                d="M353.5 562.5V702C353.5 721.5 371 736.5 385 736.5H1065.5C1081.5 736.5 1091.5 717 1091.5 688.5C1091.5 660 1091 85 1091 62.5C1091 40 1061 0.50003 1038.5 0.500009H782.5L701 70H507L428 0.500009H53C13 0.499979 0.500038 20.5 0.500012 40V469C0.500012 469 7.00002 519.5 53 513.5H303C325 513.5 353.5 537 353.5 562.5Z"
                stroke="white"
                fill="none"
                strokeWidth="1"
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity="0"
              />
            </svg>

            {/* Chips Navigation */}
            <nav className="absolute top-3 left-4 z-10 flex items-center gap-2">
              {chips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  className="rounded-full px-3 py-2 text-xs uppercase tracking-[0.1em] text-white/70 transition hover:bg-white/15 hover:text-white"
                >
                  {chip}
                </button>
              ))}
            </nav>

          </div>

        </div>

        {/* RIGHT CARDS: Overflowing onto SVG */}
        <div className="absolute right-0 top-0 flex h-full w-[262px] flex-col gap-3 z-30 pointer-events-none overflow-hidden">
          {/* TOP CARD */}
          <div className="rounded-[28px] h-[240px] bg-gradient-to-b from-[#0e1116] via-[#0a0c10] to-[#06080b] p-5 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_18px_40px_rgba(0,0,0,0.35)] pointer-events-auto shrink-0">
            {bestMouse ? (
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold uppercase text-white">Your bestfit mouse</h3>
                  <div className="h-2 w-2 rounded-full bg-white/30" />
                </div>
                <div className="mt-3 text-sm font-semibold text-white">{bestMouse.name}</div>
                <div className="mt-3 h-px w-full bg-gradient-to-r from-white/15 via-white/5 to-transparent" />
                <ul className="mt-4 space-y-1 text-xs text-white/70">
                  <li>Match score {Math.round(bestMouse.score)}%</li>
                  <li>Hand size {bestMouse.size}</li>
                  <li>Grip {bestMouse.recommendedGrip}</li>
                </ul>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-center text-sm font-semibold text-white/70">
                test to see results...
              </div>
            )}
          </div>

          {/* BOTTOM CARD */}
          <div className="rounded-3xl h-[335px] bg-[#06080b] p-4 backdrop-blur-sm border border-white/10 relative pointer-events-auto shrink-0">
            {/* Small icon in top right */}
            <div className="absolute top-3 right-3 w-5 h-5 rounded-full border-2 border-white/50" />
            
            {/* Circular Control Graphic */}
            <div className="flex justify-center items-center my-4">
              <svg className="h-[46px] w-24" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="8"
                />
                <path
                  d="M 50 50 L 50 5 A 45 45 0 1 1 85 50 Z"
                  fill="white"
                  opacity="0.3"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="35"
                  fill="black"
                />
              </svg>
            </div>

            <h3 className="text-lg font-bold uppercase mb-2 text-white text-center">
              Coming Soon
            </h3>
            <p className="text-xs text-white/70 text-center">
              We're working on it!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}