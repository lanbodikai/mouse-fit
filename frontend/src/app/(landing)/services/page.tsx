"use client";

import { motion, type Variants } from "framer-motion";
import Link from "next/link";
import { ArrowUpRight, Scan, Hand, Database, Bot, BarChart3, LayoutDashboard } from "lucide-react";
import { PageNav } from "@/components/landing/PageNav";

type ServiceItem = {
  title: string;
  description: string;
  kicker: string;
  href: string;
  icon: React.ReactNode;
  gradient: string;
  accentVar: string;
};

const services: ServiceItem[] = [
  {
    title: "Hand Measurement",
    description:
      "Use your camera to accurately capture hand length, width, and span. Our computer-vision pipeline extracts precise dimensions in seconds.",
    kicker: "SCAN",
    href: "/measure",
    icon: <Scan className="w-5 h-5" />,
    gradient: "from-[var(--accent-gamer)] to-[var(--accent-violet)]",
    accentVar: "--accent-gamer",
  },
  {
    title: "Grip Analysis",
    description:
      "Identify your grip style — palm, claw, or fingertip — through real-time camera analysis powered by our self-built ML model.",
    kicker: "DETECT",
    href: "/grip",
    icon: <Hand className="w-5 h-5" />,
    gradient: "from-[var(--accent-violet)] to-[var(--accent-emerald)]",
    accentVar: "--accent-violet",
  },
  {
    title: "Mouse Database",
    description:
      "Browse hundreds of mice with detailed specs — shape, weight, sensor, and dimensions. Filter and compare to find your fit.",
    kicker: "BROWSE",
    href: "/database",
    icon: <Database className="w-5 h-5" />,
    gradient: "from-[var(--accent-emerald)] to-[var(--accent-amber)]",
    accentVar: "--accent-emerald",
  },
  {
    title: "AI Assistant",
    description:
      "Ask our AI anything about mice, grip, or ergonomics. Get personalised recommendations based on your measurements and play style.",
    kicker: "ASK",
    href: "/ai",
    icon: <Bot className="w-5 h-5" />,
    gradient: "from-[var(--accent-amber)] to-[var(--accent-gamer)]",
    accentVar: "--accent-amber",
  },
  {
    title: "Fit Report",
    description:
      "Receive a detailed breakdown of your hand-to-mouse compatibility — comfort score, control rating, and ergonomic notes.",
    kicker: "ANALYZE",
    href: "/report",
    icon: <BarChart3 className="w-5 h-5" />,
    gradient: "from-[var(--accent-gamer)] to-[var(--accent-emerald)]",
    accentVar: "--accent-gamer",
  },
  {
    title: "Dashboard",
    description:
      "Track your measurements, view past reports, and monitor your fitting journey — all in one unified overview.",
    kicker: "OVERVIEW",
    href: "/dashboard",
    icon: <LayoutDashboard className="w-5 h-5" />,
    gradient: "from-[var(--accent-violet)] to-[var(--accent-amber)]",
    accentVar: "--accent-violet",
  },
];

type StealthProject = {
  label: string;
  tag: string;
};

const stealthProjects: StealthProject[] = [
  { label: "Project PF", tag: "STEALTH" },
  { label: "Project KM", tag: "STEALTH" },
  { label: "Project PB", tag: "STEALTH" },
];

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

export default function ServicesPage() {
  return (
    <div className="relative min-h-screen w-screen overflow-x-hidden bg-theme-primary">
      {/* Background */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          background:
            "linear-gradient(135deg, var(--bg0) 0%, var(--bg1) 52%, var(--bg-tertiary) 100%)",
        }}
      />
      <div
        className="fixed inset-0 -z-10 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse at 16% 30%, rgba(139, 92, 246, 0.22) 0%, transparent 58%), radial-gradient(ellipse at 84% 70%, rgba(0, 168, 232, 0.2) 0%, transparent 60%)",
        }}
      />
      <div
        className="fixed inset-0 -z-10 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
        }}
      />

      <PageNav currentPage="services" />

      <main className="relative z-10 mx-auto w-full max-w-6xl px-6 pt-28 pb-32 md:px-10">
        {/* Header */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="mb-16 md:mb-20"
        >
          <div className="flex items-center gap-4">
            <div
              className="h-px w-10"
              style={{
                background:
                  "linear-gradient(90deg, transparent, var(--accent-violet))",
              }}
            />
            <p className="text-xs tracking-[0.35em] text-white/50 uppercase">
              WHAT WE OFFER
            </p>
          </div>

          <h1 className="mt-6 text-4xl font-light tracking-tight text-white md:text-5xl lg:text-6xl">
            Services &{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, var(--accent-gamer), var(--accent-violet), var(--accent-emerald))",
              }}
            >
              Tools
            </span>
          </h1>

          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-white/50 md:text-base">
            Everything you need to find, measure, and validate your perfect
            mouse fit — from camera-based scanning to AI-powered recommendations.
          </p>
        </motion.section>

        {/* Service Cards Grid */}
        <motion.section
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {services.map((s) => (
            <motion.div key={s.title} variants={fadeUp}>
              <Link href={s.href} className="group block h-full">
                <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04]">
                  {/* Gradient top bar */}
                  <div
                    className="h-[2px] w-full"
                    style={{
                      background: `linear-gradient(90deg, var(${s.accentVar}), transparent)`,
                    }}
                  />

                  <div className="flex flex-1 flex-col p-6 md:p-7">
                    {/* Icon + kicker */}
                    <div className="flex items-center justify-between">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/30"
                        style={{ color: `var(${s.accentVar})` }}
                      >
                        {s.icon}
                      </div>
                      <span className="text-[10px] tracking-[0.25em] text-white/30 uppercase">
                        {s.kicker}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="mt-5 text-lg font-medium text-white/90">
                      {s.title}
                    </h3>

                    {/* Description */}
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-white/45">
                      {s.description}
                    </p>

                    {/* CTA */}
                    <div className="mt-5 flex items-center gap-2 text-sm text-white/40 transition-colors group-hover:text-white/70">
                      <span>Open</span>
                      <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.section>

        {/* Divider */}
        <div className="my-16 md:my-20">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        {/* Stealth Projects */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
        >
          <div className="flex items-center gap-4 mb-8">
            <div
              className="h-px w-10"
              style={{
                background:
                  "linear-gradient(90deg, transparent, var(--accent-amber))",
              }}
            />
            <p className="text-xs tracking-[0.35em] text-white/50 uppercase">
              COMING SOON
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {stealthProjects.map((p, i) => (
              <motion.div
                key={p.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 + i * 0.08 }}
                className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4 backdrop-blur-sm"
              >
                <span className="text-sm text-white/60">{p.label}</span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-0.5 text-[10px] tracking-[0.2em] text-white/30 uppercase">
                  {p.tag}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Bottom CTA */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.6 }}
          className="mt-16 md:mt-20 text-center"
        >
          <p className="text-sm text-white/40 mb-5">
            Ready to find your fit?
          </p>
          <Link
            href="/survey"
            className="group inline-flex items-center gap-3 rounded-full px-6 py-3 text-sm text-white transition-all duration-200 mf-neon-btn"
          >
            <span>Get started</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-black/45 transition-colors group-hover:bg-black/65">
              <ArrowUpRight className="w-4 h-4 text-[color:var(--accent-gamer)]" />
            </div>
          </Link>
        </motion.section>
      </main>
    </div>
  );
}
