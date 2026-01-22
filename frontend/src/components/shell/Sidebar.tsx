"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Database, FileText, Hand, Home, Ruler, Settings, User } from "lucide-react";

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

  return (
    <aside className="relative flex h-[585px] w-[88px] flex-col items-center gap-6 rounded-[32px] bg-[#06080b] px-3 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <Link
        href="/"
        className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-[#06080b] text-sm font-semibold text-white/80 shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition hover:bg-white/15 hover:text-white"
        aria-label="MouseFit Home"
      >
        <Image
          src="/9.png"
          alt="MouseFit"
          width={40}
          height={40}
          className="h-10 w-10 rounded-full object-cover"
        />
      </Link>

      <div className="flex flex-col items-center gap-4">
        {[
          { href: "/", icon: Home, label: "Home" },
          { href: "/user", icon: User, label: "User" },
          { href: "/settings", icon: Settings, label: "Settings" },
        ].map((item) => {
          const active = isPathActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex h-11 w-11 items-center justify-center rounded-2xl transition ${
                active
                  ? "bg-white text-[#06080b]"
                  : "bg-[#06080b] text-white/70 hover:bg-white/15 hover:text-white"
              }`}
              aria-label={item.label}
            >
              <Icon className="h-5 w-5" />
            </Link>
          );
        })}
      </div>

      <div className="mt-auto flex flex-col items-center gap-3 pb-2">
        {tools.map((tool) => {
          const active = isPathActive(pathname, tool.href);
          const Icon = tool.icon;
          return (
            <Link
              key={tool.href}
              href={tool.href}
              className={`flex h-11 w-11 items-center justify-center rounded-2xl transition ${
                active
                  ? "bg-white text-[#06080b]"
                  : "bg-[#06080b] text-white/70 hover:bg-white/15 hover:text-white"
              }`}
              aria-label={tool.label}
              title={tool.label}
            >
              <Icon className="h-5 w-5" />
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
