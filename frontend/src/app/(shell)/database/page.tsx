"use client";

import Script from "next/script";
import { useEffect } from "react";
import { ShellNav } from "@/components/shell/ShellNav";

const styles = `
:root {
  --bg: #030806;
  --fg: #eaf0ff;
  --sub: #6b8068;
  --border: rgba(34, 197, 94, 0.15);
  --accent: #22c55e;
  --neon: linear-gradient(90deg, #22c55e 0%, #10b981 50%, #14b8a6 100%);
}

.tool-shell, .tool-shell * { box-sizing: border-box; }

.tool-shell {
  height: 100%;
  margin: 0;
  font-family: 'Sora', system-ui, Arial;
  color: var(--fg);
}

.page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px 20px;
}

.layout {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 24px;
  align-items: start;
}

@media (max-width: 960px) {
  .layout { grid-template-columns: 1fr; }
}

.search-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  gap: 12px;
}

.search-bar input[type="text"] {
  flex: 1;
  min-width: 200px;
  padding: 14px 18px;
  border-radius: 16px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid var(--border);
  color: var(--fg);
  font-family: inherit;
  font-size: 14px;
  transition: all 0.2s ease;
}

.search-bar input[type="text"]:focus {
  outline: none;
  border-color: var(--accent);
  background: rgba(0, 0, 0, 0.6);
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
  background: rgba(34, 197, 94, 0.1);
  color: var(--fg);
  transition: all 0.2s;
  font-size: 13px;
}

.btn:hover {
  background: rgba(34, 197, 94, 0.2);
  border-color: var(--accent);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.pill {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 18px;
  border-radius: 20px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid var(--border);
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);
}

.pill:hover {
  transform: translateY(-2px);
  border-color: var(--accent);
  background: rgba(34, 197, 94, 0.05);
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
  background: rgba(34, 197, 94, 0.1);
  color: var(--fg);
  border: 1px solid var(--border);
}

.chip--weight { background: rgba(34, 197, 94, 0.15); }
.chip--shape { background: rgba(16, 185, 129, 0.15); }

#details.card {
  position: sticky;
  top: 100px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid var(--border);
  border-radius: 24px;
  padding: 24px;
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
    </>
  );
}
