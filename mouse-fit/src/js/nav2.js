// nav2.js — shared top bar for all MouseFit pages

const mfTools = [
  { label: "Hand Measure", href: "/src/htmls/measure.html" },
  { label: "Grip", href: "/src/htmls/grip.html" },
  { label: "Report Page", href: "/src/htmls/report.html" },
  { label: "Mouse Database", href: "/src/htmls/mouse-db.html" },
];

function buildTopbar() {
  if (document.querySelector(".mf-topbar")) return;

  const path = window.location.pathname;
  const dropId = "mf-tools-menu";

  const nav = document.createElement("header");
  nav.className = "mf-topbar";
  nav.innerHTML = `
    <div class="mf-topbar-inner">
      <a class="mf-brand" href="/">
        <img class="mf-logo" src="/vite.svg" alt="MouseFit logo" />
        <span class="mf-name">MouseFit</span>
      </a>

      <form class="mf-search" role="search" aria-label="Site search">
        <input type="search" name="q" placeholder="Search..." />
        <button type="submit" aria-label="Search">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M21 21l-4.35-4.35M10.5 18A7.5 7.5 0 1 1 18 10.5 7.5 7.5 0 0 1 10.5 18Z" fill="none" stroke="currentColor" stroke-width="2"/>
          </svg>
        </button>
      </form>

      <div class="mf-nav">
        <div class="mf-dropdown">
          <button class="mf-drop-trigger" type="button" aria-haspopup="true" aria-expanded="false" aria-controls="${dropId}">
            Mousefit Tools
            <svg class="mf-caret" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" />
            </svg>
          </button>
          <div class="mf-drop-panel" id="${dropId}" role="menu">
            ${mfTools
              .map(
                (tool) => `
                  <a href="${tool.href}" role="menuitem">${tool.label}</a>
                `,
              )
              .join("")}
          </div>
        </div>

        <a class="mf-link" href="/src/htmls/ai.html">Ask AI</a>
      </div>
    </div>
  `;

  document.body.prepend(nav);

  const trigger = nav.querySelector(".mf-drop-trigger");
  const panel = nav.querySelector(".mf-drop-panel");
  const links = Array.from(panel.querySelectorAll("a"));

  // Mark the active tool based on path
  links.forEach((link) => {
    const linkPath = new URL(link.href, location.origin).pathname;
    if (linkPath === path) {
      link.setAttribute("aria-current", "page");
    }
  });

  const closeMenu = () => {
    nav.classList.remove("mf-open");
    trigger?.setAttribute("aria-expanded", "false");
  };

  const toggleMenu = () => {
    const open = nav.classList.toggle("mf-open");
    trigger?.setAttribute("aria-expanded", String(open));
    if (open) {
      panel?.querySelector("a")?.focus?.();
    }
  };

  trigger?.addEventListener("click", (e) => {
    e.preventDefault();
    toggleMenu();
  });

  document.addEventListener("click", (e) => {
    if (!nav.contains(e.target)) closeMenu();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
    if (e.key === "ArrowDown" && document.activeElement === trigger) {
      e.preventDefault();
      nav.classList.add("mf-open");
      trigger?.setAttribute("aria-expanded", "true");
      panel?.querySelector("a")?.focus?.();
    }
  });
}

document.addEventListener("DOMContentLoaded", buildTopbar);
