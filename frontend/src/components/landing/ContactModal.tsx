"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

type ContactModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

type SubmitState = "idle" | "submitting" | "success" | "error";

type ContactApiResponse =
  | { ok: true }
  | { ok: false; error?: string };

function isContactApiResponse(v: unknown): v is ContactApiResponse {
  if (!v || typeof v !== "object") return false;
  return typeof (v as { ok?: unknown }).ok === "boolean";
}

export function ContactModal({ isOpen, onClose }: ContactModalProps) {
  return (
    <AnimatePresence>
      {isOpen && <ContactModalInner onClose={onClose} />}
    </AnimatePresence>
  );
}

function ContactModalInner({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [errorText, setErrorText] = useState<string>("");
  const initialFocusRef = useRef<HTMLInputElement | null>(null);

  const canSubmit = useMemo(() => {
    if (!name.trim() || !email.trim() || !message.trim()) return false;
    return submitState !== "submitting";
  }, [name, email, message, submitState]);

  useEffect(() => {
    const t = setTimeout(() => initialFocusRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitState("submitting");
    setErrorText("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      const data: unknown = await res.json().catch(() => null);
      const parsed = isContactApiResponse(data) ? data : null;

      if (!res.ok || !parsed?.ok) {
        setSubmitState("error");
        setErrorText(parsed && "error" in parsed ? parsed.error ?? "Failed to send message" : "Failed to send message");
        return;
      }

      setSubmitState("success");
      // Clear the form on success so a re-open starts fresh.
      setName("");
      setEmail("");
      setMessage("");
    } catch {
      setSubmitState("error");
      setErrorText("Failed to send message");
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[10000]"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/70"
        aria-label="Close contact form"
      />

      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="absolute left-1/2 top-1/2 w-[min(560px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-zinc-950/80 p-6 shadow-2xl backdrop-blur"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-light text-white">Contact us</h2>
            <p className="mt-1 text-sm text-white/50">
              Send a message and we&apos;ll get back to you.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {submitState === "success" ? (
          <div className="mt-6 rounded-xl border border-green-500/20 bg-green-500/10 p-4">
            <p className="text-sm text-white">
              Thanks! Your message was sent successfully.
            </p>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full bg-green-500 px-5 py-2 text-sm text-black hover:bg-green-400 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs tracking-[0.2em] uppercase text-white/40">
                  Name
                </span>
                <input
                  ref={initialFocusRef}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-green-500/50"
                  placeholder="Your name"
                  autoComplete="name"
                  required
                  maxLength={120}
                />
              </label>

              <label className="block">
                <span className="text-xs tracking-[0.2em] uppercase text-white/40">
                  Email
                </span>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-green-500/50"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  maxLength={254}
                  type="email"
                />
              </label>
            </div>

            <label className="block">
              <span className="text-xs tracking-[0.2em] uppercase text-white/40">
                Message
              </span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="mt-2 min-h-[140px] w-full resize-none rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-green-500/50"
                placeholder="How can we help?"
                required
                maxLength={5000}
              />
            </label>

            {submitState === "error" && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-white/80">
                {errorText || "Failed to send message"}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/15 bg-white/5 px-5 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                disabled={submitState === "submitting"}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-full bg-green-500 px-5 py-2 text-sm text-black hover:bg-green-400 transition-colors disabled:opacity-60 disabled:hover:bg-green-500"
                disabled={!canSubmit}
              >
                {submitState === "submitting" ? "Sending..." : "Send"}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}
