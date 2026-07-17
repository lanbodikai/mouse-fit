"use client";

import Sidebar from "./Sidebar";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell-theme relative h-dvh w-full overflow-hidden bg-[var(--shell-bg)] text-[var(--shell-text-primary)]">
      <div className="relative flex h-full min-h-0 w-full">
        <Sidebar />

        <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
          <main className="shell-scroll h-full min-h-0 overflow-y-auto px-3 pb-24 pt-4 sm:px-5 sm:pt-5 md:pb-6 lg:px-7 lg:py-7">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
