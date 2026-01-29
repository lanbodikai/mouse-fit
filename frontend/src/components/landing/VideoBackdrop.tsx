"use client";

import { useCallback, useEffect, useRef, useState, type SyntheticEvent } from "react";

interface VideoBackdropProps {
  src: string;
  className?: string;
}

/**
 * Full-screen looping video backdrop component.
 * Shows a gradient fallback when src is empty or video fails to load.
 */
export function VideoBackdrop({ src, className = "" }: VideoBackdropProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [allowVideo, setAllowVideo] = useState(true);
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);
  const isDev = process.env.NODE_ENV === "development";

  useEffect(() => {
    if (!src) {
      if (isDev) {
        console.log("VideoBackdrop: Missing video src");
      }
      return;
    }

    if (isDev) {
      console.log("VideoBackdrop: Loading video", src);
    }
  }, [src, isDev]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const prefersReducedMotion =
      typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = Boolean((navigator as unknown as { connection?: { saveData?: boolean } })?.connection?.saveData);
    setAllowVideo(!(prefersReducedMotion || saveData));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!allowVideo || !src) {
      setShouldLoadVideo(false);
      return;
    }

    setShouldLoadVideo(false);
    const start = () => setShouldLoadVideo(true);

    // Let hydration/first paint happen before downloading large MP4s.
    const requestIdleCallback = (globalThis as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => number })
      .requestIdleCallback;
    const cancelIdleCallback = (globalThis as unknown as { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback;

    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(start, { timeout: 1200 });
      return () => cancelIdleCallback?.(id);
    }

    const t = setTimeout(start, 250);
    return () => clearTimeout(t);
  }, [allowVideo, src]);

  const handleVideoReady = useCallback(() => {
    setHasError(false);
    setIsLoaded(true);

    const video = videoRef.current;
    if (!video) return;

    if (!allowVideo) return;
    if (!video.paused) return;

    video.play().catch((err) => {
      if (isDev) {
        console.log("Video autoplay blocked:", err);
      }
    });
  }, [allowVideo, isDev]);

  const handleVideoError = useCallback(
    (event: SyntheticEvent<HTMLVideoElement>) => {
      console.error("Video loading error:", event);
      setHasError(true);
    },
    []
  );

  const showFallback = !allowVideo || !src || hasError;

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {/* Gradient fallback - Dark green/black like DOTDNA */}
      <div
        className={`absolute inset-0 transition-opacity duration-500 ${
          showFallback || !isLoaded ? "opacity-100" : "opacity-0"
        }`}
        style={{
          background: "linear-gradient(135deg, #030806 0%, #061208 25%, #0a1a0f 50%, #071510 75%, #030806 100%)",
        }}
      >
        {/* Subtle green ambient glow */}
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse at 50% 0%, rgba(34, 197, 94, 0.08) 0%, transparent 60%), radial-gradient(ellipse at 50% 100%, rgba(34, 197, 94, 0.05) 0%, transparent 50%)",
          }}
        />
        
        {/* Noise texture overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />
        
        {/* Dev hint when src is empty */}
        {isDev && showFallback && (
          <div className="absolute bottom-4 left-4 text-xs text-white/20 font-mono">
            {!allowVideo ? "Video disabled (reduced motion / data saver)" : !src ? "Missing video src" : "Video failed to load"}
          </div>
        )}
      </div>

      {/* Video element */}
      {allowVideo && shouldLoadVideo && src && !hasError && (
        <video
          ref={videoRef}
          onLoadStart={() => {
            // Show the fallback while the new src is fetching/decoding.
            setHasError(false);
            setIsLoaded(false);
          }}
          onCanPlay={handleVideoReady}
          onError={handleVideoError}
          className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-700 ${
            isLoaded ? "opacity-100" : "opacity-0"
          }`}
          muted
          loop
          playsInline
          preload="metadata"
          autoPlay
        >
          <source src={src} type="video/mp4" />
        </video>
      )}

      {/* Subtle vignette overlay */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.3) 100%)",
        }}
      />
    </div>
  );
}
