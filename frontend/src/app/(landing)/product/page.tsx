"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { PageNav } from "@/components/landing/PageNav";

const projectList = [
  "01: Mousefit",
  "02: Project PF (stealth)",
  "03: Project KM (stealth)",
  "04: Project PB (stealth)",
];

const AUTO_SCROLL_MS = 3200;

export default function ProductPage() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % projectList.length);
    }, AUTO_SCROLL_MS);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#01040c] text-white">
      <div className="absolute inset-x-0 top-0 h-px bg-white/20" />

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(120% 74% at 18% 34%, rgba(12, 33, 92, 0.55), transparent 65%),
            radial-gradient(98% 62% at 82% 56%, rgba(3, 17, 58, 0.45), transparent 72%),
            radial-gradient(130% 100% at 50% 100%, rgba(0, 3, 14, 0.98), rgba(0, 1, 8, 1) 72%)
          `,
        }}
      />

      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 2px, transparent 4px)",
        }}
      />

      <PageNav currentPage="product" />

      <main className="relative mx-auto flex h-screen w-full max-w-[780px] flex-col items-center justify-center px-5 pb-20 pt-20">
        <section className="w-full max-w-[620px]">
          <h1 className="text-center text-[clamp(1.45rem,2.7vw,2.2rem)] font-medium tracking-[0.05em] text-white/90">
            Mousefit Studio
          </h1>

          <div className="relative mt-4 px-4 py-2.5 md:px-6 md:py-3">
            <span className="pointer-events-none absolute left-0 top-0 h-3 w-3 border-l border-t border-white/72" />
            <span className="pointer-events-none absolute bottom-0 right-0 h-3 w-3 border-b border-r border-white/72" />
            <p className="mx-auto max-w-[520px] text-center text-[clamp(0.84rem,1.08vw,1.02rem)] leading-relaxed text-white/62">
              We build transformative AI-native products that stand the test of time - for this
              generation and the next.
            </p>
            <div className="mt-2 h-px w-full bg-white/10" />
          </div>
        </section>

        <section className="mt-5 w-full max-w-[470px]">
          <ul className="space-y-1">
            {projectList.map((item, index) => {
              const isActive = index === activeIndex;

              return (
                <motion.li
                  key={item}
                  animate={{
                    opacity: isActive ? 1 : 0.34,
                    x: isActive ? 2 : 0,
                    scale: 1,
                  }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className={`flex min-h-8 items-center px-1.5 text-[clamp(0.82rem,1vw,0.98rem)] text-white/46 ${
                    index === 0 ? "cursor-pointer" : ""
                  }`}
                >
                  <span className="mr-2 text-sm text-white/24">•</span>
                  {index === 0 ? (
                    <Link
                      href="/mousefit"
                      className={`truncate no-underline transition ${
                        isActive ? "text-white [text-shadow:0_0_12px_rgba(195,209,255,0.45)]" : "text-white/46 hover:text-white/70"
                      }`}
                    >
                      {item}
                    </Link>
                  ) : (
                    <span
                      className={`truncate transition ${
                        isActive ? "text-white [text-shadow:0_0_12px_rgba(195,209,255,0.45)]" : "text-white/46"
                      }`}
                    >
                      {item}
                    </span>
                  )}
                </motion.li>
              );
            })}
          </ul>
        </section>
      </main>
    </div>
  );
}
