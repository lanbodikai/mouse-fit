"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { PageNav } from "@/components/landing/PageNav";

function SectionDivider() {
  return (
    <div className="my-12 md:my-16">
      <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
}

export default function AboutUsPage() {
  return (
    <div className="relative min-h-screen w-screen overflow-x-hidden bg-black">
      {/* Background */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          background:
            "linear-gradient(135deg, #020804 0%, #081510 30%, #0a1a12 50%, #061008 70%, #020804 100%)",
        }}
      />
      <div
        className="fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse at 20% 50%, rgba(34, 197, 94, 0.12) 0%, transparent 55%), radial-gradient(ellipse at 80% 20%, rgba(34, 197, 94, 0.06) 0%, transparent 60%)",
        }}
      />
      <div
        className="fixed inset-0 -z-10 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
        }}
      />

      <PageNav currentPage="about" />

      <main className="relative z-10 mx-auto w-full max-w-5xl px-6 pt-24 pb-28 md:px-10">
        {/* 1) Header / Hero */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <div className="flex items-center gap-4">
            <div className="h-px w-10 bg-gradient-to-r from-transparent to-white/25" />
            <p className="text-xs tracking-[0.35em] text-white/50 uppercase">
              BRAND INTRODUCTION
            </p>
          </div>

          <div className="mt-6 md:mt-8">
            <h1 className="text-5xl font-light tracking-tight text-white md:text-6xl lg:text-7xl">
              MOUSEFIT
            </h1>
            <div className="mt-3 flex items-center gap-3">
              <div className="h-px w-8 bg-white/15" />
              <h2 className="text-2xl font-light tracking-wide text-white/70 md:text-3xl">
                ABOUT
              </h2>
            </div>
          </div>

          <p className="mt-6 max-w-2xl text-sm leading-relaxed text-white/55 md:text-base">
            We built MouseFit because we noticed a real problem: a poorly fitting mouse can
            contribute to wrist strain over time and make aim feel inconsistent.
            Our mission is to improve comfort and help you stay steady in long sessions.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-5">
            <Link
              href="/measure"
              className="inline-flex items-center justify-center rounded-full bg-green-500 px-6 py-3 text-sm font-medium text-black hover:bg-green-400 transition-colors"
            >
              Start Scan
            </Link>
            <Link
              href="#learn-more"
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              Learn More
            </Link>
          </div>
        </motion.section>

        <SectionDivider />

        {/* 2) The Problem (Health + Performance) */}
        <section id="learn-more" className="scroll-mt-24">
          <div className="flex items-baseline justify-between gap-6">
            <h3 className="text-xl font-light tracking-[0.2em] text-white uppercase">
              THE PROBLEM
            </h3>
            <div className="hidden md:block h-px flex-1 bg-white/10" />
          </div>

          <div className="mt-6 grid gap-8 md:grid-cols-2">
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-white/55">
                When a mouse doesn&apos;t match your hand, small compensations add up.
                Over time, that mismatch can contribute to wrist pain and strain.
              </p>
              <p className="text-sm leading-relaxed text-white/55">
                A bad fit can also make aim inconsistent and increase fatigue during long sessions,
                especially when you&apos;re constantly re-gripping or squeezing for control.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <p className="text-xs tracking-[0.25em] text-white/45 uppercase">
                Common outcomes
              </p>
              <ul className="mt-4 space-y-2 text-sm text-white/60">
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-green-500/70" />
                  Wrist strain risk
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-green-500/70" />
                  Reduced control
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-green-500/70" />
                  Faster fatigue
                </li>
              </ul>
            </div>
          </div>
        </section>

        <SectionDivider />

        {/* 3) The Insight (Fit matters) */}
        <section>
          <div className="flex items-baseline justify-between gap-6">
            <h3 className="text-xl font-light tracking-[0.2em] text-white uppercase">
              WHY FIT MATTERS
            </h3>
            <div className="hidden md:block h-px flex-1 bg-white/10" />
          </div>

          <p className="mt-6 max-w-3xl text-sm leading-relaxed text-white/55">
            Different mouse shapes and sizes are designed for different hand sizes and grip styles.
            A fit that feels natural reduces unnecessary tension and helps you keep consistent control.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <p className="text-xs tracking-[0.25em] text-white/45 uppercase">Hand Size</p>
              <p className="mt-3 text-sm text-white/60">
                Your hand length and width change how you anchor and reach for buttons.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <p className="text-xs tracking-[0.25em] text-white/45 uppercase">Grip Style</p>
              <p className="mt-3 text-sm text-white/60">
                Palm, claw, and fingertip grips benefit from different support and contours.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <p className="text-xs tracking-[0.25em] text-white/45 uppercase">Mouse Shape</p>
              <p className="mt-3 text-sm text-white/60">
                Hump height, width, and side curves define stability and comfort.
              </p>
            </div>
          </div>
        </section>

        <SectionDivider />

        {/* 4) How MouseFit Works */}
        <section>
          <div className="flex items-baseline justify-between gap-6">
            <h3 className="text-xl font-light tracking-[0.2em] text-white uppercase">
              HOW MOUSEFIT WORKS
            </h3>
            <div className="hidden md:block h-px flex-1 bg-white/10" />
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <StepperCard step="01" title="Scan" body="Use your camera to measure hand dimensions." />
            <StepperCard step="02" title="Analyze" body="AI + computer vision interpret size and grip." />
            <StepperCard step="03" title="Recommend" body="Get mice that match your fit and play style." />
          </div>
        </section>

        <SectionDivider />

      </main>
    </div>
  );
}

function StepperCard({ step, title, body }: { step: string; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/40 text-xs font-semibold tracking-[0.2em] text-white/70">
          {step}
        </div>
        <p className="text-base font-light text-white">{title}</p>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-white/55">{body}</p>
    </div>
  );
}
