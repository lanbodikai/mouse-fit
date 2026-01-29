"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { 
  ArrowLeft, 
  Home, 
  Hand, 
  MousePointer2, 
  Database, 
  MessageSquare, 
  FileText, 
  Settings, 
  User,
} from "lucide-react";
import { ApiStatus } from "@/components/ApiStatus";

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

const secondaryItems = [
  { id: "settings", label: "Settings", href: "/settings", icon: Settings },
  { id: "user", label: "Profile", href: "/user", icon: User },
];

export function ShellNav({ currentPage }: ShellNavProps) {
  return (
    <>
      {/* Top Navigation Bar */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-8 py-4"
      >
        {/* Left side - Back + Logo */}
        <div className="flex items-center gap-4">
          {/* Back to Home */}
          <Link
            href="/"
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors group"
          >
            <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center group-hover:border-green-500 group-hover:bg-green-500/10 transition-all">
              <ArrowLeft className="w-4 h-4" />
            </div>
            <span className="text-sm hidden sm:inline">Home</span>
          </Link>

          {/* Divider */}
          <div className="w-px h-6 bg-white/10 hidden sm:block" />

          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-wide text-white">
              <span className="text-green-500">MSF</span> STUDIO
            </span>
          </Link>
        </div>

        {/* Right side - Secondary nav */}
        <div className="flex items-center gap-3">
          <ApiStatus />
          {secondaryItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-full transition-all ${
                  isActive 
                    ? "bg-green-500/20 text-green-500 border border-green-500/30" 
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm hidden md:inline">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </motion.nav>

      {/* Bottom Navigation Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center px-6 py-4"
      >
        <div className="flex items-center gap-2 md:gap-4 px-4 py-2 rounded-full bg-black/60 backdrop-blur-md border border-white/10">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-full transition-all ${
                  isActive 
                    ? "bg-green-500 text-black" 
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
