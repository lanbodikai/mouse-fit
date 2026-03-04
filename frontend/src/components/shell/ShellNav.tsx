"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { 
  ArrowLeft, 
  ChevronDown,
  Home, 
  Hand, 
  LogIn,
  LogOut,
  Moon,
  MousePointer2, 
  Database, 
  MessageSquare, 
  FileText, 
  Settings, 
  User,
  Sun,
} from "lucide-react";
import { ApiStatus } from "@/components/ApiStatus";
import { getSession, isAuthEnabled, signOut, subscribeAuthChanges } from "@/lib/auth";
import { useTheme } from "@/lib/theme";

interface ShellNavProps {
  currentPage: string;
}

const navItems = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: Home },
  { id: "measure", label: "Measure", href: "/measure", icon: Hand },
  { id: "grip", label: "Grip", href: "/grip", icon: MousePointer2 },
  { id: "database", label: "Database", href: "/database", icon: Database },
  { id: "ai", label: "AI Chat", href: "/ai", icon: MessageSquare },
  { id: "report", label: "Report", href: "/report", icon: FileText },
];

export function ShellNav({ currentPage }: ShellNavProps) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [authEnabled, setAuthEnabled] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);

  useEffect(() => {
    const syncAuthState = () => {
      setAuthEnabled(isAuthEnabled());
      const session = getSession();
      setSessionEmail(session?.user?.email || null);
    };
    syncAuthState();
    const unsubscribe = subscribeAuthChanges(syncAuthState);
    window.addEventListener("focus", syncAuthState);
    return () => {
      unsubscribe();
      window.removeEventListener("focus", syncAuthState);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setMenuOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const initials = sessionEmail ? sessionEmail.slice(0, 1).toUpperCase() : "U";
  const profileLabel = sessionEmail ? sessionEmail : "Authenticated user";

  const onSignOut = () => {
    signOut();
    setMenuOpen(false);
    router.push("/auth");
  };

  return (
    <>
      {/* Top Navigation Bar */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between border border-transparent bg-transparent px-6 py-4 md:px-8"
      >
        {/* Left side - Back + Logo */}
        <div className="flex items-center gap-4">
          {/* Back to Home */}
          <Link
            href="/"
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors group"
          >
            <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center transition-all group-hover:border-fuchsia-500 group-hover:bg-fuchsia-500/10 group-hover:shadow-[0_0_10px_rgba(217,70,239,0.2)]">
              <ArrowLeft className="w-4 h-4" />
            </div>
            <span className="text-sm hidden sm:inline">Home</span>
          </Link>

          {/* Divider */}
          <div className="w-px h-6 bg-white/10 hidden sm:block" />

          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-wide text-white">Mousefit Studio V2</span>
          </Link>
        </div>

        {/* Right side - Secondary nav */}
        <div className="flex items-center gap-3">
          <ApiStatus />
          {authEnabled && sessionEmail ? (
            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((value) => !value)}
                className={`flex items-center gap-2 rounded-full border px-3 py-2 transition-all ${
                  currentPage === "user"
                    ? "border-fuchsia-500/40 bg-fuchsia-500/20 text-fuchsia-300 shadow-[0_0_10px_rgba(217,70,239,0.2)]"
                    : "text-white/80 border-white/15 hover:text-white hover:bg-white/5"
                }`}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-fuchsia-500 text-black text-xs font-semibold shadow-[0_0_6px_rgba(217,70,239,0.2)]">
                  {initials}
                </span>
                <span className="hidden max-w-[10rem] truncate text-sm md:inline">{profileLabel}</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
              </button>

              {menuOpen ? (
                <div className="absolute right-0 top-[calc(100%+0.5rem)] w-56 rounded-2xl p-2 backdrop-blur-md shadow-[0_0_12px_rgba(217,70,239,0.16)] mf-neon-surface">
                  <Link
                    href="/dashboard"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white"
                  >
                    <Home className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white"
                  >
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                  <Link
                    href="/user"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white"
                  >
                    <User className="h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      toggleTheme();
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white"
                  >
                    {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
                  </button>
                  <div className="my-1 h-px bg-white/10" />
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-red-300 hover:bg-red-500/10 hover:text-red-200"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign out</span>
                  </button>
                </div>
              ) : null}
            </div>
          ) : authEnabled ? (
            <Link
              href="/auth"
              className="flex items-center gap-2 rounded-full border border-fuchsia-500/35 bg-fuchsia-500/20 px-3 py-2 text-sm text-fuchsia-200 shadow-[0_0_6px_rgba(217,70,239,0.16)] transition-colors hover:border-fuchsia-400/50 hover:bg-fuchsia-500/30 hover:text-white"
            >
              <LogIn className="h-4 w-4" />
              <span>Sign In</span>
            </Link>
          ) : (
            <span className="rounded-full border border-white/10 px-3 py-2 text-xs text-white/45">Auth disabled</span>
          )}
        </div>
      </motion.nav>

      {/* Bottom Navigation Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center px-6 py-4"
      >
        <div className="flex items-center gap-2 rounded-full border border-white/25 bg-black/15 px-4 py-2 shadow-[0_0_10px_rgba(255,255,255,0.14),0_0_22px_rgba(255,255,255,0.08)] backdrop-blur-sm md:gap-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-full transition-all ${
                  isActive 
                    ? "mf-neon-btn text-white" 
                    : "text-white/60 hover:text-white hover:bg-white/10"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className={`text-sm hidden md:inline ${isActive ? "font-medium" : ""}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </motion.div>
    </>
  );
}

