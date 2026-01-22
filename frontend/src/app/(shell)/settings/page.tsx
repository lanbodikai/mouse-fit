"use client";

import { useTheme } from "@/lib/theme";
import { Sun, Moon } from "lucide-react";

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="h-full w-full p-8">
      <div className="mx-auto w-full max-w-[72ch] space-y-6">
        <div className="rounded-[30px] bg-theme-card p-8 border border-white/10 transition-colors">
          <h1 className="text-3xl font-semibold text-theme-primary [font-family:var(--font-heading)] mb-4">
            Settings
          </h1>
          <p className="text-white/60 leading-relaxed mb-6">Configure your preferences.</p>
          <div className="space-y-4">
            <div className="rounded-[20px] bg-white/5 p-4 border border-white/10 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-theme-primary font-semibold mb-2">Theme</h3>
                  <p className="text-white/60 text-sm">
                    {theme === "dark" ? "Dark mode is currently enabled." : "Light mode is currently enabled."}
                  </p>
                </div>
                <button
                  onClick={toggleTheme}
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 transition hover:bg-white/10"
                  aria-label="Toggle theme"
                >
                  {theme === "dark" ? (
                    <Sun className="h-5 w-5 text-theme-primary" />
                  ) : (
                    <Moon className="h-5 w-5 text-theme-primary" />
                  )}
                </button>
              </div>
            </div>
            <div className="rounded-[20px] bg-white/5 p-4 border border-white/10 transition-colors">
              <h3 className="text-theme-primary font-semibold mb-2">Notifications</h3>
              <p className="text-white/60 text-sm">Manage your notification preferences.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
