import React, { useState } from 'react';
import './Navbar.css';

const Navbar = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <nav className="navbar">
      <div className="nav-container">
        {/* Logo */}
        <div className="logo">
          <a href="/index.html" className="logo-text">
            MOUSE<span className="highlight">FIT</span>
          </a>
        </div>

        {/* Desktop Menu */}
        <div className={`nav-menu ${isMobileOpen ? 'active' : ''}`}>
          <a href="/index.html" className="nav-link">Home</a>

          {/* Dropdown Section */}
          <div 
            className="nav-item dropdown" 
            onMouseEnter={() => setIsDropdownOpen(true)}
            onMouseLeave={() => setIsDropdownOpen(false)}
          >
            <span className="nav-link dropdown-trigger">
              Showcase ▾
            </span>
            <div className={`dropdown-menu ${isDropdownOpen ? 'show' : ''}`}>
              <a href="/htmls/measure.html" className="dropdown-link">Hand Measure</a>
              <a href="/htmls/grip.html" className="dropdown-link">Grip Test</a>
              <a href="/htmls/report.html" className="dropdown-link">Report Page</a>
            </div>
          </div>

          {/* New Links */}
          <a href="/htmls/mouse-db.html" className="nav-link">Mouse Database</a>
          <a href="/htmls/ai.html" className="nav-link special-link">AI Agent</a>
        </div>

        {/* Mobile Hamburger */}
        <div className="hamburger" onClick={() => setIsMobileOpen(!isMobileOpen)}>
          <span className="bar"></span>
          <span className="bar"></span>
          <span className="bar"></span>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
