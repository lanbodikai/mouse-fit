"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { VideoBackdrop } from "@/components/landing/VideoBackdrop";
import { 
  HERO_BG_MP4, 
  ABOUT_BG_MP4, 
  NAV_BG_MP4, 
  CONTACT_BG_MP4 
} from "@/config/media";
import { ArrowUpRight, Circle, Sparkles, Pencil, ChevronDown } from "lucide-react";

type SectionId = "hero" | "services" | "product" | "contact";

const sections: SectionId[] = ["hero", "services", "product", "contact"];

const sectionVideos: Record<SectionId, string> = {
  hero: HERO_BG_MP4,
  services: ABOUT_BG_MP4,
  product: NAV_BG_MP4,
  contact: CONTACT_BG_MP4,
};

// Zoom transition variants
const zoomVariants = {
  enter: {
    scale: 0.8,
    opacity: 0,
    filter: "blur(10px)",
  },
  center: {
    scale: 1,
    opacity: 1,
    filter: "blur(0px)",
  },
  exit: {
    scale: 1.3,
    opacity: 0,
    filter: "blur(10px)",
  },
};

export default function LandingPage() {
  const [currentSection, setCurrentSection] = useState<SectionId>("hero");
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Navigate to a specific section with zoom animation
  const navigateToSection = useCallback((sectionId: SectionId) => {
    if (isTransitioning || sectionId === currentSection) return;
    
    setIsTransitioning(true);
    setCurrentSection(sectionId);

    // Reset transitioning state after animation
    setTimeout(() => {
      setIsTransitioning(false);
    }, 800);
  }, [isTransitioning, currentSection]);

  // Navigate to next section
  const goToNextSection = useCallback(() => {
    const currentIndex = sections.indexOf(currentSection);
    if (currentIndex < sections.length - 1) {
      navigateToSection(sections[currentIndex + 1]);
    }
  }, [currentSection, navigateToSection]);

  // Navigate to previous section
  const goToPrevSection = useCallback(() => {
    const currentIndex = sections.indexOf(currentSection);
    if (currentIndex > 0) {
      navigateToSection(sections[currentIndex - 1]);
    }
  }, [currentSection, navigateToSection]);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      {/* Video Backdrop - Changes based on current section */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSection}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="fixed inset-0 -z-10"
        >
          <VideoBackdrop src={sectionVideos[currentSection]} />
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <LandingNavigation isTransitioning={isTransitioning} />

      {/* Section Content with Zoom Transitions */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSection}
          variants={zoomVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ 
            duration: 0.6, 
            ease: [0.22, 1, 0.36, 1] // Custom easing for smooth zoom
          }}
          className="h-screen w-screen"
        >
          {currentSection === "hero" && (
            <HeroSection onNext={goToNextSection} onNavigate={navigateToSection} />
          )}
          {currentSection === "services" && (
            <ServicesSection onNext={goToNextSection} onPrev={goToPrevSection} onNavigate={navigateToSection} />
          )}
          {currentSection === "product" && (
            <ProductSection onNext={goToNextSection} onPrev={goToPrevSection} onNavigate={navigateToSection} />
          )}
          {currentSection === "contact" && (
            <ContactSection onPrev={goToPrevSection} />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Section Indicator Dots */}
      <div className="fixed right-8 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-3">
        {sections.map((section, index) => (
          <button
            key={section}
            onClick={() => navigateToSection(section)}
            disabled={isTransitioning}
            className={`w-2 h-2 rounded-full transition-all duration-300 disabled:cursor-not-allowed ${
              currentSection === section 
                ? "bg-green-500 scale-125" 
                : "bg-white/30 hover:bg-white/50"
            }`}
            aria-label={`Go to section ${index + 1}`}
          />
        ))}
      </div>

      {/* Next Section Arrow (except on last section) */}
      {currentSection !== "contact" && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          onClick={goToNextSection}
          disabled={isTransitioning}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 p-3 text-white/50 hover:text-white transition-colors disabled:opacity-50"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <ChevronDown className="w-6 h-6" />
          </motion.div>
        </motion.button>
      )}
    </div>
  );
}

// Navigation Component - Home active, links to other pages
function LandingNavigation({ isTransitioning }: { isTransitioning: boolean }) {
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
        <Link href="/" className="flex items-center gap-2">
          <span className="text-lg font-bold tracking-wide text-white">
            <span className="text-green-500">DC</span> MOUSEFIT
          </span>
        </Link>

        {/* Contact Button - Top Right */}
        <button
          disabled={isTransitioning}
          className="flex items-center gap-3 text-white text-sm disabled:opacity-50 group"
          onClick={() => window.location.href = "mailto:contact@mousefit.com"}
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

        {/* Center Navigation - Home active, others link to pages */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-white"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            Home
          </Link>
          <Link
            href="/services"
            className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
          >
            Services
            <span className="text-green-500">+</span>
          </Link>
          <Link
            href="/product"
            className="text-sm text-white/60 hover:text-white transition-colors"
          >
            Product
          </Link>
          <Link
            href="/about-us"
            className="text-sm text-white/60 hover:text-white transition-colors"
          >
            About us
          </Link>
        </div>

        {/* Empty right side for balance */}
        <div className="w-32" />
      </motion.div>
    </>
  );
}

// Hero Section
function HeroSection({ 
  onNext,
  onNavigate,
}: { 
  onNext: () => void;
  onNavigate: (section: SectionId) => void;
}) {
  return (
    <main className="relative h-full flex items-center px-8 md:px-16 lg:px-24">
      <div className="w-full max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Column */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="space-y-8"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <span className="text-green-500 text-xs tracking-[0.3em] uppercase">
              [ AI-POWERED ANALYSIS FOR GAMERS ]
              </span>
            </motion.div>

            <div className="space-y-2">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-light text-white leading-[1.1]">
                Mousefit
              </h1>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-light text-white leading-[1.1]">
                Studio v2
              </h1>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="pt-4"
            >
              <button
                onClick={() => onNavigate("contact")}
                className="group flex items-center gap-3 px-6 py-3 bg-white/10 hover:bg-white/15 border border-white/20 rounded-full transition-all duration-200"
              >
                <span className="text-white text-sm">Contact us</span>
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center group-hover:bg-green-400 transition-colors">
                  <ArrowUpRight className="w-4 h-4 text-black" />
                </div>
              </button>
            </motion.div>
          </motion.div>

          {/* Right Column */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="hidden lg:flex flex-col items-end justify-center"
          >
            <div className="text-right space-y-2">
              <p className="text-4xl md:text-5xl lg:text-6xl font-extralight text-white/90">
                built by
              </p>
              <p className="text-4xl md:text-5xl lg:text-6xl font-extralight text-white/90">
                gamers.{" "}
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </main>
  );
}

// Services Section (second part of home)
function ServicesSection({ 
  onNext,
  onPrev,
  onNavigate,
}: { 
  onNext: () => void;
  onPrev: () => void;
  onNavigate: (section: SectionId) => void;
}) {
  return (
    <main className="relative h-full flex items-center px-8 md:px-16 lg:px-24">
      <div className="w-full max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          {/* Left Column */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="space-y-8"
          >
            <div className="space-y-1">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-light text-white leading-[1.2]">
                Know your
              </h1>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-light text-white leading-[1.2]">
                <span className="font-normal">fit</span>, confort,
              </h1>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-light text-white leading-[1.2] flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-8 h-8 border-2 border-dashed border-green-500 rounded-full">
                  <Circle className="w-3 h-3 text-green-500" strokeWidth={3} />
                </span>{" "}
                control.
              </h1>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-light text-white/60 leading-[1.2]">
                All in one place.
              </h1>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="pt-4"
            >
              <button
                onClick={() => onNavigate("contact")}
                className="group flex items-center gap-3 px-6 py-3 bg-white/10 hover:bg-white/15 border border-white/20 rounded-full transition-all duration-200"
              >
                <span className="text-white text-sm">Contact us</span>
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center group-hover:bg-green-400 transition-colors">
                  <ArrowUpRight className="w-4 h-4 text-black" />
                </div>
              </button>
            </motion.div>
          </motion.div>

          {/* Right Column */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="hidden lg:block pt-16"
          >
            <div className="space-y-6">
              <span className="text-green-500 text-xs tracking-[0.3em] uppercase">
                [ MOUSEFIT ]
              </span>
              <p className="text-white/60 text-sm leading-relaxed max-w-md">
                · accurately identifies your hand dimensions.<br/>
                · enriches your grip analysis using our self built ML model.<br/>
                · streamlines recommendations,<br/>
                · uncovers the perfect mouse match.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </main>
  );
}

// Product Section (third part of home) - Scrollable
function ProductSection({ 
  onNext,
  onPrev,
  onNavigate,
}: { 
  onNext: () => void;
  onPrev: () => void;
  onNavigate: (section: SectionId) => void;
}) {
  return (
    <main className="relative h-full overflow-y-auto scrollbar-hide">
      {/* Padding for fixed nav bars: top ~80px, bottom ~100px */}
      <div className="min-h-full flex flex-col items-center justify-center px-8 md:px-16 lg:px-24 py-28 md:py-24">
        <div className="w-full max-w-5xl mx-auto">
          {/* Centered Headline */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-center space-y-4 mb-12 md:mb-16"
          >
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-light text-white leading-[1.2]">
              True fit{" "}
              <span className="inline-flex items-center">
                <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-green-500 mx-1 md:mx-2" />
              </span>{" "}
            </h1>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-light text-white leading-[1.2]">
              Clean aim, smooth play
            </h1>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="text-white/50 text-sm md:text-base max-w-2xl mx-auto pt-4 md:pt-6 leading-relaxed"
            >
              MouseFit Studio build AI tools to help gamers like you. Our expertise extends across diverse hand sizes and grip styles backed by the highest standards of ergonomic analysis.
            </motion.p>
          </motion.div>

          {/* Feature Cards */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="grid md:grid-cols-2 gap-4 md:gap-6"
          >
            {/* Left Card */}
            <motion.div
              whileHover={{ y: -5 }}
              onClick={() => onNavigate("services")}
              className="group relative rounded-2xl overflow-hidden cursor-pointer aspect-[4/3] md:aspect-[4/3]"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-green-900/40 to-green-950/60 border border-white/10" />
              <div 
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage: `linear-gradient(rgba(34, 197, 94, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 197, 94, 0.1) 1px, transparent 1px)`,
                  backgroundSize: "60px 60px",
                }}
              />
              <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-end">
                <span className="text-green-500/60 text-xs tracking-[0.2em] uppercase mb-2 md:mb-3">
                  FITTING SOLUTIONS
                </span>
                <h3 className="text-lg md:text-2xl font-light text-white leading-snug">
                  We provide solutions for
                  <br />
                  your perfect mouse fit
                </h3>
              </div>
              <div className="absolute inset-0 bg-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </motion.div>

            {/* Right Card */}
            <motion.div
              whileHover={{ y: -5 }}
              onClick={() => onNavigate("contact")}
              className="group relative rounded-2xl overflow-hidden cursor-pointer aspect-[4/3] md:aspect-[4/3]"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-zinc-900/80 to-zinc-950/90 border border-white/10" />
              <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-between">
                <div>
                  <span className="text-white/40 text-xs tracking-[0.2em] uppercase">
                    WE STAY UP-TO-DATE
                  </span>
                </div>
                <div className="space-y-2 md:space-y-4">
                  <h3 className="text-lg md:text-2xl font-light text-white leading-snug">
                    Our focus is on stay
                    <span className="inline-flex items-center justify-center w-5 h-5 md:w-6 md:h-6 rounded-full bg-green-500 mx-1">
                      <span className="text-black text-[10px] md:text-xs">ing</span>
                    </span>
                    ahead
                    <br />
                    of the curve with the newest
                    <br />
                    technologies
                  </h3>
                </div>
                <div className="flex justify-center">
                  <div className="w-32 md:w-48 h-6 md:h-8 bg-gradient-to-b from-zinc-700/50 to-zinc-800/50 rounded-t-lg border-t border-x border-white/10" />
                </div>
              </div>
              <div className="absolute inset-0 bg-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </main>
  );
}

// Contact Section (fourth part of home)
function ContactSection({ onPrev }: { onPrev: () => void }) {
  const handleContactClick = () => {
    window.location.href = "mailto:contact@mousefit.com";
  };

  return (
    <main className="relative h-full flex flex-col items-center justify-center px-8 md:px-16 lg:px-24">
      <div className="w-full max-w-3xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="space-y-8"
        >
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-light text-white leading-[1.2]">
              Contact us
            </h1>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-light text-white leading-[1.2] flex items-center justify-center gap-3">
              Today{" "}
              <span className="inline-flex items-center justify-center w-10 h-10 border-2 border-dashed border-green-500 rounded-lg">
                <Pencil className="w-4 h-4 text-green-500" />
              </span>
            </h1>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="text-white/50 text-sm md:text-base max-w-md mx-auto leading-relaxed"
          >
            Whenever you have queries, require expert advice, or
            need prompt support, we are just a click away.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="pt-4 flex justify-center"
          >
            <button
              onClick={handleContactClick}
              className="group flex items-center gap-3 px-6 py-3 bg-white/10 hover:bg-white/15 border border-white/20 rounded-full transition-all duration-200"
            >
              <span className="text-white text-sm">Contact us</span>
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center group-hover:bg-green-400 transition-colors">
                <ArrowUpRight className="w-4 h-4 text-black" />
              </div>
            </button>
          </motion.div>
        </motion.div>
      </div>
    </main>
  );
}
