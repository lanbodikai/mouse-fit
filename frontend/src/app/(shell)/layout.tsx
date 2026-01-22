"use client";

import Sidebar from "@/components/shell/Sidebar";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "@/lib/theme";

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme } = useTheme();

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
        
        // Also stop any tracks from navigator.mediaDevices.getUserMedia calls
        // Note: We can't enumerate active streams directly, but we can stop tracks
        // that are attached to video elements (done above)
      }
    }
  }, [pathname]);

  return (
    <div className="stage-viewport animate-page-zoom relative">
      {/* Background Gradient - Behind all elements including sidebar */}
      <div
        className="fixed inset-0 w-full h-full z-0 transition-colors duration-300"
        style={{
          background: theme === "dark" 
            ? "linear-gradient(to bottom, #475569, #111827)"
            : "linear-gradient(to bottom,rgb(185, 201, 220),rgb(172, 199, 254))"
        }}
        aria-hidden="true"
      />
      <div className="stage-shell relative z-10 -translate-y-[10px]">
        <div className="flex h-full w-full gap-4 p-4 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-hidden">{children}</main>
        </div>
      </div>
    </div>
  );
}
