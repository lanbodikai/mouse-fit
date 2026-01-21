import { ArrowUpRight } from "lucide-react";
import NotchedPanel from "@/components/shell/NotchedPanel";
import HomeSwipeCard from "@/components/shell/HomeSwipeCard";

const chips = ["Home", "Products", "FAQ"];

export default function Home() {
  return (
    <NotchedPanel className="p-0" contentClassName="h-full">
      <div className="relative h-full p-8">
        <div className="absolute left-8 top-7 flex items-center gap-3">
          {chips.map((chip) => (
            <button
              key={chip}
              type="button"
              className="rounded-full border border-white/10 px-3 py-1 text-[0.6rem] uppercase tracking-[0.28em] text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              {chip}
            </button>
          ))}
        </div>

        <div className="absolute top-7 left-1/2 -translate-x-1/2 text-sm font-semibold uppercase tracking-[0.5em] text-white/80">
          MouseFit
        </div>

        <button
          type="button"
          className="absolute right-7 top-7 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/70 transition hover:border-white/25 hover:text-white"
          aria-label="Quick action"
        >
          <ArrowUpRight className="h-4 w-4" />
        </button>

        <div className="relative z-10 flex h-full items-center justify-center">
          <div className="relative h-[320px] w-[260px]">
            <div className="absolute inset-0 rounded-[36px] bg-gradient-to-br from-white/15 via-white/5 to-transparent shadow-[0_40px_80px_rgba(0,0,0,0.6)] blur-[0.2px]">
              <div className="absolute inset-6 rounded-[28px] border border-white/15 bg-gradient-to-br from-[#2b2f35] via-[#1a1d22] to-[#0b0c0e]" />
            </div>
            <div className="absolute inset-10 rounded-[24px] border border-white/10 bg-gradient-to-b from-[#1f2328] via-[#121418] to-[#0a0b0d] shadow-[inset_0_10px_30px_rgba(255,255,255,0.06)]" />
            <div className="absolute -bottom-6 left-1/2 h-12 w-36 -translate-x-1/2 rounded-full bg-black/60 blur-[14px]" />
          </div>
        </div>

        <div className="absolute bottom-8 left-8 w-[380px] max-w-[85%]">
          <HomeSwipeCard />
        </div>
      </div>
    </NotchedPanel>
  );
}
