import React, { useState } from 'react';
import './Carousel.css';
import measureImg from '../../projects/measure.png';
import gripImg from '../../projects/grip.png';
import databaseImg from '../../projects/rapid.png';
import aiImg from '../../projects/ai.png';

// Keep your 4 specific items
const slides = [
  { 
    title: "Hand Measure", 
    subtitle: "Blueprint-scale scans",
    statLabel: "profiles",
    statValue: "48k",
    image: measureImg 
  },
  { 
    title: "Grip Test", 
    subtitle: "Realtime force curves",
    statLabel: "tests",
    statValue: "32k",
    image: gripImg
  },
  { 
    title: "Mouse Database", 
    subtitle: "Tailored gear drops",
    statLabel: "mice",
    statValue: "1.2k",
    image: databaseImg
  },
  { 
    title: "Ask AI", 
    subtitle: "Neon-fit co-pilot",
    statLabel: "answers",
    statValue: "50k",
    image: aiImg
  },
];

const Carousel = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  const getClassName = (index) => {
    const len = slides.length;
    // Calculate relative position
    const position = (index - activeIndex + len) % len;
    
    if (position === 0) return 'mf-slide active';
    if (position === 1) return 'mf-slide next';
    if (position === len - 1) return 'mf-slide prev';
    // For a 4-item carousel, the one opposite the active is hidden
    return 'mf-slide hidden';
  };

  return (
    <div className="mf-carousel-container">
      <div className="mf-track">
        {slides.map((slide, index) => (
          <div 
            key={index} 
            className={getClassName(index)}
            onClick={() => setActiveIndex(index)}
          >
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
};

export default Carousel;
