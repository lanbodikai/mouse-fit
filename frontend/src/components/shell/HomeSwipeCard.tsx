"use client";

import Link from "next/link";

export default function HomeSwipeCard() {
  return (
    <div className="rounded-[30px] h-[170px] bg-black p-5 shadow-[0_30px_60px_rgba(0,0,0,0.45)]">
      <div className="flex h-full flex-col justify-between">
        <div>
          <div className="text-lg mt-2 ml-2 font-semibold text-white">Mousefit v2.1</div>
          <p className="mt-2 text-xs mt-1 ml-2 w-[200px] text-white/60">
            CV & AI powered accurate analysis.
          </p>
        </div>
        <div className="space-y-2">
          <Link
            href="/grip"
            className="flex mb-1 items-center justify-between rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-white/10"
          >
            <span className="text-white/80">Get started</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-white text-black">
              →
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
