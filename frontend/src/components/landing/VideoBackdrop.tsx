"use client";

import { useEffect, useRef, useState } from "react";

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
  const isDev = process.env.NODE_ENV === "development";

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    setHasError(false);
    setIsLoaded(false);

    const handleCanPlay = () => {
      setIsLoaded(true);
      video.play().catch(() => {
        // Autoplay may be blocked, that's okay
      });
    };

    const handleError = () => {
      setHasError(true);
    };

    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("error", handleError);

    // Attempt to load the video
    video.load();

    return () => {
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("error", handleError);
      video.pause();
      video.src = "";
      video.load();
    };
  }, [src]);

  const showFallback = !src || hasError;

  return (
    <div className={`fixed inset-0 -z-10 overflow-hidden ${className}`}>
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
            {!src ? "Missing video src" : "Video failed to load"}
          </div>
        )}
      </div>

      {/* Video element */}
      {src && !hasError && (
        <video
          ref={videoRef}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
            isLoaded ? "opacity-100" : "opacity-0"
          }`}
          muted
          loop
          playsInline
          preload="auto"
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
