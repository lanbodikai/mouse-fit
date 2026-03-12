# Dashboard Shell Refactor

This PR/update introduces a new 1:1 replica of the Unity Dashboard Kit structure, using the project's existing theme and content.

## Architecture

- **`components/layout/DashboardShell.tsx`**: The main wrapper. It provides the full-screen centered "dashboard canvas" with large rounded corners, soft outer shadow, and subtle background gradient/blur behind it.
- **`components/layout/Sidebar.tsx`**: The left navigation sidebar. It features a logo, grouped navigation links, and active state pill highlights using Framer Motion's `layoutId` for smooth transitions.
- **`components/layout/TopBar.tsx`**: The top header row with a greeting, dynamic page title, search input, and notification badge.
- **`components/ui/Card.tsx`**: A reusable card system (`Card`, `CardHeader`, `CardTitle`, `CardContent`, etc.) with consistent radius, shadows, borders, and backdrop blur.

## How to Add a New Dashboard Page Section

1. Create a new page under `src/app/(shell)/[your-page-name]/page.tsx`.
2. Import the `Card` components from `@/components/ui/Card`.
3. Use the motion presets (see below) to wrap your sections for consistent entry animations.
4. Add your new route to the `mainNav` or `toolsNav` arrays in `src/components/layout/Sidebar.tsx`.

## Motion Presets Usage

We use `framer-motion` for all animations to match the video's vibe.

- **Page Load Stagger**: Wrap your page content in a `motion.div` with the `staggerContainer` variant.
- **Fade Up**: Apply the `fadeUp` variant to child elements for a smooth translateY + opacity entry.
- **Hover/Press States**: Use `whileHover={{ scale: 1.02 }}` and `whileTap={{ scale: 0.98 }}` on interactive elements.
- **Active Pill Highlight**: Use `layoutId="sidebar-active"` (or similar) on a conditional `motion.div` to animate the background pill smoothly between tabs/nav items.

```tsx
const staggerContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};
```

## Token/Theme Rules

- **No Hardcoded Colors**: All colors use existing Tailwind tokens or the project's CSS variables (e.g., `bg-fuchsia-500/20`, `text-cyan-400`).
- **Glass/Blur Vibe**: Achieved using `backdrop-blur-md` (or `3xl` for the shell) combined with low-opacity backgrounds (`bg-[#0a0b0d]/80` or `bg-white/5`).
- **Borders & Shadows**: Use `border-white/5` or `border-white/10` for subtle definition, and `shadow-[0_0_15px_rgba(217,70,239,0.15)]` for neon glows that match the project's aesthetic.
