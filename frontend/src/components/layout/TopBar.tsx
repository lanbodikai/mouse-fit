"use client";

import { Moon, Sun } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTheme } from "@/lib/theme";

export default function TopBar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  const getPageTitle = () => {
    if (pathname === "/" || pathname === "/schedules" || pathname === "/dashboard") return "Dashboard";
    const path = pathname.split("/")[1];
    if (!path) return "Dashboard";
    return path.charAt(0).toUpperCase() + path.slice(1);
  };

  return (
    <header className="flex items-center justify-end w-full h-14 px-8 shrink-0">
      <h1 className="sr-only">{getPageTitle()}</h1>

      <button
        type="button"
        onClick={toggleTheme}
        aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        title={theme === "dark" ? "Light mode" : "Dark mode"}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-accent-gamer bg-accent-gamer-soft text-accent-gamer hover-accent-gamer-strong transition-colors"
      >
        {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>
    </header>
  );
}
