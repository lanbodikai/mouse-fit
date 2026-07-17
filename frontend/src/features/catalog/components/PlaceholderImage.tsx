"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";

export function PlaceholderImage({ title, imageUrl }: { title: string; imageUrl: string | null }) {
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const showPending = !imageUrl || failedImageUrl === imageUrl;

  if (!showPending) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={title}
        onError={() => setFailedImageUrl(imageUrl)}
        className="h-full w-full object-contain drop-shadow-[0_18px_40px_rgba(0,0,0,0.28)]"
      />
    );
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-white text-[#747a6e]">
      <span className="absolute right-2 top-2 rounded bg-[#eef1e9] px-2 py-1 text-[10px] font-medium text-[#62695d]">
        No image
      </span>
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#eef1e9]">
        <ImageOff className="h-5 w-5" />
      </div>
      <div className="text-center">
        <p className="text-xs font-medium text-[#62695d]">Image unavailable</p>
      </div>
    </div>
  );
}
