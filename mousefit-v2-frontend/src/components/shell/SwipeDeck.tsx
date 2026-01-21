"use client";

import { useRef, useState } from "react";

type SwipeDeckSlide = {
  id: string;
  content: React.ReactNode;
};

type SwipeDeckProps = {
  slides: SwipeDeckSlide[];
  className?: string;
  dotClassName?: string;
};

export default function SwipeDeck({ slides, className, dotClassName }: SwipeDeckProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const startX = useRef<number | null>(null);

  const clampIndex = (next: number) => Math.max(0, Math.min(next, slides.length - 1));

  const handleStart = (clientX: number) => {
    startX.current = clientX;
  };

  const handleEnd = (clientX: number) => {
    if (startX.current === null) return;
    const delta = clientX - startX.current;
    if (Math.abs(delta) > 40) {
      setActiveIndex((prev) => clampIndex(delta < 0 ? prev + 1 : prev - 1));
    }
    startX.current = null;
  };

  return (
    <div
      className={`select-none ${className ?? ""}`}
      onTouchStart={(event) => handleStart(event.touches[0]?.clientX ?? 0)}
      onTouchEnd={(event) => handleEnd(event.changedTouches[0]?.clientX ?? 0)}
      onMouseDown={(event) => handleStart(event.clientX)}
      onMouseUp={(event) => handleEnd(event.clientX)}
      onMouseLeave={() => {
        startX.current = null;
      }}
    >
      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {slides.map((slide) => (
            <div key={slide.id} className="min-w-full">
              {slide.content}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 flex items-center justify-center gap-2">
        {slides.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            onClick={() => setActiveIndex(index)}
            className={`h-2 w-2 rounded-full transition ${
              index === activeIndex ? "bg-white" : "bg-white/25 hover:bg-white/50"
            } ${dotClassName ?? ""}`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
