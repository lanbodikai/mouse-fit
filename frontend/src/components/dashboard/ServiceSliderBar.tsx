"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  Bell,
  ChevronDown,
  Home,
  Keyboard,
  LogOut,
  Moon,
  MousePointer2,
  Ruler,
  Settings,
  Sun,
  Square,
  User,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getMe } from "@/lib/api";
import { getSession, signOut } from "@/lib/auth";
import { useAuthState } from "@/hooks/useAuthState";
import { useTheme } from "@/lib/theme";
import type { CurrentUser } from "@/lib/types";

type SliderItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  activeMatch?: string[];
};

const sliderItems: SliderItem[] = [
  { href: "/database", label: "Database", icon: Home, activeMatch: ["/database", "/schedules"] },
  {
    href: "/mouse-fit",
    label: "Mouse Fit",
    icon: MousePointer2,
    activeMatch: ["/mouse-fit", "/mousefit", "/survey", "/measure", "/grip", "/report"],
  },
  { href: "/keyboard-finder", label: "Keyboard", icon: Keyboard },
  { href: "/mousepad-match", label: "Mousepad", icon: Square },
  { href: "/desk-height-tune", label: "Desk", icon: Ruler },
];

function isActive(pathname: string, item: SliderItem): boolean {
  if (item.activeMatch) {
    return item.activeMatch.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function UserMenu() {
  const router = useRouter();
  const { isAuthenticated } = useAuthState();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    const session = getSession();
    if (!session) return;

    let cancelled = false;
    getMe()
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeUser = isAuthenticated ? user : null;
  const displayName = activeUser?.display_name || activeUser?.email?.split("@")[0] || "Guest";

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((value) => !value);
        }}
        className="flex items-center gap-2 rounded-full bg-white px-2 py-2 text-[#111111] shadow-[0_12px_20px_rgba(0,0,0,0.08)] transition hover:-translate-y-0.5"
      >
        {activeUser?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={activeUser.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#111111] text-white">
            <User className="h-4 w-4" />
          </div>
        )}
        <span className="hidden max-w-[88px] truncate text-sm font-medium text-[#111111] lg:inline">
          {displayName}
        </span>
        <ChevronDown className={`h-4 w-4 text-black/55 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && isAuthenticated ? (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-[24px] border border-black/8 bg-white shadow-[0_18px_36px_rgba(0,0,0,0.12)]"
          >
            <div className="border-b border-black/6 px-4 py-3">
              <p className="text-sm font-semibold text-[#111111]">{displayName}</p>
              <p className="mt-1 text-xs text-black/45">{activeUser?.email || ""}</p>
            </div>

            <div className="py-2">
              {[
                { label: "Profile", href: "/user", icon: User },
                { label: "Settings", href: "/settings", icon: Settings },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    router.push(item.href);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-black/65 transition hover:bg-black/5 hover:text-[#111111]"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </button>
              ))}
            </div>

            <div className="border-t border-black/6 py-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  signOut();
                  router.push("/database");
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-500/80 transition hover:bg-black/5 hover:text-red-500"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default function ServiceSliderBar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const itemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const aiActive = pathname === "/database" || pathname.startsWith("/database/");

  useEffect(() => {
    const activeItem = sliderItems.find((item) => isActive(pathname, item));
    const activeNode = activeItem ? itemRefs.current[activeItem.href] : null;
    const scrollRegion = activeNode?.closest("[data-slider-scroll]") as HTMLDivElement | null;
    if (!activeNode || !scrollRegion) return;

    scrollRegion.scrollTo({
      left: Math.max(activeNode.offsetLeft - 28, 0),
      behavior: "smooth",
    });
  }, [pathname]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="relative z-20 overflow-visible"
    >
      <div className="shell-surface-raised rounded-[36px] p-2">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] xl:grid-cols-[168px_minmax(0,1fr)_auto] xl:items-center">
          <div className="hidden h-full items-center rounded-[28px] shell-surface-soft px-5 py-4 text-[var(--shell-text-primary)] xl:flex">
            <div>
              <p className="text-[1rem] font-medium">MStudio</p>
              <p className="mt-1 text-xs uppercase tracking-[0.24em] text-[var(--shell-text-tertiary)]">Services</p>
            </div>
          </div>

          <div className="min-w-0 xl:-ml-2">
            <div data-slider-scroll className="overflow-x-auto scrollbar-hide">
              <motion.div
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="relative flex min-w-max items-center gap-2 rounded-[28px] shell-surface-soft px-2 py-2 sm:px-3 sm:py-3"
              >
                <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]">
                  <motion.div
                    aria-hidden="true"
                    className="absolute inset-y-2 w-28 rounded-full bg-white/55 blur-2xl"
                    animate={{ x: ["-12%", "108%"] }}
                    transition={{ duration: 7.2, repeat: Infinity, ease: "easeInOut" }}
                  />
                </div>

                {sliderItems.map((item) => {
                  const active = isActive(pathname, item);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      ref={(node) => {
                        itemRefs.current[item.href] = node;
                      }}
                      className={`group relative flex min-w-[122px] items-center gap-3 overflow-hidden rounded-[22px] px-3 py-2.5 transition sm:min-w-[132px] ${
                        active ? "text-[var(--shell-text-primary)]" : "text-[var(--shell-text-secondary)] hover:bg-[var(--shell-surface-inset)]"
                      }`}
                      aria-current={active ? "page" : undefined}
                    >
                      {active ? (
                        <motion.span
                          layoutId="service-slider-active"
                          className="absolute inset-0 rounded-[22px] shell-accent-surface"
                          transition={{ type: "spring", stiffness: 320, damping: 28 }}
                        />
                      ) : null}

                      <motion.div
                        className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full ${
                          active
                            ? "bg-[var(--shell-surface-raised)] text-[var(--shell-accent-strong)] shadow-[var(--shell-shadow-soft)]"
                            : "bg-[var(--shell-surface-inset)] text-[var(--shell-text-secondary)] transition group-hover:bg-[var(--shell-surface-raised)]"
                        }`}
                        animate={active ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                        transition={{ duration: 0.34, ease: "easeOut" }}
                      >
                        <item.icon className="h-4 w-4" />
                      </motion.div>

                      <div className="relative z-10 min-w-0">
                        <p className="truncate text-sm font-semibold">{item.label}</p>
                      </div>

                      {active ? (
                        <motion.span
                          layoutId="service-slider-underline"
                          className="absolute inset-x-5 bottom-1 h-px rounded-full bg-[var(--shell-accent-outline)]"
                          transition={{ type: "spring", stiffness: 300, damping: 26 }}
                        />
                      ) : null}
                    </Link>
                  );
                })}
              </motion.div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 px-1">
            <Link
              href="/database?assistant=open"
              className={`inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold transition ${
                aiActive
                  ? "shell-accent-surface"
                  : "shell-surface-soft text-[var(--shell-text-secondary)] hover:text-[var(--shell-text-primary)]"
              }`}
            >
              <Bot className="h-4 w-4" />
              AI
            </Link>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="shell-surface-soft flex h-11 w-11 items-center justify-center rounded-full text-[var(--shell-text-secondary)] transition hover:text-[var(--shell-text-primary)]"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              type="button"
              className="shell-surface-soft relative flex h-11 w-11 items-center justify-center rounded-full text-[var(--shell-text-secondary)] transition hover:text-[var(--shell-text-primary)]"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute right-3 top-3 h-2 w-2 rounded-full border border-[var(--shell-surface-raised)] bg-[var(--shell-accent)]" />
            </button>
            <UserMenu />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
