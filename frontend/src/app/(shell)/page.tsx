"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { BestMouse } from "@/lib/reportStore";
import { buildBestMouseFromStorage } from "@/lib/reportStore";
import { useTheme } from "@/lib/theme";
import { Sun, Moon } from "lucide-react";

export default function Home() {
  const [bestMouse, setBestMouse] = useState<BestMouse | null>(null);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    setBestMouse(buildBestMouseFromStorage());
    
    // Ensure camera is stopped on front page
    if (typeof window !== 'undefined') {
      // Stop any camera functions
      if ((window as any).stopCam) {
        try {
          (window as any).stopCam();
        } catch (e) {
          // Ignore errors
        }
      }
      if ((window as any).stopCamGrip) {
        try {
          (window as any).stopCamGrip();
        } catch (e) {
          // Ignore errors
        }
      }
      
      // Stop all video tracks
      const videoElements = document.querySelectorAll('video');
      videoElements.forEach(video => {
        if (video.srcObject) {
          const stream = video.srcObject as MediaStream;
          stream.getTracks().forEach(track => {
            track.stop();
          });
          video.srcObject = null;
        }
      });
    }
  }, []);

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden animate-page-zoom">
      {/* Main Content Area - Now has TWO columns side by side */}
      <div className="flex flex-1 w-full gap-0 relative z-10">
        {/* LEFT COLUMN: SVG Container */}
        <div className="flex flex-1 flex-col relative">
          {/* SVG Container with logo inside */}
          <div className="relative flex-1 w-5/6 max-h-[635px] overflow-visible">
            {/* Theme Toggle Button - On top of SVG */}
            <button
              onClick={toggleTheme}
              className="absolute top-0 right-21 z-[100] flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/20 bg-theme-card backdrop-blur-md shadow-lg transition-all hover:bg-white/20 hover:scale-110 pointer-events-auto"
              style={{
                backgroundColor: theme === "dark" ? "rgba(0, 0, 0, 0.6)" : "rgba(255, 255, 255, 0.8)",
                borderColor: theme === "dark" ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.2)",
              }}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="h-6 w-6 text-theme-primary transition-colors" />
              ) : (
                <Moon className="h-6 w-6 text-theme-primary transition-colors" />
              )}
            </button>

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
                  <feGaussianBlur in="SourceAlpha" stdDeviation="10" result="blur" />
                  <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9" result="goo" />
                  <feComposite in="SourceGraphic" in2="goo" operator="atop" />
                </filter>
              </defs>
              {/* SVG Background Fill - Theme-aware with Rounded Corners */}
              {/* Background fill with rounded filter */}
              <path
                d="M353.5 562.5V702C353.5 721.5 371 736.5 385 736.5H1065.5C1081.5 736.5 1091.5 717 1091.5 688.5C1091.5 660 1091 85 1091 62.5C1091 40 1061 0.50003 1038.5 0.500009H782.5L701 70H507L428 0.500009H53C13 0.499979 0.500038 20.5 0.500012 40V469C0.500012 469 7.00002 519.5 53 513.5H303C325 513.5 353.5 537 353.5 562.5Z"
                fill="var(--bg-card)"
                filter="url(#round-filter)"
                className="transition-colors"
              />
              {/* Stroke overlay - separate from filter for clean edges */}
              <path
                d="M353.5 562.5V702C353.5 721.5 371 736.5 385 736.5H1065.5C1081.5 736.5 1091.5 717 1091.5 688.5C1091.5 660 1091 85 1091 62.5C1091 40 1061 0.50003 1038.5 0.500009H782.5L701 70H507L428 0.500009H53C13 0.499979 0.500038 20.5 0.500012 40V469C0.500012 469 7.00002 519.5 53 513.5H303C325 513.5 353.5 537 353.5 562.5Z"
                fill="none"
                strokeWidth="3"
                strokeLinejoin="round"
                strokeLinecap="round"
                className="transition-colors"
                style={{
                  stroke: theme === "dark" ? "#000000" : "#ffffff"
                }}
              />

              <foreignObject
                x="0"
                y="0"
                width="1200"
                height="800"
                clipPath="url(#centerart-clip)"
              >
                {theme === "dark" ? (
                  <img
                    className="h-full w-full object-cover animate-fade-in"
                    src="/16.png"
                    alt="Center art"
                  />
                ) : (
                  <img
                    className="h-full w-full object-cover animate-fade-in"
                    src="/22.png"
                    alt="Center art"
                  />
                )}
              </foreignObject>

              <foreignObject x="465" y="-30" width="280" height="120">
                <div className="flex h-full w-full items-center justify-center">
                  <img
                    className="h-13 w-[160px] opacity-60 transition-all"
                    style={{
                      filter: theme === "dark" 
                        ? "brightness(0) invert(1)" 
                        : "brightness(0)"
                    }}
                    src="/21.png"
                    alt="Mousefit"
                  />
                </div>
              </foreignObject>

              <foreignObject x="0" y="540" width="350" height="400">
                <div className="h-full w-full">
                  <div className="rounded-[30px] h-[200px] bg-theme-card p-5 transition-colors">
                    <div className="flex h-full flex-col justify-between">
                      <div>
                        <div className="text-[34px] mt-1 ml-2 font-semibold text-theme-primary">Mousefit v2.1</div>
                        <p className="mt-2 text-s mt-1 ml-2 w-[300px] text-white/60">
                          CV & AI powered accurate analysis.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Link
                          href="/grip"
                          className="flex mb-1 items-center justify-between rounded-full border border-white/10 dark:bg-white light:bg-black px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] dark:text-black light:text-white transition hover:bg-white/10"
                        >
                          <span className="dark:text-black/80 light:text-white/80 border border-white/10 text-lg">Get started</span>
                          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/10 dark:bg-black light:bg-white dark:text-white light:text-black">
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
                fill="none"
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity="0.5"
                className="transition-colors"
                style={{
                  stroke: theme === "dark" ? "#000000" : "#ffffff"
                }}
              />
            </svg>

          </div>

        </div>

        {/* RIGHT CARDS: Overflowing onto SVG */}
        <div className="absolute right-0 top-0 flex h-full w-[262px] flex-col gap-3 z-30 pointer-events-none overflow-hidden">
          {/* TOP CARD */}
          <div 
            className="rounded-[28px] h-[240px] p-5 border border-white/10 pointer-events-auto shrink-0 transition-colors"
            style={{
              background: theme === "dark" 
                ? "linear-gradient(to bottom, #0e1116, #0a0c10, #06080b)"
                : "linear-gradient(to bottom, #f1f3f5, #f5f7f9, #f9fafb)"
            }}
          >
            {bestMouse ? (
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold uppercase text-theme-primary transition-colors">Your bestfit mouse</h3>
                  <div className="h-2 w-2 rounded-full theme-dot transition-colors" />
                </div>
                <div className="mt-3 text-sm font-semibold text-theme-primary transition-colors">{bestMouse.name}</div>
                <div className="mt-3 h-px w-full theme-divider transition-colors" />
                <ul className="mt-4 space-y-1 text-xs text-white/70 transition-colors">
                  <li>Match score {Math.round(bestMouse.score)}%</li>
                  <li>Hand size {bestMouse.size}</li>
                  <li>Grip {bestMouse.recommendedGrip}</li>
                </ul>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-center text-sm font-semibold text-white/70 transition-colors">
                test to see results...
              </div>
            )}
          </div>

          {/* BOTTOM CARD */}
          <div className="rounded-3xl h-[335px] bg-theme-card p-4 backdrop-blur-sm border border-white/10 relative pointer-events-auto shrink-0 transition-colors">
            {/* Small icon in top right */}
            <div className="absolute top-3 right-3 w-5 h-5 rounded-full border-2 theme-icon-border transition-colors" />
            
            {/* Circular Control Graphic */}
            <div className="flex justify-center items-center my-4">
              <svg className="h-[46px] w-24" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  className="theme-stroke"
                  strokeWidth="8"
                />
                <path
                  d="M 50 50 L 50 5 A 45 45 0 1 1 85 50 Z"
                  fill="var(--text-primary)"
                  opacity="0.3"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="35"
                  fill="var(--bg-card)"
                />
              </svg>
            </div>

            <h3 className="text-lg font-bold uppercase mb-2 text-theme-primary text-center transition-colors">
              Coming Soon
            </h3>
            <p className="text-xs text-white/70 text-center transition-colors">
              We're working on it!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}