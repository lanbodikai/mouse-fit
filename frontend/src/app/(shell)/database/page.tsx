"use client";

import Script from "next/script";
import { useEffect } from "react";
import { ShellNav } from "@/components/shell/ShellNav";

const styles = `
:root {
  --bg: var(--bg0);
  --fg: var(--text-primary);
  --sub: var(--text-secondary);
  --border: var(--border-color);
  --accent: var(--accent-gamer);
  --accent-soft: var(--accent-gamer-fill);
  --accent-soft-strong: var(--accent-gamer-fill-strong);
  --highlight-soft: var(--accent-highlight-fill);
  --surface: var(--surface-soft);
  --surface-elevated: var(--surface-strong);
  --surface-focused: var(--surface-veil);
  --glow: var(--accent-gamer-glow);
}

.tool-shell, .tool-shell * { box-sizing: border-box; }

.tool-shell {
  min-height: 100%;
  margin: 0;
  font-family: 'Sora', system-ui, Arial;
  color: var(--fg);
  padding: clamp(10px, 1.4vw, 16px);
}

.page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 28px 26px 36px;
}

.layout {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 28px;
  align-items: start;
}

@media (max-width: 960px) {
  .layout { grid-template-columns: 1fr; }
}

.search-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  gap: 16px;
}

.search-bar input[type="text"] {
  flex: 1;
  min-width: 200px;
  padding: 14px 18px;
  border-radius: 16px;
  background: var(--surface-elevated);
  border: 1px solid var(--border);
  color: var(--fg);
  font-family: inherit;
  font-size: 14px;
  transition: all 0.2s ease;
}

.search-bar input[type="text"]:focus {
  outline: none;
  border-color: var(--accent);
  background: var(--surface-focused);
}

.search-bar input[type="text"]::placeholder {
  color: var(--sub);
}

.btn {
  padding: 14px 20px;
  border-radius: 16px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid var(--border);
  background: var(--accent-soft);
  color: var(--fg);
  transition: all 0.2s;
  font-size: 13px;
}

.btn:hover {
  background: var(--accent-soft-strong);
  border-color: var(--accent);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.pill {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 22px;
  border-radius: 20px;
  background: var(--surface);
  border: 1px solid var(--border);
  cursor: pointer;
  transition: all 0.2s ease;
}

.pill:hover {
  transform: translateY(-2px);
  border-color: var(--accent);
  background: rgba(255, 255, 255, 0.04);
  border-left: 3px solid var(--accent);
}

.pill h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--fg);
}

.specs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}

.chip {
  padding: 4px 10px;
  border-radius: 10px;
  font-size: 0.7rem;
  font-family: 'JetBrains Mono', monospace;
  background: var(--accent-soft);
  color: var(--fg);
  border: 1px solid var(--border);
}

.chip--weight {
  background: var(--accent-emerald-fill, rgba(52, 211, 153, 0.14));
  border-color: var(--accent-emerald-line, rgba(52, 211, 153, 0.28));
  color: var(--accent-emerald, #34d399);
}
.chip--shape {
  background: var(--accent-violet-fill, rgba(139, 92, 246, 0.14));
  border-color: var(--accent-violet-line, rgba(139, 92, 246, 0.28));
  color: var(--accent-violet, #8b5cf6);
}
.chip--sensor {
  background: var(--accent-amber-fill, rgba(245, 158, 11, 0.14));
  border-color: var(--accent-amber-line, rgba(245, 158, 11, 0.28));
  color: var(--accent-amber, #f59e0b);
}

#details.card {
  position: sticky;
  top: 100px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-top: 2px solid var(--accent);
  border-radius: 24px;
  padding: 28px;
  backdrop-filter: blur(10px);
}

#details h2 {
  margin-top: 0;
  font-size: 1.3rem;
  color: var(--accent);
  font-weight: 600;
}

#details .muted {
  color: var(--sub);
  line-height: 1.6;
  font-size: 14px;
}

.foot {
  text-align: center;
  padding: 24px;
  color: var(--sub);
  font-size: 12px;
}
`;

const bodyHtml = `
  <main class="page">
    <section class="layout">
      <div>
        <div class="search-bar">
          <input id="q" type="text" placeholder="Search by brand, specs, shape..." />
          <button id="clear" class="btn">Clear</button>
        </div>
        <div id="grid" class="grid" aria-live="polite"></div>
      </div>
      <aside>
        <div id="details" class="card">
          <h2>Mouse Details</h2>
          <p class="muted">Select a mouse to see full specifications.</p>
          <div id="detailContent"></div>
        </div>
      </aside>
    </section>
  </main>

  <footer class="foot">
    <span>© <span id="y"></span> MouseFit</span>
  </footer>
`;

export default function DatabasePage() {
  useEffect(() => {
    const initScript = () => {
      const grid = document.getElementById('grid');
      if (grid && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('database-page-ready'));
      }
    };

    initScript();
    const timeoutId = setTimeout(initScript, 100);

    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <>
      <ShellNav currentPage="database" />
      <div className="h-full min-h-0">
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
    </>
  );
}
