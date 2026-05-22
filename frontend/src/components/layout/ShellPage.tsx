import type { ReactNode } from "react";

export type ShellCorners = "rounded" | "square";
export type ShellVariant = "default" | "glass";

type ShellPageProps = {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
  /** `square` removes large radii for a flat, grid-like shell (e.g. dashboard). */
  corners?: ShellCorners;
  variant?: ShellVariant;
};

type ShellPanelProps = {
  title?: string;
  description?: string;
  className?: string;
  children?: ReactNode;
  corners?: ShellCorners;
  variant?: ShellVariant;
};

function heroSectionClass(corners: ShellCorners, variant: ShellVariant): string {
  if (variant === "glass") {
    return corners === "square"
      ? "mf-glass-panel rounded-[26px] p-3 sm:p-4"
      : "mf-glass-panel rounded-[34px] p-3 sm:p-4";
  }

  if (corners === "square") {
    return "shell-surface-raised rounded-[24px] p-5 sm:p-6";
  }
  return "shell-surface-raised rounded-[34px] p-5 sm:p-6";
}

function panelSectionClass(corners: ShellCorners, variant: ShellVariant): string {
  if (variant === "glass") {
    return corners === "square"
      ? "mf-glass-panel-soft rounded-[24px] p-5 sm:p-6"
      : "mf-glass-panel-soft rounded-[28px] p-5 sm:p-6";
  }

  if (corners === "square") {
    return "shell-surface-soft rounded-[22px] p-5 sm:p-6";
  }
  return "shell-surface-soft rounded-[30px] p-5 sm:p-6";
}

export function ShellPage({
  eyebrow = "Mouse Fit",
  title,
  description,
  actions,
  children,
  corners = "rounded",
  variant = "default",
}: ShellPageProps) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 text-[var(--shell-text-primary)]">
      <section className={heroSectionClass(corners, variant)}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-[var(--shell-text-tertiary)]">
              {eyebrow}
            </p>
            <h1 className="mt-2 text-[1.65rem] font-semibold leading-none tracking-tight text-[var(--shell-text-primary)] sm:text-[2.15rem]">
              {title}
            </h1>
            {description ? (
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--shell-text-secondary)] sm:text-[0.98rem]">
                {description}
              </p>
            ) : null}
          </div>

          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div> : null}
        </div>
      </section>

      {children}
    </div>
  );
}

export function ShellPanel({
  title,
  description,
  className,
  children,
  corners = "rounded",
  variant = "default",
}: ShellPanelProps) {
  return (
    <section className={`${panelSectionClass(corners, variant)} ${className || ""}`}>
      {title || description ? (
        <div className="mb-5">
          {title ? <h2 className="text-lg font-semibold tracking-tight text-[var(--shell-text-primary)]">{title}</h2> : null}
          {description ? (
            <p className="mt-2 text-sm leading-6 text-[var(--shell-text-secondary)]">
              {description}
            </p>
          ) : null}
        </div>
      ) : null}

      {children}
    </section>
  );
}
