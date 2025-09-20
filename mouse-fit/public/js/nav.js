// Canonical site navbar: injects the same header on ALL pages.
const NAV_LINKS = [
  { href: "/",                    text: "MouseFit", isBrand: true },
  { href: "/htmls/measure.html",  text: "Hand Measure" },
  { href: "/htmls/grip.html",     text: "Grip" },
  { href: "/htmls/report.html",   text: "Report" },
  { href: "/htmls/mice.html",     text: "Mouse Database" },
  { href: "/htmls/ai.html",       text: "AI Agent" },
];

function currentPathKey() {
  const p = location.pathname.replace(/\/+$/, "") || "/";
  if (p === "/" || p.endsWith("/index.html")) return "/";
  return p;
}

function buildNav() {
  const header = document.createElement("header");
  header.className = "nav";
  header.innerHTML = `
    <div class="nav-inner">
      <a class="brand" href="/">MouseFit</a>
      <nav class="links">
        <a href="/htmls/measure.html">Hand Measure</a>
        <a href="/htmls/grip.html">Grip</a>
        <a href="/htmls/report.html">Report</a>
        <a href="/htmls/mice.html">Mouse Database</a>
        <a href="/htmls/ai.html">AI Agent</a>
      </nav>
    </div>
  `;
  document.body.prepend(header);

  // highlight active
  const key = currentPathKey();
  const anchors = header.querySelectorAll(".links a");
  for (const a of anchors) {
    const ahref = a.getAttribute("href");
    if (ahref && (ahref === key)) a.classList.add("active");
  }
}

document.addEventListener("DOMContentLoaded", buildNav);
