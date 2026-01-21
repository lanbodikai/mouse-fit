"use client";

import { useState } from "react";
import "./Navbar.css";

export default function Navbar() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="logo">
          <a href="/" className="logo-text">
            MOUSE<span className="highlight">FIT</span>
          </a>
        </div>

        <div className={`nav-menu ${isMobileOpen ? "active" : ""}`}>
          <a href="/" className="nav-link">
            Home
          </a>

          <div
            className="nav-item dropdown"
            onMouseEnter={() => setIsDropdownOpen(true)}
            onMouseLeave={() => setIsDropdownOpen(false)}
          >
            <span className="nav-link dropdown-trigger">Showcase ▾</span>
            <div className={`dropdown-menu ${isDropdownOpen ? "show" : ""}`}>
              <a href="/measure" className="dropdown-link">
                Hand Measure
              </a>
              <a href="/grip" className="dropdown-link">
                Grip Test
              </a>
              <a href="/report" className="dropdown-link">
                Report Page
              </a>
            </div>
          </div>

          <a href="/database" className="nav-link">
            Mouse Database
          </a>
          <a href="/ai" className="nav-link special-link">
            AI Agent
          </a>
        </div>

        <div className="hamburger" onClick={() => setIsMobileOpen(!isMobileOpen)}>
          <span className="bar"></span>
          <span className="bar"></span>
          <span className="bar"></span>
        </div>
      </div>
    </nav>
  );
}
