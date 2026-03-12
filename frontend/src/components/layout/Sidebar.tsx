"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Database, Hand, Home, Ruler, Settings, User } from "lucide-react";
import { motion } from "framer-motion";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  activeMatch?: string[];
};

type NavGroup = {
  heading: string;
  items: NavItem[];
  dotColor: string;
};

const navGroups: NavGroup[] = [
  {
    heading: "Main",
    dotColor: "bg-[color:var(--accent-gamer)]",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: Home, activeMatch: ["/dashboard", "/schedules"] },
      { href: "/user", label: "Account", icon: User },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
  {
    heading: "MouseFit",
    dotColor: "bg-[color:var(--accent-violet)]",
    items: [
      { href: "/database", label: "Database", icon: Database },
    ],
  },
  {
    heading: "Additional Tools",
    dotColor: "bg-[color:var(--accent-amber)]",
    items: [
      { href: "/grip", label: "Grip Checker", icon: Hand },
      { href: "/measure", label: "Hand Measure", icon: Ruler },
      { href: "/agent", label: "MSF Agent", icon: Bot },
    ],
  },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.activeMatch) {
    return item.activeMatch.some(
      (m) => pathname === m || pathname.startsWith(m + "/"),
    );
  }
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="h-full w-[216px] shrink-0 overflow-y-auto border-r border-theme bg-[color:var(--surface-soft)] px-4 py-6 backdrop-blur-xl scrollbar-hide">
      {/* Logo */}
      <Link href="/" className="mb-8 flex items-center gap-2.5 px-1.5">
        <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-md bg-gradient-to-br from-[#3f3f46] to-[#a1a1aa]">
          <Image
            src="/9.png"
            alt="MouseFit"
            width={28}
            height={28}
            className="h-full w-full object-cover mix-blend-overlay"
          />
        </div>
        <span className="text-lg font-bold tracking-tight text-theme-primary">MouseFit.</span>
      </Link>

      {navGroups.map((group) => (
        <div key={group.heading} className="mb-8">
          <h3 className="mb-2.5 flex items-center gap-1.5 px-1.5 text-[9px] font-semibold uppercase tracking-[0.15em] text-white/30">
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${group.dotColor}`} />
            {group.heading}
          </h3>
          <nav className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = isActive(pathname, item);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors ${
                    active ? "text-white" : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute inset-0 rounded-lg border border-accent-gamer bg-accent-gamer-soft"
                      initial={false}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <Icon className="relative z-10 h-[18px] w-[18px]" />
                  <span className="relative z-10 text-[13px] font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      ))}
    </aside>
  );
}
