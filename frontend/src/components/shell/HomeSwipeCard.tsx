"use client";

import Link from "next/link";

export default function HomeSwipeCard() {
  return (
    <div className="rounded-[30px] h-[160px] bg-[#06080b] p-5">
      <div className="flex h-full flex-col justify-between">
        <div>
          <div className="text-[24px] mt-1 ml-2 font-semibold text-white">Mousefit v2.1</div>
          <p className="mt-2 text-xs mt-1 ml-2 w-[240px] text-white/60">
            CV & AI powered accurate analysis.
          </p>
        </div>
        <div className="space-y-2">
          <Link
            href="/grip"
            className="flex mb-1 items-center justify-between rounded-full border border-white/10 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-white/10"
          >
            <span className="text-black/80 border border-white/10">Get started</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-black/20 bg-black text-white">
              →
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
