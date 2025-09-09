// src/projects/Projects.jsx
import React, { useEffect, useRef } from "react";

const items = [
  { title: "Hand Measure",      subtitle: "by Mouse-Fit Labs",  tag: "Open",        href: "/htmls/measure.html", img: "/projects/measure.jpg" },
  { title: "Grip Checker",      subtitle: "by Junkai Zhao",     tag: "Open",        href: "/htmls/grip.html",    img: "/projects/grip.jpg"    },
  { title: "AI Mouse-Finder",   subtitle: "LLM-powered picks",  tag: "Open",        href: "/htmls/ai.html",      img: "/projects/ai.jpg"      },
  { title: "Rapid Trigger Tweak", subtitle: "keyboard tuning kit", tag: "Coming soon", href: "#",                  img: "/projects/rapid.jpg",  disabled: true },
];

export default function Projects() {
  const scrollerRef = useRef(null);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    let raf, paused = false;
    const step = () => { if (!paused) scroller.scrollLeft += 0.4; raf = requestAnimationFrame(step); };
    scroller.addEventListener("mouseenter", () => (paused = true));
    scroller.addEventListener("mouseleave", () => (paused = false));
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  // press glow helpers (adds .is-press during mouse/touch)
  const addPress = (e) => e.currentTarget.classList.add("is-press");
  const removePress = (e) => e.currentTarget.classList.remove("is-press");

  return (
    <section className="proj-section">
      <h2 className="proj-title">PROJECTS</h2>

      <div className="carousel-wrap" ref={scrollerRef}>
        <div className="fade-left" aria-hidden />
        <div className="fade-right" aria-hidden />

        <div className="carousel" id="projects-scroll">
          {items.map((it, i) => (
            <a
              key={i}
              className={`proj-card mf-fullimg mf-format${it.disabled ? " is-disabled" : ""}`}
              href={it.disabled ? undefined : it.href}
              onClick={(e) => it.disabled && e.preventDefault()}
              onMouseDown={addPress}
              onMouseUp={removePress}
              onMouseLeave={removePress}
              onTouchStart={addPress}
              onTouchEnd={removePress}
              title={it.title}
            >
              {/* Full-bleed artwork */}
              <div className="thumb">
                <img src={it.img} alt="" loading="lazy" />
              </div>

              {/* Neon ribbon (lighter) */}
              <div className="mf-ribbon-neon">
                <div className="mf-title">{it.title}</div>
                <span className={`mf-tag ${it.tag?.toLowerCase().includes("open") ? "is-open" : "is-soon"}`}>
                  {it.tag}
                </span>
                <div className="mf-sub">{it.subtitle}</div>
              </div>

              {/* Original meta kept hidden to avoid breaking anything else */}
              <div className="meta" style={{ display: "none" }}>
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
