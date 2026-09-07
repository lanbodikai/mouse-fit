import Link from "next/link";
import { ArrowRight, CalendarClock } from "lucide-react";
import { ShellPage, ShellPanel } from "@/components/layout/ShellPage";

export default function SchedulesPage() {
  return (
    <ShellPage
      eyebrow="Reserved route"
      title="Schedules"
      description="MouseFit does not currently use scheduled sessions. Continue with an active fit workflow instead."
    >
      <ShellPanel>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-[var(--shell-surface-soft)]">
            <CalendarClock className="h-5 w-5 text-[var(--shell-accent-strong)]" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-[var(--shell-text-primary)]">No scheduling workflow is available</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--shell-text-secondary)]">
              Your survey, measurements, grip scan, and report can be completed at any time.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/database" className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--shell-border-strong)] px-4 text-sm font-semibold text-[var(--shell-text-primary)]">
              Database
            </Link>
            <Link href="/survey" className="inline-flex h-10 items-center gap-2 rounded-md bg-[var(--shell-accent)] px-4 text-sm font-semibold text-[var(--shell-text-inverse)]">
              Start survey
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </ShellPanel>
    </ShellPage>
  );
}
