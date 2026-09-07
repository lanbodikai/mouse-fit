"use client";

import Image from "next/image";
import {
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Loader2, Send, Trash2, X } from "lucide-react";
import { chat } from "@/lib/api";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type DragonCatalogAssistantProps = {
  initialPrompt?: string;
  autoRunInitialPrompt?: boolean;
};

const SYSTEM_PROMPT =
  "You are the MouseFit catalog dragon assistant. Use the MouseFit catalog to answer questions about fit, shape, weight, size, and shortlist tradeoffs. Keep answers concise, friendly, and practical.";

const INTRO_MESSAGE =
  "Hi! Ask me about mouse fit, shapes, weights, or comparisons.";

function buildIntroMessage(): ChatMessage {
  return {
    role: "assistant",
    content: INTRO_MESSAGE,
  };
}

function minimumThinkingDelay(startedAt: number): Promise<void> {
  const remaining = Math.max(0, 500 - (Date.now() - startedAt));
  return new Promise((resolve) => window.setTimeout(resolve, remaining));
}

export function DragonCatalogAssistant({
  initialPrompt = "",
  autoRunInitialPrompt = false,
}: DragonCatalogAssistantProps) {
  const reduceMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const autoRunPromptRef = useRef<string | null>(null);
  const suppressHoverRef = useRef(false);
  const pointerInteractionRef = useRef(false);

  const [input, setInput] = useState(initialPrompt);
  const [messages, setMessages] = useState<ChatMessage[]>([buildIntroMessage()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoverOpen, setHoverOpen] = useState(false);
  const [pinnedOpen, setPinnedOpen] = useState(autoRunInitialPrompt);

  const isOpen = hoverOpen || pinnedOpen;
  const showActiveDragon = isOpen || busy;

  useEffect(() => {
    if (initialPrompt) setInput(initialPrompt);
  }, [initialPrompt]);

  useEffect(() => {
    if (autoRunInitialPrompt) setPinnedOpen(true);
  }, [autoRunInitialPrompt]);

  useEffect(() => {
    if (!pinnedOpen) return;
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [pinnedOpen]);

  useEffect(() => {
    const container = messageListRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [busy, messages]);

  useEffect(() => {
    if (!pinnedOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (rootRef.current?.contains(event.target as Node)) return;
      setPinnedOpen(false);
      setHoverOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [pinnedOpen]);

  useEffect(() => {
    if (!isOpen) return;

    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") return;
      suppressHoverRef.current = true;
      setPinnedOpen(false);
      setHoverOpen(false);
      triggerRef.current?.focus();
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  const submitPrompt = useCallback(
    async (prompt: string) => {
      const normalizedPrompt = prompt.trim();
      if (!normalizedPrompt || busy) return;

      const previousMessages = messages;
      const nextMessages: ChatMessage[] = [
        ...previousMessages,
        { role: "user", content: normalizedPrompt },
      ];

      setPinnedOpen(true);
      setMessages(nextMessages);
      setInput("");
      setBusy(true);
      setError(null);
      const startedAt = Date.now();

      try {
        const response = await chat({
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...previousMessages.map((message) => ({
              role: message.role,
              content: message.content,
            })),
            { role: "user", content: normalizedPrompt },
          ],
        });

        await minimumThinkingDelay(startedAt);
        setMessages([
          ...nextMessages,
          { role: "assistant", content: response.reply },
        ]);
      } catch (submitError) {
        await minimumThinkingDelay(startedAt);
        const message =
          submitError instanceof Error
            ? submitError.message
            : "I could not answer right now. Please try again.";

        setError(message);
        setMessages(nextMessages);
        setInput(normalizedPrompt);
      } finally {
        setBusy(false);
      }
    },
    [busy, messages],
  );

  useEffect(() => {
    if (!autoRunInitialPrompt) return;
    const normalizedPrompt = initialPrompt.trim();
    if (!normalizedPrompt || busy) return;
    if (autoRunPromptRef.current === normalizedPrompt) return;

    autoRunPromptRef.current = normalizedPrompt;
    void submitPrompt(normalizedPrompt);
  }, [autoRunInitialPrompt, busy, initialPrompt, submitPrompt]);

  function handleSubmit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const prompt = input.trim();
    if (!prompt || busy) return;
    void submitPrompt(prompt);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key !== "Enter" ||
      event.shiftKey ||
      event.nativeEvent.isComposing
    ) {
      return;
    }

    event.preventDefault();
    handleSubmit();
  }

  function handleReset() {
    setMessages([buildIntroMessage()]);
    setInput("");
    setError(null);
  }

  function closeAssistant() {
    suppressHoverRef.current = true;
    setPinnedOpen(false);
    setHoverOpen(false);
    triggerRef.current?.focus();
  }

  function handleTriggerClick() {
    if (pinnedOpen) {
      closeAssistant();
      return;
    }

    suppressHoverRef.current = false;
    setPinnedOpen(true);
  }

  function handleMouseEnter() {
    if (suppressHoverRef.current) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      return;
    }
    setHoverOpen(true);
  }

  function handleMouseLeave() {
    suppressHoverRef.current = false;
    setHoverOpen(false);
  }

  return (
    <div
      ref={rootRef}
      className="fixed bottom-[88px] right-3 z-50 flex flex-col items-end sm:right-4 md:bottom-6 md:right-6"
      onPointerEnter={handleMouseEnter}
      onPointerLeave={handleMouseLeave}
    >
      <AnimatePresence>
        {isOpen ? (
          <motion.section
            id="dragon-catalog-chat"
            role="dialog"
            aria-label="Dragon catalog assistant"
            initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="mf-glass-modal absolute bottom-[calc(100%+0.25rem)] right-0 flex w-[calc(100vw-1.5rem)] max-w-[360px] flex-col overflow-hidden rounded-lg border border-[var(--shell-border-strong)] p-3 shadow-[var(--shell-shadow-raised)] sm:p-4"
            style={{ height: "min(430px, calc(100dvh - 220px))" }}
          >
            <div className="flex items-center justify-between gap-3 border-b border-[var(--shell-border-strong)] pb-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--shell-text-primary)]">
                  Ask me anything
                </p>
                <p className="mt-0.5 truncate text-xs text-[var(--shell-text-tertiary)]">
                  Fit, shapes, weights, or comparisons
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleReset}
                  className="mf-glass-button inline-flex h-8 w-8 items-center justify-center rounded-md"
                  aria-label="Clear dragon chat"
                  title="Clear chat"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={closeAssistant}
                  className="mf-glass-button inline-flex h-8 w-8 items-center justify-center rounded-md"
                  aria-label="Close dragon chat"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div
              ref={messageListRef}
              className="mf-glass-scroll mt-3 flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-1"
              aria-live="polite"
            >
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`max-w-[88%] rounded-md border px-3 py-2.5 text-sm leading-5 ${
                    message.role === "assistant"
                      ? "mf-glass-panel-soft text-[var(--shell-text-primary)]"
                      : "shell-accent-surface ml-auto"
                  }`}
                >
                  <p className="mb-1 text-[0.64rem] font-semibold uppercase tracking-[0.16em] opacity-50">
                    {message.role === "assistant" ? "Dragon" : "You"}
                  </p>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              ))}

              {busy ? (
                <div className="mf-glass-panel-soft max-w-[88%] rounded-md px-3 py-2.5 text-sm text-[var(--shell-text-secondary)]">
                  <div className="inline-flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Thinking...
                  </div>
                </div>
              ) : null}
            </div>

            {error ? (
              <div className="mt-2 rounded-md border border-[rgba(187,88,104,0.24)] bg-[rgba(187,88,104,0.12)] px-3 py-2 text-xs leading-5 text-[var(--tone-danger-text)]">
                {error}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="mt-3 flex items-end gap-2">
              <div className="mf-glass-input min-w-0 flex-1 rounded-md p-1.5">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleInputKeyDown}
                  placeholder="Type your question..."
                  className="max-h-24 min-h-12 w-full resize-none border-0 bg-transparent px-2 py-1.5 text-sm leading-5 text-[var(--shell-text-primary)] outline-none placeholder:text-[var(--shell-text-tertiary)]"
                />
              </div>
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[var(--shell-accent)] text-[var(--shell-text-inverse)] transition disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Send question"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </form>
          </motion.section>
        ) : (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none mb-1.5 mr-1 rounded-full border border-[var(--shell-border-strong)] bg-[var(--shell-surface-raised)] px-3 py-1.5 text-xs font-semibold text-[var(--shell-text-primary)] shadow-[var(--shell-shadow-soft)]"
          >
            Ask me anything
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        ref={triggerRef}
        type="button"
        onPointerDown={() => {
          pointerInteractionRef.current = true;
        }}
        onClick={() => {
          pointerInteractionRef.current = false;
          handleTriggerClick();
        }}
        onFocus={() => {
          if (suppressHoverRef.current) {
            suppressHoverRef.current = false;
            return;
          }
          if (pointerInteractionRef.current || pinnedOpen) return;
          setPinnedOpen(true);
        }}
        aria-label={isOpen ? "Close dragon assistant" : "Open dragon assistant"}
        aria-expanded={isOpen}
        aria-controls="dragon-catalog-chat"
        className="relative h-28 w-28 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--shell-accent)] sm:h-32 sm:w-32 lg:h-36 lg:w-36"
        animate={
          busy && !reduceMotion
            ? { y: [0, -4, 0], rotate: [0, -1.5, 1.5, 0] }
            : { y: 0, rotate: 0 }
        }
        transition={
          busy && !reduceMotion
            ? { duration: 0.7, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0.18 }
        }
      >
        <Image
          src="/images/dragon-assistant/dragon-idle.png"
          alt=""
          fill
          unoptimized
          priority
          draggable={false}
          style={{ imageRendering: "pixelated" }}
          className={`object-contain transition-opacity duration-150 ${
            showActiveDragon ? "opacity-0" : "opacity-100"
          }`}
          sizes="(max-width: 639px) 112px, (max-width: 1023px) 128px, 144px"
        />
        <Image
          src="/images/dragon-assistant/dragon-active.png"
          alt=""
          fill
          unoptimized
          priority
          draggable={false}
          style={{ imageRendering: "pixelated" }}
          className={`object-contain transition-opacity duration-150 ${
            showActiveDragon ? "opacity-100" : "opacity-0"
          }`}
          sizes="(max-width: 639px) 112px, (max-width: 1023px) 128px, 144px"
        />
      </motion.button>
    </div>
  );
}
