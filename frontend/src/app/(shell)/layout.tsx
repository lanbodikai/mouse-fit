"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import DashboardShell from "@/components/layout/DashboardShell";

type CameraWindow = Window & {
  stopCam?: () => void;
  stopCamGrip?: () => void;
};

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const stopAllCameras = () => {
    if (typeof window === "undefined") return;
    const cameraWindow = window as CameraWindow;

    if (cameraWindow.stopCam) {
      try {
        cameraWindow.stopCam();
      } catch {}
    }
    if (cameraWindow.stopCamGrip) {
      try {
        cameraWindow.stopCamGrip();
      } catch {}
    }

    const videoElements = document.querySelectorAll("video");
    videoElements.forEach((video) => {
      if (video.srcObject) {
        const stream = video.srcObject as MediaStream;
        stream.getTracks().forEach((track) => {
          track.stop();
        });
        video.srcObject = null;
      }
    });
  };

  useEffect(() => {
    const isCameraPage = pathname === "/measure" || pathname === "/grip";

    if (!isCameraPage) {
      stopAllCameras();
    }

    return () => {
      stopAllCameras();
    };
  }, [pathname]);

  return <DashboardShell>{children}</DashboardShell>;
}
