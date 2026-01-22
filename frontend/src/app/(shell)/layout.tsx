"use client";

import Sidebar from "@/components/shell/Sidebar";
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
      }
      
      // Stop all active video tracks
      if (navigator.mediaDevices) {
        navigator.mediaDevices.getUserMedia({ video: true })
          .then(stream => {
            stream.getTracks().forEach(track => track.stop());
          })
          .catch(() => {
            // Ignore errors - camera might not be active
          });
      }
    }
  }, [pathname]);

  return (
    <div className="stage-viewport animate-page-zoom relative">
      {/* Background Gradient - Behind all elements including sidebar */}
      <div
        className="fixed inset-0 w-full h-full bg-gradient-to-b from-slate-600 to-gray-900 z-0"
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
