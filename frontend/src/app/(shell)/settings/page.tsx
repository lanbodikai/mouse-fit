"use client";

import { motion } from "framer-motion";
import { Sun, Moon, Bell, Shield, Palette, Info } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { ShellNav } from "@/components/shell/ShellNav";

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <>
      <ShellNav currentPage="settings" />
      
      <div className="px-6 md:px-12 lg:px-20 max-w-3xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-light text-white mb-2">Settings</h1>
          <p className="text-white/50">Configure your preferences</p>
        </motion.div>

        {/* Settings Cards */}
        <div className="space-y-4">
          {/* Theme Setting */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="p-6 rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <Palette className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <h3 className="text-white font-medium mb-1">Appearance</h3>
                  <p className="text-sm text-white/50">
                    {theme === "dark" ? "Dark mode enabled" : "Light mode enabled"}
                  </p>
                </div>
              </div>
              <button
                onClick={toggleTheme}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                {theme === "dark" ? (
                  <>
                    <Sun className="w-4 h-4 text-yellow-500" />
                    <span className="text-white/80 text-sm">Light</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 text-blue-400" />
                    <span className="text-white/80 text-sm">Dark</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>

          {/* Notifications Setting */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="p-6 rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <h3 className="text-white font-medium mb-1">Notifications</h3>
                  <p className="text-sm text-white/50">Manage notification preferences</p>
                </div>
              </div>
              <div className="w-12 h-6 rounded-full bg-green-500/20 border border-green-500/30 relative cursor-pointer">
                <div className="absolute right-1 top-1 w-4 h-4 rounded-full bg-green-500" />
              </div>
            </div>
          </motion.div>

          {/* Privacy Setting */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="p-6 rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <h3 className="text-white font-medium mb-1">Privacy</h3>
                  <p className="text-sm text-white/50">Data is stored locally on your device</p>
                </div>
              </div>
              <span className="text-xs text-green-500 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                Secure
              </span>
            </div>
          </motion.div>

          {/* About */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="p-6 rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                <Info className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <h3 className="text-white font-medium mb-1">About MouseFit</h3>
                <p className="text-sm text-white/50">Version 2.1 • CV & AI powered mouse fitting</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
