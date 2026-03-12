"use client";

import Sidebar from "./Sidebar";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative h-screen w-full overflow-hidden bg-theme-primary">
      <div
        className="fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse at 14% 8%, rgba(255, 255, 255, 0.04) 0%, transparent 58%), radial-gradient(ellipse at 84% 88%, rgba(255, 255, 255, 0.03) 0%, transparent 62%)",
        }}
      />
      <div
        className="fixed inset-0 -z-10 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative flex h-full w-full overflow-hidden">
        <Sidebar />

        <div className="relative flex-1 min-h-0 min-w-0 overflow-hidden">
          <main className="h-full min-h-0 overflow-y-auto scrollbar-hide px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
