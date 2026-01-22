"use client";

import Script from "next/script";
import { useEffect } from "react";

const styles = `
:root.dark{
  --bg:#06080b; --deep:#05060a; --ink:#071022; --roy:#0a1c3a;
  --fg:#eaf0ff; --sub:#a6b0c8; --border:rgba(255,255,255,.07);
  --neon:linear-gradient(90deg,#7c3aed 0%,#22d3ee 50%,#a78bfa 100%);
  --btn-bg:rgba(255,255,255,.1); --btn-text:#fff; --btn-border:rgba(255,255,255,.1);
  --input-bg:rgba(255,255,255,.05); --input-text:#fff; --input-border:rgba(255,255,255,.1);
  --card-bg:#06080b; --card-text:#fff; --card-border:rgba(255,255,255,.1);
  --chip-bg:rgba(255,255,255,.1); --chip-text:#fff; --chip-border:rgba(255,255,255,.1);
}
:root.light{
  --bg:#f9fafb; --deep:#f3f4f6; --ink:#e5e7eb; --roy:#d1d5db;
  --fg:#1a1a1a; --sub:#6b7280; --border:rgba(0,0,0,.07);
  --neon:linear-gradient(90deg,#7c3aed 0%,#22d3ee 50%,#a78bfa 100%);
  --btn-bg:rgba(0,0,0,.1); --btn-text:#000; --btn-border:rgba(0,0,0,.1);
  --input-bg:rgba(0,0,0,.05); --input-text:#000; --input-border:rgba(0,0,0,.1);
  --card-bg:#ffffff; --card-text:#000; --card-border:rgba(0,0,0,.1);
  --chip-bg:rgba(0,0,0,.1); --chip-text:#000; --chip-border:rgba(0,0,0,.1);
}
:root{
  --bg:#06080b; --deep:#05060a; --ink:#071022; --roy:#0a1c3a;
  --fg:#eaf0ff; --sub:#a6b0c8; --border:rgba(255,255,255,.07);
  --neon:linear-gradient(90deg,#7c3aed 0%,#22d3ee 50%,#a78bfa 100%);
}
.tool-shell, .tool-shell *{box-sizing:border-box}
.tool-shell{
  height:100%;
  margin:0;
  font-family:'Sora', system-ui, Arial;
  color:var(--fg);
}

/* Page Layout */
.page { max-width: 1200px; margin: 0 auto; padding: 24px 20px; }
.layout { display:grid; grid-template-columns: 1fr 340px; gap: 28px; align-items: start; }
@media (max-width: 960px) { .layout { grid-template-columns: 1fr; } }

/* Search Bar */
.search-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    gap: 16px;
}
.search-bar input[type="text"] {
  flex:1; min-width: 240px; padding:12px 16px; border-radius:20px;
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  color: var(--input-text); font-family:inherit;
  transition: all .2s ease;
}
.search-bar input[type="text"]:focus {
  outline:none; border-color: var(--input-border);
  background: var(--input-bg);
  opacity: 0.8;
}
.btn {
  padding:12px 18px; border-radius:20px; font-weight:700; cursor:pointer;
  border:1px solid var(--btn-border); background:var(--btn-bg); color:var(--btn-text);
  transition: all .2s;
}
.btn:hover { background:var(--btn-bg); opacity:0.8; }

/* Grid */
.grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
.pill {
  display:flex; flex-direction:column; gap:8px; padding:18px; border-radius:30px;
  background: var(--card-bg); border: 1px solid var(--card-border);
  cursor:pointer; transition: transform .2s ease, border-color .2s ease, background .2s ease;
}
.pill:hover {
  transform: translateY(-2px);
  border-color: var(--card-border);
  background: var(--card-bg);
  opacity: 0.9;
}
.pill h3 { margin:0; font-size: 1.05rem; font-weight:700; letter-spacing:0.02em; color:var(--card-text); }
.specs { display:flex; flex-wrap:wrap; gap:6px; margin-top:4px; }
.chip {
  padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; font-family: 'JetBrains Mono', monospace;
  background: var(--chip-bg); color: var(--chip-text);
  border: 1px solid var(--chip-border);
}
.chip--weight { background: var(--chip-bg); border-color: var(--chip-border); }
.chip--shape  { background: var(--chip-bg); border-color: var(--chip-border); }

/* Sidebar */
#details.card {
  position:sticky; top: 80px;
  background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 30px; padding: 24px;
  backdrop-filter: blur(10px);
}
#details h2 { margin-top:0; font-size:1.4rem; color:var(--card-text); }
#details .muted { color: var(--sub); line-height:1.6; }
`;

const bodyHtml = `
  <main class="page">
    <section class="layout">
      <div>
        <div class="search-bar">
          <input id="q" type="text" placeholder="Filter by brand, specs, shape..." />
          <button id="clear" class="btn">Clear</button>
        </div>
        <div id="grid" class="grid" aria-live="polite"></div>
      </div>
      <aside>
        <div id="details" class="card">
          <h2>Details</h2>
          <p class="muted">Select a mouse to see specs.</p>
          <div id="detailContent"></div>
        </div>
      </aside>
    </section>
  </main>

  <footer class="foot" style="text-align:center; padding:20px; color:var(--sub);">
    <div class="foot-inner"><span>© <span id="y"></span> Mouse-Fit</span></div>
  </footer>
`;

export default function DatabasePage() {
  useEffect(() => {
    // Ensure script runs on every navigation
    const initScript = () => {
      // Re-run initialization if elements exist
      const grid = document.getElementById('grid');
      if (grid && typeof window !== 'undefined') {
        // Trigger a custom event that mice-page.js can listen to
        window.dispatchEvent(new CustomEvent('database-page-ready'));
      }
    };

    // Run immediately and also after a short delay to ensure DOM is ready
    initScript();
    const timeoutId = setTimeout(initScript, 100);

    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <div className="h-full">
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div className="tool-shell" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
      <Script
        id="db-year"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: "document.getElementById('y').textContent = new Date().getFullYear();" }}
      />
      <Script 
        type="module" 
        src="/src/js/mice-page.js" 
        strategy="afterInteractive"
        key="mice-page-script"
      />
    </div>
  );
}
