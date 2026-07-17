"use client";

import { FormEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Loader2, Send, Sparkles, Trash2 } from "lucide-react";
import { useAuthGate } from "@/components/auth/AuthGateProvider";
import { chat } from "@/lib/api";
import { useAuthState } from "@/hooks/useAuthState";
import { ShellPanel } from "@/components/layout/ShellPage";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type DashboardAiAssistantProps = {
  initialPrompt?: string;
  autoRunInitialPrompt?: boolean;
  className?: string;
};

const QUICK_PROMPTS = [
  "What mouse shape usually fits a relaxed claw grip?",
  "Compare G Pro X Superlight 2 and Viper V3 Pro for medium hands.",
  "What should I prioritize if I want a lighter mouse under $100?",
];

const SYSTEM_PROMPT =
  "You are MouseFit AI. Use the MouseFit catalog to answer questions about fit, shape, weight, size, and shortlist tradeoffs. Keep answers concise and practical.";

const INTRO_MESSAGE =
  "Ask about fit, shape, weight, or comparisons. I answer from the current MouseFit mouse catalog and turn it into a shorter shortlist.";

function buildIntroMessage(): ChatMessage {
  return {
    role: "assistant",
    content: INTRO_MESSAGE,
  };
}

export default function DashboardAiAssistant({
  initialPrompt = "",
  autoRunInitialPrompt = false,
  className,
}: DashboardAiAssistantProps) {
  const pathname = usePathname();
  const { isAuthenticated } = useAuthState();
  const { requireAuth } = useAuthGate();
  const [input, setInput] = useState(initialPrompt);
  const [messages, setMessages] = useState<ChatMessage[]>([buildIntroMessage()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const autoRunPromptRef = useRef<string | null>(null);

  useEffect(() => {
    if (initialPrompt) {
      setInput(initialPrompt);
    }
  }, [initialPrompt]);

  useEffect(() => {
    const container = messageListRef.current;
    if (!container) return;

    container.scrollTop = container.scrollHeight;
  }, [busy, messages]);

  function buildAssistantPath(prompt: string): string {
    const params = new URLSearchParams();
    params.set("assistant", "open");
    if (prompt.trim()) {
      params.set("q", prompt.trim());
    }
    return `${pathname}?${params.toString()}`;
  }

  const submitPrompt = useCallback(async (prompt: string) => {
    const normalizedPrompt = prompt.trim();
    if (!normalizedPrompt || busy) return;

    const previousMessages = messages;
    const nextMessages: ChatMessage[] = [...previousMessages, { role: "user", content: normalizedPrompt }];

    setMessages(nextMessages);
    setInput("");
    setBusy(true);
    setError(null);

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

      setMessages([...nextMessages, { role: "assistant", content: response.reply }]);
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "MouseFit AI could not answer right now.";

      setError(message);
      setMessages(nextMessages);
      setInput(normalizedPrompt);
    } finally {
      setBusy(false);
    }
  }, [busy, messages]);

  async function handleSubmit(event?: FormEvent<HTMLFormElement>, promptOverride?: string) {
    event?.preventDefault();

    const prompt = (promptOverride ?? input).trim();
    if (!prompt || busy) return;

    if (!isAuthenticated) {
      requireAuth(() => {
        void submitPrompt(prompt);
      }, {
        next: buildAssistantPath(prompt),
        title: "Create an account to talk with MouseFit AI",
        description: "Continue with Google, Discord, or GitHub to run comparisons, ask fit questions, and keep your workflow in sync.",
      });
      return;
    }

    await submitPrompt(prompt);
  }

  function handleReset() {
    setMessages([buildIntroMessage()]);
    setInput(initialPrompt);
    setError(null);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    void handleSubmit();
  }

  useEffect(() => {
    if (!autoRunInitialPrompt || !isAuthenticated) return;
    const normalizedPrompt = initialPrompt.trim();
    if (!normalizedPrompt || busy) return;
    if (autoRunPromptRef.current === normalizedPrompt) return;
    autoRunPromptRef.current = normalizedPrompt;
    void submitPrompt(normalizedPrompt);
  }, [autoRunInitialPrompt, busy, initialPrompt, isAuthenticated, submitPrompt]);

  const panelClassName = className
    ? `flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden ${className}`
    : "flex min-h-[620px] flex-col";

  return (
    <ShellPanel variant="glass" className={panelClassName}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-[var(--shell-accent-strong)]">
            <Sparkles className="h-3.5 w-3.5" />
            MouseFit AI
          </div>
          <h2 className="mt-3 text-xl font-semibold tracking-tight text-[var(--shell-text-primary)]">Catalog Assistant</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--shell-text-secondary)]">
            Ask for fit, shape, weight, or comparisons from the current mouse database.
          </p>
          {!isAuthenticated ? (
            <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-[var(--shell-text-tertiary)]">
              Sign up required to chat
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="mf-glass-button inline-flex h-10 w-10 items-center justify-center rounded-md"
            aria-label="Clear AI chat"
            title="Clear AI chat"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => void handleSubmit(undefined, prompt)}
            disabled={busy}
            className="mf-glass-button rounded-md px-3 py-2 text-left text-xs font-medium leading-5 text-[var(--shell-text-secondary)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {prompt}
          </button>
        ))}
      </div>

      <div
        ref={messageListRef}
        className="mf-glass-scroll mt-4 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1"
      >
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`max-w-[92%] rounded-md border px-4 py-3 text-sm leading-6 ${
              message.role === "assistant"
                ? "mf-glass-panel-soft text-[var(--shell-text-primary)]"
                : "shell-accent-surface ml-auto"
            }`}
          >
            <p className="mb-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] opacity-50">
              {message.role === "assistant" ? "MouseFit AI" : "You"}
            </p>
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
        ))}

        {busy ? (
          <div className="mf-glass-panel-soft max-w-[92%] rounded-md px-4 py-3 text-sm text-[var(--shell-text-secondary)]">
            <div className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Thinking...
            </div>
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="mt-4 rounded-md border border-[rgba(187,88,104,0.24)] bg-[rgba(187,88,104,0.12)] px-4 py-3 text-sm text-[var(--tone-danger-text)]">
          {error}
        </div>
      ) : null}

      <form onSubmit={(event) => void handleSubmit(event)} className="mt-4 flex flex-col gap-3">
        <div className="mf-glass-input rounded-md p-2">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Ask MouseFit AI about fit, shape, weight, or comparisons"
            className="min-h-[112px] w-full resize-none rounded border-0 bg-transparent px-3 py-2 text-sm leading-6 text-[var(--shell-text-primary)] outline-none placeholder:text-[var(--shell-text-tertiary)]"
          />
        </div>

        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="mf-glass-button mf-glass-button-primary inline-flex items-center justify-center gap-2 rounded-md px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Send question
        </button>
      </form>
    </ShellPanel>
  );
}
