"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageNav } from "@/components/landing/PageNav";

// Feature cards data - links to shell pages (5 items)
const features = [
  {
    title: "Hand\nMeasure",
    subtitle: "PRECISION",
    link: "/measure",
  },
  {
    title: "Grip\nAnalysis",
    subtitle: "AI DETECT",
    link: "/grip",
  },
  {
    title: "Mouse\nDatabase",
    subtitle: "200+ MICE",
    link: "/database",
  },
  {
    title: "Analysis\nReport",
    subtitle: "DETAILED",
    link: "/report",
  },
  {
    title: "AI\nChat",
    subtitle: "INTERACT",
    link: "/ai",
  },
];

export default function ServicesPage() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      {/* Background gradient */}
      <div 
        className="absolute inset-0 -z-10"
        style={{
          background: "linear-gradient(135deg, #05060a 0%, #071022 52%, #0a1c3a 100%)",
        }}
      />

      {/* Ambient glow effect */}
      <div 
        className="absolute inset-0 -z-10 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse at 16% 30%, rgba(217, 70, 239, 0.22) 0%, transparent 58%), radial-gradient(ellipse at 84% 70%, rgba(34, 211, 238, 0.2) 0%, transparent 60%)",
        }}
      />

      {/* Large background text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <h1 
          className="text-[18vw] font-extralight text-white/[0.03] tracking-wider select-none"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          services
        </h1>
      </div>

      {/* Navigation */}
      <PageNav currentPage="services" />

      {/* Main Content - Fixed height, centered */}
      <main className="relative h-full flex items-center justify-center px-8 md:px-12 lg:px-16 pt-20 pb-24">
        <div className="w-full max-w-7xl mx-auto">
          {/* Section Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8 md:mb-12"
          >
            <span className="text-fuchsia-400 text-xs tracking-[0.3em] uppercase">
              [ ALL FEATURES ]
            </span>
          </motion.div>

          {/* Features Row - 5 items in a row */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 * index }}
              >
                <Link href={feature.link}>
                  <div className="group relative aspect-[3/4] md:aspect-[2/3] border border-white/10 rounded-lg overflow-hidden bg-black/20 backdrop-blur-sm hover:border-fuchsia-400/35 transition-all duration-300">
                    {/* Content */}
                    <div className="absolute inset-0 p-4 md:p-5 flex flex-col justify-between">
                      <h3 className="text-base md:text-lg lg:text-xl font-light text-white leading-tight whitespace-pre-line">
                        {feature.title}
                      </h3>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] md:text-xs text-white/40 uppercase tracking-wider">
                          {feature.subtitle}
                        </span>
                        <div className="w-6 h-6 md:w-7 md:h-7 rounded-full border border-white/20 flex items-center justify-center group-hover:border-fuchsia-400 group-hover:bg-fuchsia-500 transition-all duration-300">
                          <ArrowRight className="w-3 h-3 text-white/60 group-hover:text-black transition-colors" />
                        </div>
                      </div>
                    </div>

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-fuchsia-500/8 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Quick Links Row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-8 md:mt-12 flex items-center justify-center gap-4 md:gap-8"
          >
            <Link 
              href="/settings"
              className="group flex items-center gap-2 text-xs text-white/40 hover:text-white transition-colors"
            >
              <span>Settings</span>
              <ArrowRight className="w-3 h-3 group-hover:text-fuchsia-400" />
            </Link>
            <div className="w-px h-3 bg-white/20" />
            <Link 
              href="/user"
              className="group flex items-center gap-2 text-xs text-white/40 hover:text-white transition-colors"
            >
              <span>Profile</span>
              <ArrowRight className="w-3 h-3 group-hover:text-fuchsia-400" />
            </Link>
            <div className="w-px h-3 bg-white/20" />
            <Link 
              href="/dashboard"
              className="group flex items-center gap-2 text-xs text-white/40 hover:text-white transition-colors"
            >
              <span>Dashboard</span>
              <ArrowRight className="w-3 h-3 group-hover:text-fuchsia-400" />
            </Link>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
