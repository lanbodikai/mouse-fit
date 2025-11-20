import React, { useState } from 'react';
import './Carousel.css';

// Keep your 4 specific items
const slides = [
  { 
    title: "Hand Measure", 
    image: "https://images.unsplash.com/photo-1589254065878-42c9da997008?auto=format&fit=crop&w=600&q=80" 
  },
  { 
    title: "Grip Test", 
    image: "https://images.unsplash.com/photo-1615663245857-acda5b2a615d?auto=format&fit=crop&w=600&q=80"
  },
  { 
    title: "Mouse Database", 
    image: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=600&q=80"
  },
  { 
    title: "Ask AI", 
    image: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=600&q=80"
  },
];

const Carousel = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  const nextSlide = () => {
    setActiveIndex((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setActiveIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

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
      {/* Side Controls */}
      <button onClick={prevSlide} className="mf-nav-btn prev-btn">❮</button>
      <button onClick={nextSlide} className="mf-nav-btn next-btn">❯</button>

      <div className="mf-track">
        {slides.map((slide, index) => (
          <div 
            key={index} 
            className={getClassName(index)}
            onClick={() => setActiveIndex(index)}
          >
            <img src={slide.image} alt={slide.title} />
            <div className="mf-overlay">
              <h3>{slide.title}</h3>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Carousel;