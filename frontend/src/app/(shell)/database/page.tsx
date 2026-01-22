import Script from "next/script";

const styles = `
:root{
  --deep:#05060a; --ink:#071022; --roy:#0a1c3a;
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
  background: rgba(255,255,255,.05);
  border: 1px solid rgba(255,255,255,.1);
  color: #fff; font-family:inherit;
  transition: all .2s ease;
}
.search-bar input[type="text"]:focus {
  outline:none; border-color: rgba(255,255,255,.2);
  background: rgba(255,255,255,.1);
}
.btn {
  padding:12px 18px; border-radius:20px; font-weight:700; cursor:pointer;
  border:1px solid rgba(255,255,255,.1); background:rgba(255,255,255,.1); color:#fff;
  transition: all .2s;
}
.btn:hover { background:rgba(255,255,255,.2); }

/* Grid */
.grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
.pill {
  display:flex; flex-direction:column; gap:8px; padding:18px; border-radius:30px;
  background: #000; border: 1px solid rgba(255,255,255,.1);
  cursor:pointer; transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease, background .2s ease;
}
.pill:hover {
  transform: translateY(-2px);
  border-color: rgba(255,255,255,.2);
  box-shadow: 0 30px 60px rgba(0,0,0,.45);
  background: rgba(255,255,255,.05);
}
.pill h3 { margin:0; font-size: 1.05rem; font-weight:700; letter-spacing:0.02em; color:#fff; }
.specs { display:flex; flex-wrap:wrap; gap:6px; margin-top:4px; }
.chip {
  padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; font-family: 'JetBrains Mono', monospace;
  background: rgba(255,255,255,.1); color: #fff;
  border: 1px solid rgba(255,255,255,.1);
}
.chip--weight { background: rgba(255,255,255,.1); border-color: rgba(255,255,255,.15); }
.chip--shape  { background: rgba(255,255,255,.1); border-color: rgba(255,255,255,.15); }

/* Sidebar */
#details.card {
  position:sticky; top: 80px;
  background: #000; border: 1px solid rgba(255,255,255,.1); border-radius: 30px; padding: 24px;
  box-shadow: 0 30px 60px rgba(0,0,0,.45); backdrop-filter: blur(10px);
}
#details h2 { margin-top:0; font-size:1.4rem; color:#fff; }
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
  return (
    <div className="h-full">
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div className="tool-shell" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
      <Script
        id="db-year"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: "document.getElementById('y').textContent = new Date().getFullYear();" }}
      />
      <Script type="module" src="/src/js/mice-page.js" strategy="afterInteractive" />
    </div>
  );
}
