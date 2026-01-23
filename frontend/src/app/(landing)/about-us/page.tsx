"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Sparkles, QrCode } from "lucide-react";
import { PageNav } from "@/components/landing/PageNav";

export default function AboutUsPage() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      {/* Background gradient - dark with green tint */}
      <div 
        className="absolute inset-0 -z-10"
        style={{
          background: "linear-gradient(135deg, #020804 0%, #081510 30%, #0a1a12 50%, #061008 70%, #020804 100%)",
        }}
      />

      {/* Ambient light effect from left */}
      <div 
        className="absolute inset-0 -z-10"
        style={{
          background: "radial-gradient(ellipse at 20% 50%, rgba(34, 197, 94, 0.12) 0%, transparent 50%)",
        }}
      />

      {/* Navigation */}
      <PageNav currentPage="about" />

      {/* Left side - Profile Image Placeholder */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1, delay: 0.2 }}
        className="absolute left-0 top-0 bottom-0 w-2/5 hidden lg:block"
      >
        {/* Image placeholder with gradient overlay */}
        <div className="relative w-full h-full">
          <div 
            className="absolute inset-0"
            style={{
              background: "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.9) 100%)",
            }}
          />
          
          {/* Silhouette placeholder */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white/20">
              <div className="w-48 h-72 bg-gradient-to-b from-green-900/20 to-transparent rounded-t-full flex items-end justify-center pb-6">
                <p className="text-xs uppercase tracking-wider">[Profile Image]</p>
              </div>
            </div>
          </div>

          {/* Vertical text on left edge */}
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <div 
              className="text-[10px] tracking-[0.4em] text-white/30 uppercase"
              style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
            >
              [ MOUSEFIT 2024 ]
            </div>
          </div>
        </div>
      </motion.div>

      {/* Right side - Content */}
      <main className="relative h-full flex items-center justify-end px-8 md:px-16 lg:px-20 pt-20 pb-24">
        <div className="w-full lg:w-3/5 lg:pl-16">
          {/* Brand Introduction Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mb-8"
          >
            {/* Decorative line and subtitle */}
            <div className="flex items-center gap-4 mb-4">
              <div className="h-px w-12 bg-gradient-to-r from-transparent to-white/30" />
              <span className="text-xs tracking-[0.3em] text-white/40 uppercase">Brand Introduction</span>
            </div>

            {/* Large M letter */}
            <div className="flex items-start gap-4">
              <span className="text-6xl md:text-7xl lg:text-8xl font-bold text-white/10 leading-none">M</span>
              <div className="pt-2 md:pt-4">
                <h1 className="text-xl md:text-2xl lg:text-3xl font-light text-white tracking-wide">
                  OUSEFIT
                </h1>
                <h2 className="text-xl md:text-2xl lg:text-3xl font-light text-white/60 tracking-wide">
                  INTRODUCTION
                </h2>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-4 md:gap-6 mt-4">
              <div className="flex items-center gap-2 text-xs text-white/50">
                <div className="w-12 h-px bg-gradient-to-r from-green-500 to-transparent" />
                <span>MFT</span>
              </div>
              <Link 
                href="/services" 
                className="flex items-center gap-2 text-xs text-white/60 hover:text-green-500 transition-colors"
              >
                <span className="w-5 h-5 rounded-full border border-white/30 flex items-center justify-center">
                  <ArrowRight className="w-3 h-3" />
                </span>
                <span className="uppercase tracking-wider">Features</span>
              </Link>
            </div>
          </motion.div>

          {/* Description paragraphs */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="space-y-3 mb-8 max-w-md"
          >
            <p className="text-xs md:text-sm text-white/40 leading-relaxed">
              MouseFit is a precision mouse fitting platform that uses advanced AI and computer vision 
              technology to analyze your hand dimensions and grip style.
            </p>
            <p className="text-xs md:text-sm text-white/40 leading-relaxed">
              Founded with a mission to eliminate the guesswork from mouse selection, we&apos;ve helped 
              thousands find their ideal pointing device.
            </p>
          </motion.div>

          {/* About Us Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="mb-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-2xl md:text-3xl font-light text-white">ABOUT</h3>
              <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-green-500" />
            </div>
            <h3 className="text-2xl md:text-3xl font-light text-white mb-4">US</h3>
            
            <div className="w-8 h-px bg-white/20 mb-4" />
            
            <p className="text-xs text-white/30 uppercase tracking-[0.3em]">TRENDING</p>
          </motion.div>

          {/* QR Code placeholder */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.9 }}
            className="flex items-center gap-4"
          >
            <div className="w-12 h-12 border border-white/10 rounded flex items-center justify-center bg-black/50">
              <QrCode className="w-6 h-6 text-white/20" />
            </div>
            <div className="text-xs text-white/30">
              <p>Scan to learn more</p>
              <p className="text-green-500/60">mousefit.io</p>
            </div>
          </motion.div>
        </div>

        {/* Right side vertical text */}
        <div className="fixed right-8 top-1/2 -translate-y-1/2 hidden xl:block">
          <div 
            className="text-[10px] tracking-[0.4em] text-white/20 uppercase"
            style={{ writingMode: "vertical-rl" }}
          >
            Precision Mouse Fitting
          </div>
        </div>
      </main>
    </div>
  );
}
