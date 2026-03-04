"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    // Stop camera when not on measure or grip pages
    const isCameraPage = pathname === '/measure' || pathname === '/grip';
    
    if (!isCameraPage) {
      // Stop camera if we're not on a camera page
      if (typeof window !== 'undefined') {
        // Try to stop measure page camera
        if ((window as any).stopCam) {
          try {
            (window as any).stopCam();
          } catch (e) {
            // Ignore errors
          }
        }
        // Try to stop grip page camera
        if ((window as any).stopCamGrip) {
          try {
            (window as any).stopCamGrip();
          } catch (e) {
            // Ignore errors
          }
        }
        
        // Stop all active video tracks from any video elements
        const videoElements = document.querySelectorAll('video');
        videoElements.forEach(video => {
          if (video.srcObject) {
            const stream = video.srcObject as MediaStream;
            stream.getTracks().forEach(track => {
              track.stop();
            });
            video.srcObject = null;
          }
        });
      }
    }
  }, [pathname]);

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden">
      {/* Background gradient - black + neon */}
      <div 
        className="fixed inset-0 -z-10"
        style={{
          background: "linear-gradient(135deg, #05060a 0%, #071022 58%, #0a1c3a 100%)",
        }}
      />

      {/* Ambient neon glow */}
      <div 
        className="fixed inset-0 -z-10"
        style={{
          background: "radial-gradient(ellipse at 14% 8%, rgba(217, 70, 239, 0.16) 0%, transparent 58%), radial-gradient(ellipse at 84% 88%, rgba(34, 211, 238, 0.14) 0%, transparent 62%)",
        }}
      />

      {/* Noise texture overlay */}
      <div
        className="fixed inset-0 -z-10 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Main content */}
      <main className="relative z-10 min-h-screen pt-20 pb-24">
        {children}
      </main>
    </div>
  );
}

