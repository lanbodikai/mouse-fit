/**
 * Media Configuration for Landing Pages
 * 
 * Add your MP4 file paths here. All videos should be placed in the public folder
 * and referenced with a leading slash (e.g., "/videos/hero-bg.mp4")
 * 
 * Background videos: Loop continuously, muted, cover the viewport
 * Transition videos: Play once during page navigation, overlay on top
 */

// Background MP4s for each page (looping)
export const HERO_BG_MP4 = "/videos/fp-1.mp4";
export const ABOUT_BG_MP4 = "/videos/test2.mp4";
export const NAV_BG_MP4 = "";
export const CONTACT_BG_MP4 = "";

// Transition MP4s (play once during navigation)
export const TRANSITION_TO_ABOUT_MP4 = "";
export const TRANSITION_TO_NAV_MP4 = "";
export const TRANSITION_TO_CONTACT_MP4 = "";
export const TRANSITION_TO_HOME_MP4 = "";

// Route to background mapping
export const ROUTE_BACKGROUNDS: Record<string, string> = {
  "/": HERO_BG_MP4,
  "/about": ABOUT_BG_MP4,
  "/navigate": NAV_BG_MP4,
  "/contact": CONTACT_BG_MP4,
};

// Route to transition mapping
export const ROUTE_TRANSITIONS: Record<string, string> = {
  "/": TRANSITION_TO_HOME_MP4,
  "/about": TRANSITION_TO_ABOUT_MP4,
  "/navigate": TRANSITION_TO_NAV_MP4,
  "/contact": TRANSITION_TO_CONTACT_MP4,
};
