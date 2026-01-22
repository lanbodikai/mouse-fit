"use client";

import HomeSwipeCard from "@/components/shell/HomeSwipeCard";

const chips = ["Database", "About", "Contact"];

export default function Home() {
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden">
      {/* Main Content Area - Now has TWO columns side by side */}
      <div className="flex flex-1 w-full gap-0">
        {/* LEFT COLUMN: SVG Container */}
        <div className="flex flex-1 flex-col relative">
          {/* SVG Container with chips and logo inside */}
          <div className="relative flex-1 w-5/6 overflow-visible">
            {/* SVG acts as the video placeholder */}
            <svg
              className="absolute inset-0 z-10"
              viewBox="0 0 1200 800"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                <clipPath id="centerart-clip">
                  <path d="M353.5 562.5V736.5C353.5 756 371 764.5 385 764.5H1065.5C1081.5 764.5 1091 744.5 1091 716V62.5C1091 40 1061 0.50003 1038.5 0.500009H782.5L701 70H507L428 0.500009H53C13 0.499979 0.500038 20.5 0.500012 40V469C0.500012 469 7.00002 519.5 53 513.5H303C325 513.5 353.5 537 353.5 562.5Z" />
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
                d="M353.5 562.5V736.5C353.5 756 371 764.5 385 764.5H1065.5C1081.5 764.5 1091 744.5 1091 716V62.5C1091 40 1061 0.50003 1038.5 0.500009H782.5L701 70H507L428 0.500009H53C13 0.499979 0.500038 20.5 0.500012 40V469C0.500012 469 7.00002 519.5 53 513.5H303C325 513.5 353.5 537 353.5 562.5Z"
                fill="#000000"
                strokeLinejoin="round"
                strokeLinecap="round"
                filter="url(#round-filter)"
              />

              <foreignObject
                x="400"
                y="200"
                width="600"
                height="450"
                clipPath="url(#centerart-clip)"
              >
                <video
                  className="h-full w-full object-cover animate-fade-in"
                  src="/centerart.mp4"
                  autoPlay={true}
                  loop={true}
                  muted
                  playsInline
                />
              </foreignObject>

              <path
                d="M353.5 562.5V736.5C353.5 756 371 764.5 385 764.5H1065.5C1081.5 764.5 1091 744.5 1091 716V62.5C1091 40 1061 0.50003 1038.5 0.500009H782.5L701 70H507L428 0.500009H53C13 0.499979 0.500038 20.5 0.500012 40V469C0.500012 469 7.00002 519.5 53 513.5H303C325 513.5 353.5 537 353.5 562.5Z"
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

            {/* Logo/Brand */}
            <div className="absolute top-1.5 left-105 z-10">
              <div className="text-sm font-semibold uppercase tracking-[0.4em] text-white/80">
                Mousefit
              </div>
            </div>
          </div>

          {/* Product Info Card */}
          <div className="mt-6 ml-0 w-[260px] h-[170px]">
            <HomeSwipeCard />
          </div>
        </div>

        {/* RIGHT CARDS: Overflowing onto SVG */}
        <div className="absolute right-2 top-0 flex h-full w-[250px] flex-col gap-3 z-30 pointer-events-none overflow-hidden">
          {/* TOP CARD */}
          <div className="rounded-3xl bg-black p-4 backdrop-blur-sm border border-white/10 pointer-events-auto shrink-0">
            <h3 className="text-lg font-bold uppercase mb-2 text-white">
              Your Best Gaming Mouse
            </h3>
            <p className="text-xs text-white/70 mb-3">
              6 Watts Peak/3 Watts RMS power delivers clear stereo sound from the dual 2" driver design.
            </p>
            
            {/* Audio Waveform Visualization */}
            <div className="h-16 mb-3 flex items-end gap-1">
              {Array.from({ length: 40 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 bg-white rounded-t"
                  style={{
                    height: `${Math.random() * 60 + 20}%`,
                    opacity: 0.8,
                  }}
                />
              ))}
            </div>

            {/* Pagination Dots */}
            <div className="flex justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-white" />
              <div className="w-2 h-2 rounded-full bg-white/30" />
              <div className="w-2 h-2 rounded-full bg-white/30" />
              <div className="w-2 h-2 rounded-full bg-white/30" />
            </div>
          </div>

          {/* BOTTOM CARD */}
          <div className="rounded-3xl bg-black p-4 backdrop-blur-sm border border-white/10 relative pointer-events-auto shrink-0">
            {/* Small icon in top right */}
            <div className="absolute top-3 right-3 w-5 h-5 rounded-full border-2 border-white/50" />
            
            {/* Circular Control Graphic */}
            <div className="flex justify-center items-center my-4">
              <svg className="w-24 h-50" viewBox="0 0 100 100">
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
              EASY CONTROLS
            </h3>
            <p className="text-xs text-white/70 text-center">
              Easily access power, volume, headphone jack and auxiliary jack on the right speaker.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}