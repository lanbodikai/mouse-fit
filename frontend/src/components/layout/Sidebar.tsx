"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  Hand,
  Home,
  Moon,
  Ruler,
  Settings,
  Sun,
  Sparkles,
  User,
  type LucideIcon,
} from "lucide-react";
import { useTheme } from "@/lib/theme";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  activeMatch?: string[];
};

const mouseFitNav: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: Home, activeMatch: ["/dashboard", "/mouse-fit", "/database"] },
  { href: "/survey", label: "Survey", icon: Sparkles },
  { href: "/measure", label: "Measure", icon: Ruler },
  { href: "/grip", label: "Grip", icon: Hand },
  { href: "/report", label: "Report", icon: FileText },
];

const secondaryNav: NavItem[] = [
  { href: "/user", label: "Account", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.activeMatch) {
    return item.activeMatch.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function RailButton({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-label={item.label}
      title={item.label}
      className="group relative z-10 flex items-center justify-center"
    >
      <div
        className={`relative flex h-12 w-12 items-center justify-center rounded-[20px] transition-all ${
          active
            ? "shell-accent-surface"
            : "mf-glass-rail-button hover:-translate-y-0.5 hover:text-[var(--shell-text-primary)]"
        }`}
      >
        <Icon className="relative z-10 h-[18px] w-[18px]" />
      </div>

      <span
        className="shell-surface-soft pointer-events-none absolute left-full z-30 ml-3 rounded-full px-3 py-1 text-[11px] font-medium text-[var(--shell-text-primary)] opacity-0 transition-opacity group-hover:opacity-100"
      >
        {item.label}
      </span>
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  return (
    <aside
      className="mf-glass-sidebar relative z-20 flex h-full w-[76px] shrink-0 flex-col items-center justify-between overflow-visible px-2 py-5 sm:w-[92px] sm:px-3"
    >
      <div className="flex flex-col items-center gap-4">
        <Link
          href="/dashboard"
          className="shell-surface-raised flex h-12 w-12 items-center justify-center overflow-hidden rounded-[22px]"
          aria-label="Go to MouseFit home"
          title="MouseFit Home"
        >
          <Image
            src="/9.png"
            alt="MouseFit"
            width={48}
            height={48}
            className="h-full w-full object-cover"
            priority
          />
        </Link>

        <nav className="flex flex-col gap-3">
          {mouseFitNav.map((item) => (
            <RailButton
              key={item.href}
              item={item}
              active={isActive(pathname, item)}
            />
          ))}
        </nav>
      </div>

      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="group relative z-10 flex items-center justify-center"
        >
          <div className="mf-glass-rail-button relative flex h-12 w-12 items-center justify-center rounded-[20px] transition-all hover:-translate-y-0.5 hover:text-[var(--shell-text-primary)]">
            {theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
          </div>
          <span className="shell-surface-soft pointer-events-none absolute left-full z-30 ml-3 rounded-full px-3 py-1 text-[11px] font-medium text-[var(--shell-text-primary)] opacity-0 transition-opacity group-hover:opacity-100">
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </span>
        </button>

        {secondaryNav.map((item) => (
          <RailButton
            key={item.href}
            item={item}
            active={isActive(pathname, item)}
          />
        ))}
      </div>
    </aside>
  );
}
