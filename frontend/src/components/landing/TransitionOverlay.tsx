"use client";

import { useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TransitionOverlayProps {
  src: string;
  isVisible: boolean;
  onTransitionComplete: () => void;
}

const SAFETY_TIMEOUT = 5000; // 5 seconds max for transition

/**
 * Full-screen transition video overlay.
 * Fades in, plays video once, then calls onTransitionComplete.
 */
export function TransitionOverlay({
  src,
  isVisible,
  onTransitionComplete,
}: TransitionOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasCalledComplete = useRef(false);

  const completeTransition = useCallback(() => {
    if (hasCalledComplete.current) return;
    hasCalledComplete.current = true;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    onTransitionComplete();
  }, [onTransitionComplete]);

  useEffect(() => {
    if (!isVisible) {
      hasCalledComplete.current = false;
      return;
    }

    const video = videoRef.current;
    
    // If no video source, complete immediately after a brief fade
    if (!src) {
      timeoutRef.current = setTimeout(completeTransition, 400);
      return;
    }

    if (!video) return;

    const handleEnded = () => {
      completeTransition();
    };

    const handleError = () => {
      // If video fails, complete transition anyway
      completeTransition();
    };

    video.addEventListener("ended", handleEnded);
    video.addEventListener("error", handleError);

    // Start playing the video
    video.currentTime = 0;
    video.play().catch(() => {
      // Autoplay blocked, complete transition
      completeTransition();
    });

    // Safety timeout in case video gets stuck
    timeoutRef.current = setTimeout(completeTransition, SAFETY_TIMEOUT);

    return () => {
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("error", handleError);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isVisible, src, completeTransition]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] pointer-events-none"
          style={{ background: src ? "transparent" : "rgba(0, 0, 0, 0.8)" }}
        >
          {src && (
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              muted
              playsInline
              preload="auto"
            >
              <source src={src} type="video/mp4" />
            </video>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
