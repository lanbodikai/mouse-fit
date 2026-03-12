"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, ChevronRight, Loader2, MousePointer2, Target, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { dismissSurveyReminder, getMe } from "@/lib/api";
import type { CurrentUser } from "@/lib/types";

const projectCards = [
  { id: 1, code: "01", title: "Mousefit", type: "Core Platform", active: true, dot: "bg-[color:var(--accent-gamer)]" },
  { id: 2, code: "02", title: "Project PF (stealth)", type: "R&D Track", active: false, dot: "bg-[color:var(--accent-violet)]" },
  { id: 3, code: "03", title: "Project KM (stealth)", type: "R&D Track", active: false, dot: "bg-[color:var(--accent-amber)]" },
  { id: 4, code: "04", title: "Project PB (stealth)", type: "R&D Track", active: false, dot: "bg-[color:var(--accent-emerald)]" },
];

const progressItems = [
  { id: 1, title: "Mice Scanned", value: 85, icon: MousePointer2, color: "text-accent-gamer", bg: "bg-accent-gamer-soft", border: "border-accent-gamer" },
  { id: 2, title: "Grip Matches", value: 62, icon: Target, color: "text-accent-violet", bg: "bg-accent-violet-soft", border: "border-accent-violet" },
  { id: 3, title: "AI Accuracy", value: 94, icon: Activity, color: "text-accent-emerald", bg: "bg-accent-emerald-soft", border: "border-accent-emerald" },
];

const recentActivity = [
  { id: 1, title: "Logitech G Pro X", desc: "Superlight 2", time: "2h ago", value: "+98%", accent: "text-accent-gamer", bg: "bg-accent-gamer-soft", border: "border-accent-gamer" },
  { id: 2, title: "Razer DeathAdder", desc: "V3 Pro", time: "5h ago", value: "+95%", accent: "text-accent-amber", bg: "bg-accent-amber-soft", border: "border-accent-amber" },
  { id: 3, title: "Endgame Gear", desc: "OP1we", time: "1d ago", value: "+92%", accent: "text-accent-violet", bg: "bg-accent-violet-soft", border: "border-accent-violet" },
];

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
};

function shouldShowSurveyPrompt(user: CurrentUser): boolean {
  if (user.hasCompletedSurvey) return false;
  if (!user.surveyDismissedUntil) return true;

  const dismissedUntil = new Date(user.surveyDismissedUntil).getTime();
  if (!Number.isFinite(dismissedUntil)) return true;
  return dismissedUntil <= Date.now();
}

export default function MouseFitDashboard() {
  const router = useRouter();
  const authReady = useRequireAuth();
  const primaryActionRef = useRef<HTMLButtonElement | null>(null);

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [surveyModalOpen, setSurveyModalOpen] = useState(false);
  const [surveyModalBusy, setSurveyModalBusy] = useState(false);
  const [surveyModalError, setSurveyModalError] = useState<string | null>(null);

  useEffect(() => {
    if (!authReady) return;

    let cancelled = false;

    async function loadUser() {
      try {
        const me = await getMe();
        if (cancelled) return;
        setUser(me);
        setSurveyModalOpen(shouldShowSurveyPrompt(me));
      } catch (error) {
        if (cancelled) return;
        setSurveyModalError(error instanceof Error ? error.message : "Could not load your survey status.");
      }
    }

    void loadUser();
    return () => {
      cancelled = true;
    };
  }, [authReady]);

  async function handleRemindLater() {
    if (surveyModalBusy) return;
    setSurveyModalBusy(true);
    setSurveyModalError(null);
    try {
      const updated = await dismissSurveyReminder();
      setUser(updated);
      setSurveyModalOpen(false);
    } catch (error) {
      setSurveyModalError(error instanceof Error ? error.message : "Could not save your reminder.");
    } finally {
      setSurveyModalBusy(false);
    }
  }

  function handleNewMeasurementClick() {
    setSurveyModalError(null);

    if (!user || !user.hasCompletedSurvey) {
      setSurveyModalOpen(true);
      return;
    }

    router.push("/survey");
  }

  const handleEscapeDismiss = useEffectEvent((event: KeyboardEvent) => {
    if (event.key !== "Escape" || surveyModalBusy) return;
    event.preventDefault();
    void handleRemindLater();
  });

  useEffect(() => {
    if (!surveyModalOpen) return;
    primaryActionRef.current?.focus();

    window.addEventListener("keydown", handleEscapeDismiss);
    return () => window.removeEventListener("keydown", handleEscapeDismiss);
  }, [surveyModalOpen]);

  return (
    <>
      <motion.div
        className="mx-auto w-full max-w-6xl flex flex-col gap-8 px-3 sm:px-5 lg:px-6 pb-12"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={fadeUp}>
          <Card
            className="overflow-hidden"
            style={{
              borderColor: "var(--border-color)",
              background: "var(--surface-strong)",
            }}
          >
            <CardContent className="relative p-8 md:p-14 flex flex-col md:flex-row items-center justify-between gap-10">
              <div className="absolute top-0 left-0 right-0 h-[2px] rounded-full" style={{ background: "linear-gradient(90deg, var(--accent-gamer), var(--accent-violet), var(--accent-emerald))" }} />
              <div className="flex-1 space-y-6 z-10">
                <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                  MouseFit Dashboard
                </h2>
                <p className="text-lg text-white/70 max-w-md">
                  Create your personalized mouse profile and track your grip style evolution in minutes.
                </p>
                <motion.button
                  whileHover={{ y: -2, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleNewMeasurementClick}
                  className="rounded-xl border border-accent-gamer bg-[#1a1c23] px-6 py-3 font-medium text-white transition-colors hover-accent-gamer-soft"
                >
                  New Measurement
                </motion.button>
              </div>

              <div className="relative w-full md:w-1/2 h-48 md:h-64 flex items-center justify-center">
                <motion.div
                  animate={{
                    y: [0, -10, 0],
                    rotate: [0, 2, -2, 0],
                  }}
                  transition={{
                    duration: 6,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="relative w-full h-full"
                >
                    <svg viewBox="0 0 400 200" className="w-full h-full drop-shadow-2xl">
                    <defs>
                      <linearGradient id="blob" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.26)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0.08)" />
                      </linearGradient>
                      <linearGradient id="accentRing" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="var(--accent-gamer)" stopOpacity="0.5" />
                        <stop offset="50%" stopColor="var(--accent-violet)" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="var(--accent-emerald)" stopOpacity="0.4" />
                      </linearGradient>
                      <filter id="glow">
                        <feGaussianBlur stdDeviation="8" result="coloredBlur" />
                        <feMerge>
                          <feMergeNode in="coloredBlur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>
                    <path
                      d="M 100,100 C 100,50 150,20 200,20 C 250,20 300,50 300,100 C 300,150 250,180 200,180 C 150,180 100,150 100,100 Z"
                      fill="url(#blob)"
                      filter="url(#glow)"
                    />
                    <circle cx="200" cy="100" r="72" fill="none" stroke="url(#accentRing)" strokeWidth="1.5" opacity="0.6" />
                    <circle cx="200" cy="100" r="58" fill="none" stroke="url(#accentRing)" strokeWidth="0.8" opacity="0.3" strokeDasharray="4 6" />
                    {[
                      { cx: 130, cy: 55, r: 7, color: "var(--accent-gamer)" },
                      { cx: 160, cy: 85, r: 8, color: "var(--accent-violet)" },
                      { cx: 190, cy: 45, r: 6, color: "var(--accent-amber)" },
                      { cx: 220, cy: 70, r: 9, color: "var(--accent-emerald)" },
                      { cx: 250, cy: 50, r: 7, color: "var(--accent-gamer)" },
                      { cx: 270, cy: 90, r: 6, color: "var(--accent-violet)" },
                      { cx: 145, cy: 120, r: 8, color: "var(--accent-amber)" },
                      { cx: 175, cy: 140, r: 6, color: "var(--accent-emerald)" },
                      { cx: 210, cy: 130, r: 7, color: "var(--accent-gamer)" },
                      { cx: 240, cy: 145, r: 8, color: "var(--accent-violet)" },
                      { cx: 265, cy: 115, r: 6, color: "var(--accent-amber)" },
                      { cx: 155, cy: 65, r: 5, color: "var(--accent-emerald)" },
                    ].map((dot, i) => (
                      <circle key={i} cx={dot.cx} cy={dot.cy} r={dot.r} fill={dot.color} opacity="0.5" />
                    ))}
                  </svg>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card className="overflow-hidden">
            <CardContent className="p-7 md:p-9 space-y-6">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-lg font-semibold text-white">Projects</h3>
                <span className="text-[10px] font-semibold tracking-[0.18em] uppercase text-white/40">Studio Pipeline</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {projectCards.map((project) => (
                  <motion.div
                    key={project.id}
                    whileHover={{ y: -2 }}
                    className={`rounded-2xl border p-5 transition-all ${
                      project.active
                        ? "bg-accent-gamer-soft border-accent-gamer"
                        : "bg-white/5 border-white/10 hover:bg-white/8"
                    }`}
                  >
                      <div className="flex items-center gap-3">
                      <div
                        className={`relative flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl ${
                          project.active ? "bg-white text-[#0a0b0d]" : "bg-white/10 text-white"
                        }`}
                      >
                        <span className={`absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full ${project.dot} ring-2 ring-[color:var(--bg-primary)]`} />
                        <span className="text-[10px] font-medium opacity-80">Proj</span>
                        <span className="text-base font-bold leading-none">{project.code}</span>
                      </div>
                      <div>
                        <h4 className={`text-sm font-semibold ${project.active ? "text-accent-gamer-strong" : "text-white"}`}>
                          {project.title}
                        </h4>
                        <p className="text-[11px] text-white/50">{project.type}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <motion.div variants={fadeUp}>
            <Card className="h-full flex flex-col">
              <CardContent className="flex flex-1 flex-col p-8 md:p-10">
                <div className="flex-1 space-y-8">
                  {progressItems.map((item, i) => (
                    <div key={item.id} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl border flex items-center justify-center ${item.color} ${item.bg} ${item.border}`}>
                          <item.icon className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-white font-medium">{item.title}</h4>
                          <p className="text-xs text-white/50">Updated just now</p>
                        </div>
                      </div>

                      <div className="relative w-12 h-12">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="none" className="text-white/10" />
                          <motion.circle
                            cx="24"
                            cy="24"
                            r="20"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                            strokeDasharray="125.6"
                            initial={{ strokeDashoffset: 125.6 }}
                            animate={{ strokeDashoffset: 125.6 - (125.6 * item.value) / 100 }}
                            transition={{ duration: 1.5, delay: 0.5 + i * 0.2, ease: "easeOut" }}
                            className={item.color}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-white">{item.value}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="mt-8 w-full rounded-xl bg-white/5 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10 flex items-center justify-center gap-2"
                >
                  View Full Report <ChevronRight className="w-4 h-4" />
                </motion.button>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={fadeUp}>
            <Card className="h-full flex flex-col">
              <CardContent className="flex flex-1 flex-col p-8 md:p-10">
                <div className="flex flex-1 flex-col gap-8 pb-2 pt-1 lg:flex-row">
                  <div className="flex-1 space-y-3">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key="activity"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-4"
                      >
                        {recentActivity.map((item) => (
                          <div key={item.id} className="group flex cursor-pointer items-center justify-between rounded-xl p-4 transition-colors hover:bg-white/5">
                            <div className="flex items-center gap-3">
                              <div className={`flex h-10 w-10 items-center justify-center rounded-full border ${item.bg} ${item.border} transition-colors`}>
                                <Zap className={`h-4 w-4 ${item.accent}`} />
                              </div>
                              <div>
                                <h4 className="text-sm font-medium text-white">{item.title}</h4>
                                <p className="text-xs text-white/50">{item.desc}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={`text-sm font-bold ${item.accent}`}>{item.value}</span>
                              <p className="text-[10px] text-white/40">{item.time}</p>
                            </div>
                          </div>
                        ))}
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  <div className="flex w-full flex-col items-center justify-end pb-6 lg:w-1/3">
                    <div className="relative w-full h-32 flex items-end justify-between gap-2">
                      {[
                        { h: 40, color: "var(--accent-gamer)" },
                        { h: 70, color: "var(--accent-violet)" },
                        { h: 45, color: "var(--accent-amber)" },
                        { h: 90, color: "var(--accent-emerald)" },
                        { h: 60, color: "var(--accent-gamer)" },
                      ].map((bar, i) => (
                        <motion.div
                          key={i}
                          className="w-full rounded-t-md relative group"
                          style={{ background: `linear-gradient(to top, ${bar.color}22, ${bar.color}44)` }}
                          initial={{ height: 0 }}
                          animate={{ height: `${bar.h}%` }}
                          transition={{ duration: 1, delay: 0.5 + i * 0.1, type: "spring" }}
                        >
                          <div
                            className="absolute inset-0 rounded-t-md opacity-0 transition-opacity group-hover:opacity-100"
                            style={{ background: `linear-gradient(to top, transparent, ${bar.color}55)` }}
                          />
                          <div
                            className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full"
                            style={{ background: bar.color }}
                          />
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] font-bold py-0.5 px-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            {bar.h}%
                          </div>
                        </motion.div>
                      ))}
                    </div>
                    <div className="w-full flex justify-between mt-2 text-[10px] text-white/40">
                      <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>

      {surveyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="survey-modal-title"
            className="w-full max-w-md rounded-3xl border border-white/12 bg-[#0f1117] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.45)]"
          >
            <div className="space-y-3">
              <p className="text-accent-gamer-strong text-[11px] font-semibold uppercase tracking-[0.2em]">
                Survey Required
              </p>
              <h2 id="survey-modal-title" className="text-2xl font-semibold text-white">
                Finish your MouseFit survey
              </h2>
              <p className="text-sm leading-relaxed text-white/60">
                Your dashboard is ready, but we still need your survey answers before we can personalize the MouseFit experience.
              </p>
            </div>

            {surveyModalError && (
              <p className="mt-4 rounded-xl border px-3.5 py-3 text-sm" style={{ borderColor: "var(--tone-warning-line)", background: "var(--tone-warning-fill)", color: "var(--tone-warning-text)" }}>
                {surveyModalError}
              </p>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                ref={primaryActionRef}
                type="button"
                onClick={() => router.push("/survey")}
                className="flex-1 rounded-2xl border border-accent-gamer bg-accent-gamer-soft px-4 py-3 text-sm font-semibold text-white transition hover-accent-gamer-strong"
              >
                Start Survey
              </button>
              <button
                type="button"
                onClick={() => void handleRemindLater()}
                disabled={surveyModalBusy}
                className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {surveyModalBusy ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </span>
                ) : (
                  "Remind me later"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
