"use client";

import Sidebar from "./Sidebar";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell-theme shell-paper relative h-screen w-full overflow-hidden bg-[var(--shell-bg)] text-[var(--shell-text-primary)]">
      <div className="shell-backdrop pointer-events-none fixed inset-0 -z-20" />

      <div className="relative h-full w-full p-3 sm:p-4 lg:p-5">
        <div className="shell-canvas relative flex h-full w-full overflow-hidden rounded-[28px] sm:rounded-[32px]">
          <Sidebar />

          <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
            <main className="shell-scroll h-full min-h-0 overflow-y-auto px-3 py-4 scrollbar-hide sm:px-5 sm:py-5 lg:px-6 lg:py-6">
              {children}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
