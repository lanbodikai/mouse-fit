export type ServiceStatus = "available" | "coming_soon";
export type ServiceAccent = "gamer" | "amber" | "emerald" | "info";
export type ServiceIconKey = "mousefit" | "keyboard" | "mousepad" | "desk";

export type PlatformService = {
  id: string;
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  status: ServiceStatus;
  statusLabel: string;
  availabilityNote: string;
  primaryCta: string;
  accent: ServiceAccent;
  icon: ServiceIconKey;
  studioHref: string;
  dashboardHref?: string;
  highlights: string[];
};

export const PLATFORM_SERVICES: PlatformService[] = [
  {
    id: "mouse-fit",
    name: "Mouse Fit",
    shortName: "Mouse Fit",
    tagline: "Find the mouse shape that actually fits your hand and grip.",
    description:
      "Profile hand size, detect grip style, and generate a data-backed shortlist of mice that match your control style.",
    status: "available",
    statusLabel: "Available now",
    availabilityNote: "Live in the product today.",
    primaryCta: "Open Mouse Fit",
    accent: "gamer",
    icon: "mousefit",
    studioHref: "/mouse-fit",
    dashboardHref: "/survey",
    highlights: ["Hand measure", "Grip analysis", "Fit-ranked shortlist"],
  },
  {
    id: "keyboard-finder",
    name: "Keyboard Finder",
    shortName: "Keyboard Finder",
    tagline: "Match layout, switch feel, and typing style without guesswork.",
    description:
      "A guided selector for keyboard size, switch preference, acoustics, and gaming versus typing balance.",
    status: "coming_soon",
    statusLabel: "Coming soon",
    availabilityNote: "In planning now.",
    primaryCta: "Coming soon",
    accent: "amber",
    icon: "keyboard",
    studioHref: "/keyboard-finder",
    highlights: ["Layout matching", "Switch feel mapping", "Use-case tuning"],
  },
  {
    id: "mousepad-match",
    name: "Mousepad Match",
    shortName: "Mousepad Match",
    tagline: "Pick the surface that complements your mouse, sensor, and speed.",
    description:
      "Compare glide, stopping power, texture, and size so your mouse and pad work as one setup instead of two separate guesses.",
    status: "coming_soon",
    statusLabel: "Coming soon",
    availabilityNote: "Queued after Keyboard Finder.",
    primaryCta: "Coming soon",
    accent: "emerald",
    icon: "mousepad",
    studioHref: "/mousepad-match",
    highlights: ["Glide profile", "Surface pairing", "Size guidance"],
  },
  {
    id: "desk-height-tune",
    name: "Desk Height Tune",
    shortName: "Desk Height Tune",
    tagline: "Dial in desk, chair, and arm position for longer comfortable sessions.",
    description:
      "Tune desk height and posture signals so the rest of your setup supports aim, comfort, and daily endurance.",
    status: "coming_soon",
    statusLabel: "Coming soon",
    availabilityNote: "Planned for the setup layer.",
    primaryCta: "Coming soon",
    accent: "info",
    icon: "desk",
    studioHref: "/desk-height-tune",
    highlights: ["Height calibration", "Posture checks", "Ergonomic tuning"],
  },
];

export const PLATFORM_STEPS = [
  {
    title: "Start with Mouse Fit",
    detail: "Launch the live workflow today to measure your hand, classify grip, and generate your first fit profile.",
  },
  {
    title: "Expand the desk profile",
    detail: "Keyboard Finder, Mousepad Match, and Desk Height Tune will layer on top of the same user profile.",
  },
  {
    title: "Recommend the full setup",
    detail: "The long-term goal is one front page that helps users tune the entire desk, not just one device.",
  },
] as const;

export const ACTIVE_SERVICE_COUNT = PLATFORM_SERVICES.filter((service) => service.status === "available").length;
export const UPCOMING_SERVICE_COUNT = PLATFORM_SERVICES.length - ACTIVE_SERVICE_COUNT;
