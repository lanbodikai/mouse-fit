"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Instagram, Twitter, Facebook, Linkedin } from "lucide-react";
import { PageNav } from "@/components/landing/PageNav";

export default function ProductPage() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      {/* Background gradient with wave pattern hint */}
      <div 
        className="absolute inset-0 -z-10"
        style={{
          background: "linear-gradient(135deg, #030806 0%, #0a1510 30%, #061208 60%, #030806 100%)",
        }}
      />

      {/* Abstract wave pattern overlay */}
      <div 
        className="absolute inset-0 -z-10 opacity-20"
        style={{
          background: `
            radial-gradient(ellipse at 30% 20%, rgba(34, 197, 94, 0.1) 0%, transparent 50%),
            radial-gradient(ellipse at 70% 60%, rgba(34, 197, 94, 0.08) 0%, transparent 40%),
            radial-gradient(ellipse at 50% 80%, rgba(34, 197, 94, 0.05) 0%, transparent 30%)
          `,
        }}
      />

      {/* Navigation */}
      <PageNav currentPage="product" />

      {/* Main Content */}
      <main className="relative h-full flex flex-col items-center justify-start pt-32 md:pt-28 px-8 md:px-16 overflow-hidden">

        {/* Large Product Name - Behind Image (Full Width) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="absolute inset-0 flex items-start justify-center pt-40 md:pt-32 pointer-events-none"
        >
          <h1 
            className="text-[20vw] md:text-[16vw] lg:text-[12vw] opacity-80 font-bold text-white leading-none tracking-wider whitespace-nowrap"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            MOUSEFIT
          </h1>
        </motion.div>

        {/* Product Image + Button Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.4 }}
          className="relative z-10 flex items-center justify-center gap-8 md:gap-12 mt-12 md:mt-20"
        >
          {/* Product Image */}
          <div className="relative w-56 md:w-72 lg:w-[500px]">
            {/* Glow effect - expanded */}
            <div className="absolute -inset-20 bg-green-500/15 blur-[80px] rounded-full" />
            
            <img 
              src="/1.png" 
              alt="MouseFit Product" 
              className="relative w-full h-auto object-contain drop-shadow-2xl"
            />
          </div>

          {/* CTA Button - Next to Image */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="hidden md:flex flex-col items-start gap-4"
          >
            <p className="text-white/60 text-xs max-w-[140px] leading-relaxed">
              Elevate the Fit.
            </p>
            <Link 
              href="/services"
              className="px-6 py-3 bg-green-500 text-black font-medium rounded-full text-sm hover:bg-green-400 transition-all duration-300"
            >
              TRY NOW
            </Link>
          </motion.div>
        </motion.div>

        {/* Mobile CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="md:hidden mt-6 relative z-20"
        >
          <Link 
            href="/services"
            className="px-6 py-3 bg-green-500 text-black font-medium rounded-full text-sm hover:bg-green-400 transition-all duration-300"
          >
            TRY NOW
          </Link>
        </motion.div>

        {/* Description - Bottom Left */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="absolute bottom-20 md:bottom-24 left-8 md:left-16 max-w-xs hidden md:block"
        >
          <p className="text-white/60 text-xs md:text-sm leading-relaxed">
            Get Your Perfect Fit: Where Precision Meets
            Ergonomic Excellence with MouseFit.
          </p>
        </motion.div>

        {/* Social Icons - Bottom Right */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="absolute bottom-20 md:bottom-24 right-8 md:right-16 flex items-center gap-3 md:gap-4"
        >
          <a href="#" className="text-white/40 hover:text-white transition-colors">
            <Instagram className="w-4 h-4 md:w-5 md:h-5" />
          </a>
          <a href="#" className="text-white/40 hover:text-white transition-colors">
            <Twitter className="w-4 h-4 md:w-5 md:h-5" />
          </a>
          <a href="#" className="text-white/40 hover:text-white transition-colors">
            <Facebook className="w-4 h-4 md:w-5 md:h-5" />
          </a>
          <a href="#" className="text-white/40 hover:text-white transition-colors">
            <Linkedin className="w-4 h-4 md:w-5 md:h-5" />
          </a>
        </motion.div>
      </main>
    </div>
  );
}
