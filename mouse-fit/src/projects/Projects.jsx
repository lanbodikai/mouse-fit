// src/projects/Projects.jsx
import React from "react";
import { useEffect, useRef } from "react";

const items = [
  {
    title: "Hand Measure",
    tag: "Open",
    href: "/htmls/measure.html",
    img: "/projects/measure.jpg",
  },
  {
    title: "Grip Checker",
    tag: "Open",
    href: "/htmls/grip.html",
    img: "/projects/grip.jpg",
  },
  {
    title: "AI Mouse-Finder",
    tag: "Open",
    href: "/htmls/ai.html",
    img: "/projects/ai.jpg",
  },
  {
    title: "Rapid Trigger Tweak",
    tag: "Coming soon",
    href: "#",
    img: "/projects/rapid.jpg",
    disabled: true,
  },
];

export default function Projects() {
  const scrollerRef = useRef(null);
useEffect(() => {
  const scroller = scrollerRef.current;
  if (!scroller) return;

  let raf, paused = false;
  const step = () => {
    if (!paused) scroller.scrollLeft += 0.4;   // speed
    raf = requestAnimationFrame(step);
  };
  scroller.addEventListener("mouseenter", () => paused = true);
  scroller.addEventListener("mouseleave", () => paused = false);
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}, []);

  return (
    <section className="proj-section">
      <h2 className="proj-title">PROJECTS</h2>

      <div className="carousel-wrap">
        {/* edge fades */}
        <div className="fade-left" aria-hidden />
        <div className="fade-right" aria-hidden />

        <div className="carousel" id="projects-scroll">
          {items.map((it, i) => (
            <a
              key={i}
              className={`proj-card${it.disabled ? " is-disabled" : ""}`}
              href={it.disabled ? undefined : it.href}
              onClick={e => it.disabled && e.preventDefault()}
            >
              <div className="thumb">
                {/* If a preview doesn’t exist yet this will just show a soft panel */}
                <img src={it.img} alt="" loading="lazy" />
              </div>
              <div className="meta">
                <div className="name">{it.title}</div>
                <div className="tag">{it.tag}</div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

