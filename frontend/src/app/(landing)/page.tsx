"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { VideoBackdrop } from "@/components/landing/VideoBackdrop";
import { ContactModal } from "@/components/landing/ContactModal";
import { getSession } from "@/lib/auth";
import { buildAuthIntent, buildLoginUrl, persistAuthIntent, TRY_NOW_DESTINATION } from "@/lib/auth-intent";
import { 
  HERO_BG_MP4
} from "@/config/media";
import { ArrowUpRight, Circle, Pencil, ChevronDown, User } from "lucide-react";

type SectionId = "hero" | "services" | "contact";

const sections: SectionId[] = ["hero", "services", "contact"];

const sectionVideos: Record<SectionId, string> = {
  hero: HERO_BG_MP4,
  services: "",
  contact: "",
};

const SECTION_TRANSITION_MS = 520;
const NAV_LOCK_MS = 460;
const WHEEL_MIN_DELTA = 20;

// Zoom transition variants
const zoomVariants = {
  enter: {
    scale: 0.985,
    opacity: 0,
  },
  center: {
    scale: 1,
    opacity: 1,
  },
  exit: {
    scale: 1.015,
    opacity: 0,
  },
};

export default function LandingPage() {
  const router = useRouter();
  const [currentSection, setCurrentSection] = useState<SectionId>("hero");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const navLockRef = useRef(false);
  const navLockTimeoutRef = useRef<number | null>(null);
  const transitionTimeoutRef = useRef<number | null>(null);
  const wheelAccumRef = useRef(0);
  const wheelRafRef = useRef<number | null>(null);

  const openContactModal = useCallback(() => setIsContactModalOpen(true), []);
  const closeContactModal = useCallback(() => setIsContactModalOpen(false), []);
  useEffect(() => {
    return () => {
      if (navLockTimeoutRef.current !== null) {
        window.clearTimeout(navLockTimeoutRef.current);
      }
      if (transitionTimeoutRef.current !== null) {
        window.clearTimeout(transitionTimeoutRef.current);
      }
      if (wheelRafRef.current !== null) {
        window.cancelAnimationFrame(wheelRafRef.current);
      }
    };
  }, []);

  // Navigate to a specific section with zoom animation
  const navigateToSection = useCallback((sectionId: SectionId) => {
    if (isTransitioning || sectionId === currentSection) return;
    
    setIsTransitioning(true);
    setCurrentSection(sectionId);

    // Reset transitioning state after animation
    if (transitionTimeoutRef.current !== null) {
      window.clearTimeout(transitionTimeoutRef.current);
    }
    transitionTimeoutRef.current = window.setTimeout(() => {
      setIsTransitioning(false);
      transitionTimeoutRef.current = null;
    }, SECTION_TRANSITION_MS);
  }, [isTransitioning, currentSection]);

  // Navigate to next sectionG
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

  useEffect(() => {
    if (typeof window === "undefined") return;

    const navRoutes = ["/", "/services", "/about-us"] as const;

    const isTypingTarget = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      if (!el) return false;
      const tag = (el.tagName || "").toLowerCase();
      return tag === "input" || tag === "textarea" || tag === "select" || el.isContentEditable;
    };

    const lock = () => {
      navLockRef.current = true;
      if (navLockTimeoutRef.current !== null) {
        window.clearTimeout(navLockTimeoutRef.current);
      }
      navLockTimeoutRef.current = window.setTimeout(() => {
        navLockRef.current = false;
        navLockTimeoutRef.current = null;
      }, NAV_LOCK_MS);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isContactModalOpen) return;
      if (isTypingTarget(e.target)) return;
      if (isTransitioning || navLockRef.current) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        lock();
        goToNextSection();
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        lock();
        goToPrevSection();
        return;
      }

      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        const dir = e.key === "ArrowRight" ? 1 : -1;
        const idx = 0;
        const next = (idx + dir + navRoutes.length) % navRoutes.length;
        router.push(navRoutes[next]);
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (isTypingTarget(e.target)) return;
      if (isContactModalOpen || isTransitioning || navLockRef.current) {
        e.preventDefault();
        return;
      }

      e.preventDefault();
      wheelAccumRef.current += e.deltaY;

      if (wheelRafRef.current !== null) return;
      wheelRafRef.current = window.requestAnimationFrame(() => {
        wheelRafRef.current = null;

        const wheelDelta = wheelAccumRef.current;
        wheelAccumRef.current = 0;
        if (Math.abs(wheelDelta) < WHEEL_MIN_DELTA) return;

        const toNext = wheelDelta > 0;
        lock();
        if (toNext) goToNextSection();
        else goToPrevSection();
      });
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("wheel", onWheel);
    };
  }, [
    router,
    currentSection,
    goToNextSection,
    goToPrevSection,
    isContactModalOpen,
    isTransitioning,
  ]);

  const handleTryNow = useCallback(() => {
    const session = getSession();
    if (session?.access_token) {
      router.push("/dashboard");
      return;
    }

    persistAuthIntent(buildAuthIntent(TRY_NOW_DESTINATION, "try_now"));
    router.push(buildLoginUrl(TRY_NOW_DESTINATION));
  }, [router]);

  return (
    <div className="relative h-screen w-screen overflow-hidden overscroll-none">
      {/* Video Backdrop - Changes based on current section */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSection}
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.985 }}
          transition={{ duration: 0.42, ease: "easeInOut" }}
          className="fixed inset-0 z-0 pointer-events-none will-change-transform"
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
            duration: 0.42, 
            ease: [0.22, 1, 0.36, 1]
          }}
          className="relative z-10 h-screen w-screen will-change-transform"
        >
          {currentSection === "hero" && (
            <HeroSection onTryNow={handleTryNow} />
          )}
          {currentSection === "services" && (
            <ServicesSection onNavigate={navigateToSection} />
          )}
          {currentSection === "contact" && (
            <ContactSection onContactClick={openContactModal} />
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
                ? "bg-[color:var(--accent-violet)] scale-125" 
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

      <ContactModal isOpen={isContactModalOpen} onClose={closeContactModal} />
    </div>
  );
}

// Navigation Component - Home active, links to other pages
function LandingNavigation({
  isTransitioning,
}: {
  isTransitioning: boolean;
}) {
  return (
    <>
      {/* Top Navigation Bar */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="fixed top-0 left-0 right-0 z-50 px-8 py-6 flex items-center justify-between"
      >
        {/* Left spacer */}
        <div className="w-24" aria-hidden />

        {/* Profile Button - Top Right */}
        <Link
          href="/user"
          onClick={(e) => {
            if (isTransitioning) e.preventDefault();
          }}
          aria-disabled={isTransitioning}
          className={`flex items-center gap-2 px-3 py-2 rounded-full transition-all ${
            isTransitioning
              ? "opacity-50 pointer-events-none text-white/60"
              : "text-white/60 hover:text-white hover:bg-white/5"
          }`}
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
        {/* Scroll indicator */}
        <div className="flex items-center gap-2 text-white/60 text-sm">
          <span className="text-[color:var(--accent-violet)]">+</span>
          <span>Scroll to explore</span>
        </div>

        {/* Center Navigation - Home active, others link to pages */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-white"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--accent-violet)]" />
            Home
          </Link>
          <Link
            href="/services"
            className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
          >
            Services
            <span className="text-[color:var(--accent-violet)]">+</span>
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
function HeroSection({ onTryNow }: { onTryNow: () => void }) {
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
              <span className="text-white text-xs tracking-[0.3em] uppercase">
              [ AI-POWERED ANALYSIS FOR GAMERS ]
              </span>
            </motion.div>

            <div className="space-y-2">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-light text-white leading-[1.1]">
                Mousefit
              </h1>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-light text-white leading-[1.1]">
                <span className="bg-gradient-to-r from-[#00a8e8] via-[#8b5cf6] to-[#34d399] bg-clip-text text-transparent">
                  Studio
                </span>{" "}
                <span className="text-white">v2</span>
              </h1>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="pt-4"
            >
              <button
                type="button"
                onClick={onTryNow}
                className="group inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-white transition-all duration-200 mf-neon-btn"
              >
                <span className="text-white text-sm">Try now</span>
                <div className="flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-black/45 transition-colors group-hover:bg-black/65">
                  <ArrowUpRight className="w-4 h-4 text-[color:var(--accent-gamer)]" />
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
                Built for people
              </p>
              <p className="text-4xl md:text-5xl lg:text-6xl font-extralight text-white/90">
                who care.
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
  onNavigate,
}: { 
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
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-[color:var(--accent-violet-line)] bg-black/45">
                  <Circle className="w-3 h-3 text-[color:var(--accent-violet)]" strokeWidth={3} />
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
                className="group flex items-center gap-3 rounded-full px-6 py-3 text-sm text-white transition-all duration-200 mf-neon-btn"
              >
                <span className="text-white text-sm">Contact us</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/45 transition-colors group-hover:bg-black/65">
                  <ArrowUpRight className="w-4 h-4 text-[color:var(--accent-gamer)]" />
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
              <span className="text-white text-xs tracking-[0.3em] uppercase">
                [ MOUSEFIT STUDIO ]
              </span>
              <p className="text-white/60 text-sm leading-relaxed max-w-md">
                · helps users find the best fitting peripherals.<br/>
                · focuses on top-tier products and user-first service.<br/>
                · streamlines recommendations from gaming mice to full PC builds.<br/>
                · helps uncover the perfect gear for your setup.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </main>
  );
}

// Contact Section (third part of home)
function ContactSection({
  onContactClick,
}: {
  onContactClick: () => void;
}) {

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
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[color:var(--accent-violet-line)] bg-black/45">
                <Pencil className="w-4 h-4 text-[color:var(--accent-violet)]" />
              </span>
            </h1>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="text-white/50 text-sm md:text-base max-w-md mx-auto leading-relaxed"
          >
            Need help finding your fit or understanding your results? We’re one click away.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="pt-4 flex justify-center"
          >
            <button
              onClick={onContactClick}
              className="group flex items-center gap-3 rounded-full px-6 py-3 text-sm text-white transition-all duration-200 mf-neon-btn"
            >
              <span className="text-white text-sm">Contact us</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/45 transition-colors group-hover:bg-black/65">
                <ArrowUpRight className="w-4 h-4 text-[color:var(--accent-gamer)]" />
              </div>
            </button>
          </motion.div>
        </motion.div>
      </div>
    </main>
  );
}
