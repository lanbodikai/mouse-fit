"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

export type ShellCorners = "rounded" | "square";
export type ShellVariant = "default" | "glass";
export type ShellLayout = "standard" | "wide" | "tool";
export type ShellTone = "default" | "accent" | "warning" | "danger";

type ShellPageProps = {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
  corners?: ShellCorners;
  variant?: ShellVariant;
  layout?: ShellLayout;
};

type ShellPanelProps = {
  title?: string;
  description?: string;
  className?: string;
  children?: ReactNode;
  corners?: ShellCorners;
  variant?: ShellVariant;
  tone?: ShellTone;
};

const widthByLayout: Record<ShellLayout, string> = {
  standard: "max-w-6xl",
  wide: "max-w-[1480px]",
  tool: "max-w-[1560px]",
};

const toneClass: Record<ShellTone, string> = {
  default:
    "border-[var(--shell-border-strong)] bg-[var(--shell-surface-raised)]",
  accent:
    "border-[var(--shell-accent-outline)] bg-[var(--shell-accent-soft)]",
  warning:
    "border-[var(--tone-warning-line)] bg-[var(--tone-warning-fill)]",
  danger:
    "border-[var(--tone-danger-line)] bg-[var(--tone-danger-fill)]",
};

export function ShellPage({
  eyebrow,
  title,
  description,
  actions,
  children,
  layout = "standard",
}: ShellPageProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0.45, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
      className={`mx-auto flex w-full ${widthByLayout[layout]} flex-col gap-5 text-[var(--shell-text-primary)]`}
    >
      <header className="shell-content-header shell-page-header flex flex-col gap-4 border-b border-[var(--shell-border-strong)] pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="mb-2 text-xs font-medium text-[var(--shell-accent-strong)]">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="text-[2rem] font-semibold leading-tight text-[var(--shell-text-primary)] sm:text-[2.55rem]">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--shell-text-secondary)] sm:text-[0.96rem]">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </header>

      {children}
    </motion.div>
  );
}

export function ShellPanel({
  title,
  description,
  className,
  children,
  tone = "default",
}: ShellPanelProps) {
  return (
    <section className={`rounded-lg border p-4 sm:p-5 ${toneClass[tone]} ${className || ""}`}>
      {title || description ? (
        <div className={children ? "mb-4" : ""}>
          {title ? (
            <h2 className="text-base font-semibold text-[var(--shell-text-primary)]">
              {title}
            </h2>
          ) : null}
          {description ? (
            <p className="mt-1.5 text-sm leading-6 text-[var(--shell-text-secondary)]">
              {description}
            </p>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
