"use client";

import { useEffect, useRef, useState } from "react";
import "./Carousel.css";

const slides = [
  {
    title: "Hand Measure",
    subtitle: "Blueprint-scale scans",
    statLabel: "profiles",
    statValue: "48k",
    image: "/projects/measure.png",
  },
  {
    title: "Grip Test",
    subtitle: "Realtime force curves",
    statLabel: "tests",
    statValue: "32k",
    image: "/projects/grip.png",
  },
  {
    title: "Mouse Database",
    subtitle: "Tailored gear drops",
    statLabel: "mice",
    statValue: "1.2k",
    image: "/projects/rapid.png",
  },
  {
    title: "Ask AI",
    subtitle: "Neon-fit co-pilot",
    statLabel: "answers",
    statValue: "50k",
    image: "/projects/ai.png",
  },
];

export default function Carousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [hoverDirection, setHoverDirection] = useState<"left" | "right" | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!hoverDirection) {
      if (hoverTimerRef.current) {
        clearInterval(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
      return;
    }

    const step = () => {
      setActiveIndex((prev) =>
        hoverDirection === "left"
          ? (prev - 1 + slides.length) % slides.length
          : (prev + 1) % slides.length,
      );
    };

    hoverTimerRef.current = setInterval(step, 700);

    return () => {
      if (hoverTimerRef.current) {
        clearInterval(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
    };
  }, [hoverDirection]);

  const getClassName = (index: number) => {
    const len = slides.length;
    const position = (index - activeIndex + len) % len;

    if (position === 0) return "mf-slide active";
    if (position === 1) return "mf-slide next";
    if (position === len - 1) return "mf-slide prev";
    return "mf-slide hidden";
  };

  return (
    <div className="mf-carousel-container">
      <div
        className="mf-hover-zone mf-hover-left"
        onMouseEnter={() => setHoverDirection("left")}
        onMouseLeave={() => setHoverDirection(null)}
      />
      <div
        className="mf-hover-zone mf-hover-right"
        onMouseEnter={() => setHoverDirection("right")}
        onMouseLeave={() => setHoverDirection(null)}
      />
      <div className="mf-track">
        {slides.map((slide, index) => (
          <div key={slide.title} className={getClassName(index)} onClick={() => setActiveIndex(index)}>
            <img src={slide.image} alt={slide.title} />
            <div className="mf-overlay">
              <span className="mf-overlay-label">MouseFit</span>
              <h3>{slide.title}</h3>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
