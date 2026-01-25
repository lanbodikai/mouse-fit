"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, User } from "lucide-react";

interface PageNavProps {
  currentPage: "home" | "services" | "product" | "about";
}

/**
 * Consistent navigation component for all landing pages.
 * Includes top nav with logo and contact, bottom nav with page links.
 */
export function PageNav({ currentPage }: PageNavProps) {
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  // Arrow key navigation between landing pages:
  // - Up/Down: previous/next page
  // - Left/Right: previous/next page (matches navbar order)
  useEffect(() => {
    const pages = ["home", "services", "product", "about"] as const;
    const routes: Record<(typeof pages)[number], string> = {
      home: "/",
      services: "/services",
      product: "/product",
      about: "/about-us",
    };

    const isTypingTarget = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      if (!el) return false;
      const tag = (el.tagName || "").toLowerCase();
      return tag === "input" || tag === "textarea" || tag === "select" || el.isContentEditable;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;

      const idx = pages.indexOf(currentPage);
      if (idx < 0) return;

      const prevKeys = new Set(["ArrowUp", "ArrowLeft"]);
      const nextKeys = new Set(["ArrowDown", "ArrowRight"]);

      if (!prevKeys.has(e.key) && !nextKeys.has(e.key)) return;
      e.preventDefault();

      const nextIdx = prevKeys.has(e.key)
        ? (idx - 1 + pages.length) % pages.length
        : (idx + 1) % pages.length;

      router.push(routes[pages[nextIdx]]);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentPage, router]);

  return (
    <>
      {/* Top Navigation Bar */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="fixed top-0 left-0 right-0 z-50 px-8 py-6 flex items-center justify-between"
      >
        {/* Left side - Back button + Logo */}
        <div className="flex items-center gap-4">
          {/* Back Button */}
          {currentPage !== "home" && (
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-white/60 hover:text-white transition-colors group"
            >
              <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center group-hover:border-green-500 group-hover:bg-green-500/10 transition-all">
                <ArrowLeft className="w-4 h-4" />
              </div>
              <span className="text-sm hidden sm:inline">Back</span>
            </button>
          )}
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-wide text-white">
              <span className="text-green-500">DC</span> MOUSEFIT
            </span>
          </Link>
        </div>

        {/* Profile Button - Top Right */}
        <Link
          href="/user"
          className="flex items-center gap-2 px-3 py-2 rounded-full transition-all text-white/60 hover:text-white hover:bg-white/5"
        >
          <User className="w-4 h-4" />
          <span className="text-sm hidden md:inline">Profile</span>
        </Link>
      </motion.nav>

      {/* Bottom Navigation Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="fixed bottom-0 left-0 right-0 z-50 px-8 py-6 flex items-center justify-between"
      >
        {/* Left indicator */}
        <div className="flex items-center gap-2 text-white/60 text-sm">
          <span className="text-green-500">+</span>
          <span className="hidden sm:inline">Explore</span>
        </div>

        {/* Center Navigation */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-6 md:gap-8">
          <Link
            href="/"
            className={`flex items-center gap-2 text-sm transition-colors ${
              currentPage === "home" ? "text-white" : "text-white/60 hover:text-white"
            }`}
          >
            {currentPage === "home" && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
            Home
          </Link>
          <Link
            href="/services"
            className={`flex items-center gap-2 text-sm transition-colors ${
              currentPage === "services" ? "text-white" : "text-white/60 hover:text-white"
            }`}
          >
            {currentPage === "services" && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
            Services
            {currentPage !== "services" && <span className="text-green-500">+</span>}
          </Link>
          <Link
            href="/product"
            className={`flex items-center gap-2 text-sm transition-colors ${
              currentPage === "product" ? "text-white" : "text-white/60 hover:text-white"
            }`}
          >
            {currentPage === "product" && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
            Product
          </Link>
          <Link
            href="/about-us"
            className={`flex items-center gap-2 text-sm transition-colors ${
              currentPage === "about" ? "text-white" : "text-white/60 hover:text-white"
            }`}
          >
            {currentPage === "about" && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
            About us
          </Link>
        </div>

        {/* Right side */}
        <div className="w-20 md:w-32" />
      </motion.div>
    </>
  );
}
