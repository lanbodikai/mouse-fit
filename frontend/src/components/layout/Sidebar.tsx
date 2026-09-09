"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Database,
  FileText,
  Keyboard,
  Moon,
  MousePointer2,
  Settings,
  Sun,
  Sparkles,
  User,
  type LucideIcon,
} from "lucide-react";
import { useTheme } from "@/lib/theme";
import effects from "./Sidebar.module.css";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  activeMatch?: string[];
};

const primaryNav: NavItem[] = [
  { href: "/survey", label: "Find my fit", icon: Sparkles, activeMatch: ["/survey", "/measure", "/grip"] },
  { href: "/database", label: "Database", icon: Database },
  { href: "/keyboard-builder", label: "Keyboard Visualizer", icon: Keyboard },
  { href: "/mouse-fit/simulator", label: "Mouse Fit Simulator", icon: MousePointer2 },

  { href: "/report", label: "Report", icon: FileText },
];

const secondaryNav: NavItem[] = [
  { href: "/user", label: "Account", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.activeMatch) {
    return item.activeMatch.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    );
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      aria-label={item.label}
      title={item.label}
      className={`${effects.navLink} group relative flex h-12 min-w-10 items-center justify-center gap-3 rounded-md px-2 transition sm:min-w-12 sm:px-3 md:w-12 md:px-0 xl:w-full xl:justify-start xl:px-3 ${
        active
          ? "bg-[var(--shell-accent)] text-[var(--shell-text-inverse)]"
          : "text-[var(--shell-text-secondary)] hover:bg-[var(--shell-surface-soft)] hover:text-[var(--shell-text-primary)]"
      }`}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
      <span className="hidden min-w-0 truncate text-sm font-medium xl:block">
        {item.label}
      </span>
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  return (
    <aside className="fixed inset-x-0 bottom-0 z-40 flex h-[72px] items-center border-t border-[var(--shell-border-strong)] bg-[var(--shell-bg-deep)] px-2 md:relative md:inset-auto md:h-full md:w-[76px] md:shrink-0 md:flex-col md:border-r md:border-t-0 md:px-3 md:py-4 xl:w-[216px] xl:items-stretch">
      <Link
        href="/database"
        className="mb-5 hidden h-12 items-center gap-3 rounded-md px-2 text-[var(--shell-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--shell-accent)] md:flex"
        aria-label="Go to MouseFit database"
      >
        <Image
          src="/9.png"
          alt=""
          width={36}
          height={36}
          className="h-9 w-9 rounded-md object-cover"
          priority
        />
        <span className="hidden font-semibold xl:block">MouseFit</span>
      </Link>

      <nav className="scrollbar-hide flex min-w-0 flex-1 items-center justify-start gap-1 overflow-x-auto sm:justify-around md:flex-col md:justify-start md:overflow-visible xl:items-stretch">
        {primaryNav.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(pathname, item)} />
        ))}
      </nav>

      <div className="hidden gap-1 md:flex md:flex-col xl:items-stretch">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="flex h-12 w-12 items-center justify-center gap-3 rounded-md text-[var(--shell-text-secondary)] transition hover:bg-[var(--shell-surface-soft)] hover:text-[var(--shell-text-primary)] xl:w-full xl:justify-start xl:px-3"
        >
          {theme === "dark" ? (
            <Sun className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
          ) : (
            <Moon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
          )}
          <span className="hidden text-sm font-medium xl:block">
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </span>
        </button>

        {secondaryNav.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(pathname, item)} />
        ))}
      </div>
    </aside>
  );
}
