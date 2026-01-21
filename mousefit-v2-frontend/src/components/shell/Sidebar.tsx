"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Database, FileText, Hand, Ruler, Settings, User } from "lucide-react";
import { useState } from "react";

const tools = [
  { href: "/grip", label: "Mouse Grip Checker", icon: Hand },
  { href: "/measure", label: "Mouse Measure Checker", icon: Ruler },
  { href: "/database", label: "Mouse Database", icon: Database },
  { href: "/report", label: "Report Page", icon: FileText },
  { href: "/agent", label: "AI Agent", icon: Bot },
];

function isPathActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export default function Sidebar() {
  const pathname = usePathname();
  const [toolsOpen, setToolsOpen] = useState(false);

  return (
    <aside className="relative flex h-full w-[88px] flex-col items-center gap-6 rounded-[32px] border border-white/10 bg-[color:var(--panel)] px-3 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <Link
        href="/"
        className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/10 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
        aria-label="MouseFit Home"
      >
        MF
      </Link>

      <div className="flex flex-col items-center gap-4">
        {[
          { href: "/user", icon: User, label: "User" },
          { href: "/settings", icon: Settings, label: "Settings" },
        ].map((item) => {
          const active = isPathActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex h-11 w-11 items-center justify-center rounded-2xl border transition ${
                active
                  ? "border-white/30 bg-white/10 text-white"
                  : "border-white/10 text-[color:var(--icon-muted)] hover:border-white/25 hover:text-white"
              }`}
              aria-label={item.label}
            >
              <Icon className="h-5 w-5" />
            </Link>
          );
        })}
      </div>

      <div className="relative mt-auto flex flex-col items-center gap-3 pb-2">
        <button
          type="button"
          onClick={() => setToolsOpen((prev) => !prev)}
          className={`flex h-11 w-11 items-center justify-center rounded-2xl border text-[0.5rem] uppercase leading-none tracking-[0.2em] transition ${
            toolsOpen
              ? "border-white/30 bg-white/10 text-white"
              : "border-white/10 text-[color:var(--icon-muted)] hover:border-white/25 hover:text-white"
          }`}
          aria-expanded={toolsOpen}
          aria-label="Toggle tools"
        >
          Tools
        </button>

        <div
          className={`absolute bottom-14 left-full ml-4 w-60 origin-left rounded-[24px] border border-white/10 bg-[#0e0f12]/95 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur transition ${
            toolsOpen ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
          }`}
        >
          <div className="text-[0.65rem] uppercase tracking-[0.35em] text-white/45">Tools</div>
          <div className="mt-3 space-y-2">
            {tools.map((tool) => {
              const active = isPathActive(pathname, tool.href);
              const Icon = tool.icon;
              return (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className={`flex items-center gap-3 rounded-2xl border px-3 py-2 text-sm transition ${
                    active
                      ? "border-white/30 bg-white/10 text-white"
                      : "border-white/10 text-white/60 hover:border-white/25 hover:text-white"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? "text-white" : "text-white/50"}`} />
                  <span>{tool.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}
