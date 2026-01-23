"use client";

import { useTransition } from "@/context/TransitionContext";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

interface LandingNavProps {
  currentPage?: string;
}

/**
 * Navigation component matching the DOTDNA style.
 */
export function LandingNav({ currentPage = "Home" }: LandingNavProps) {
  const { navigateWithTransition, isTransitioning } = useTransition();

  const handleNavClick = (route: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isTransitioning) {
      navigateWithTransition(route);
    }
  };

  return (
    <>
      {/* Top Navigation Bar */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="fixed top-0 left-0 right-0 z-50 px-8 py-6 flex items-center justify-between"
      >
        {/* Logo */}
        <button
          onClick={handleNavClick("/")}
          disabled={isTransitioning}
          className="flex items-center gap-2 disabled:opacity-50"
        >
          <span className="text-lg font-bold tracking-wide text-white">
            <span className="text-green-500">DC</span> MOUSEFIT
          </span>
        </button>

        {/* Contact Button - Top Right */}
        <button
          onClick={handleNavClick("/contact")}
          disabled={isTransitioning}
          className="flex items-center gap-3 text-white text-sm disabled:opacity-50 group"
        >
          <span className="opacity-80 group-hover:opacity-100 transition-opacity">Contact us</span>
          <div className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center group-hover:bg-green-400 transition-colors">
            <ArrowUpRight className="w-4 h-4 text-black" />
          </div>
        </button>
      </motion.nav>

      {/* Bottom Navigation Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="fixed bottom-0 left-0 right-0 z-50 px-8 py-6 flex items-center justify-between"
      >
        {/* Scroll indicator */}
        <div className="flex items-center gap-2 text-white/60 text-sm">
          <span className="text-green-500">+</span>
          <span>Scroll to explore</span>
        </div>

        {/* Center Navigation */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-8">
          <button
            onClick={handleNavClick("/")}
            disabled={isTransitioning}
            className={`flex items-center gap-2 text-sm transition-colors disabled:opacity-50 ${
              currentPage === "Home" ? "text-white" : "text-white/60 hover:text-white"
            }`}
          >
            {currentPage === "Home" && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
            Home
          </button>
          <button
            onClick={handleNavClick("/about")}
            disabled={isTransitioning}
            className={`flex items-center gap-2 text-sm transition-colors disabled:opacity-50 ${
              currentPage === "Services" ? "text-white" : "text-white/60 hover:text-white"
            }`}
          >
            Services
            <span className="text-green-500">+</span>
          </button>
          <button
            onClick={handleNavClick("/navigate")}
            disabled={isTransitioning}
            className={`text-sm transition-colors disabled:opacity-50 ${
              currentPage === "Product" ? "text-white" : "text-white/60 hover:text-white"
            }`}
          >
            Product
          </button>
          <button
            onClick={handleNavClick("/contact")}
            disabled={isTransitioning}
            className={`text-sm transition-colors disabled:opacity-50 ${
              currentPage === "About us" ? "text-white" : "text-white/60 hover:text-white"
            }`}
          >
            About us
          </button>
        </div>

        {/* Empty right side for balance */}
        <div className="w-32" />
      </motion.div>
    </>
  );
}
