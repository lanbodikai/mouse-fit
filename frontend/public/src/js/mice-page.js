// MouseFit • Mouse Database page.
// Loads mice from the backend API and normalizes varied dataset shapes.

import { loadMice } from "./mice-api.js";

const $ = (sel) => document.querySelector(sel);
let grid = null;
let q = null;
let clearBtn = null;
let detail = null;

function bindDom() {
  grid = $('#grid');
  q = $('#q');
  clearBtn = $('#clear');
  detail = $('#detailContent');
  return Boolean(grid && q && clearBtn && detail);
}

// --- utils ---
function mm(v) { return (v || v === 0) ? `${v} mm` : '—'; }
function g(v) { return (v || v === 0) ? `${v} g` : '—'; }
function usd(v) {
  if (v == null || v === '') return '—';
  if (typeof v === 'number' && Number.isFinite(v)) return `$${v.toFixed(0)}`;
  const maybeNum = Number(v);
  return Number.isFinite(maybeNum) ? `$${maybeNum.toFixed(0)}` : '—';
}
function cmFrom(mmVal) { return (mmVal || mmVal === 0) ? (mmVal/10).toFixed(1) + ' cm' : '—'; }

function pick(m, keys, fallback='') {
  for (const k of keys) {
    if (m && m[k] != null && m[k] !== '') return m[k];
  }
  return fallback;
}

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

// Normalize any incoming mouse object to a consistent view model
function normalize(m) {
  const brand = String(pick(m, ['brand','manufacturer','maker'], '')).trim() || undefined;
  const name  = String(pick(m, ['name','model','title','product'], '')).trim() || undefined;

  const weight_g = toNumber(pick(m, ['weight_g','weight','g','mass_g']));
  // Dimensions might come as mm or cm; try multiple keys.
  let length_mm = toNumber(pick(m, ['length_mm','length','l_mm']));
  let width_mm  = toNumber(pick(m, ['width_mm','width','w_mm']));
  let height_mm = toNumber(pick(m, ['height_mm','height','h_mm']));
  const length_cm = toNumber(pick(m, ['length_cm','l_cm']));
  const width_cm  = toNumber(pick(m, ['width_cm','w_cm']));
  const height_cm = toNumber(pick(m, ['height_cm','h_cm']));

  if (!length_mm && length_cm) length_mm = Math.round(length_cm * 10);
  if (!width_mm  && width_cm ) width_mm  = Math.round(width_cm * 10);
  if (!height_mm && height_cm) height_mm = Math.round(height_cm * 10);

  const shape  = pick(m, ['shape','form','ergonomics'], undefined);
  const sensor = pick(m, ['sensor','sensor_model','sensorName'], undefined);
  const price_usd = toNumber(pick(m, ['price_usd','price','usd','msrp']));
  const images = pick(m, ['images','imgs','photos'], []) || [];
  const notes  = pick(m, ['notes','summary','desc','description'], undefined);
  const scoreHints = pick(m, ['scoreHints','gripHints','tags'], undefined);
  const id = (pick(m, ['id','sku','slug'], `${brand||''}-${name||''}`)).toString();

  return { id, brand, name, weight_g, length_mm, width_mm, height_mm, shape, sensor, price_usd, images, notes, scoreHints, _raw: m };
}

function primarySpecs(m) {
  return [
    { label: `${g(m.weight_g)}`,           kind: 'weight' },
    m.length_mm ? { label: `${mm(m.length_mm)} L`, kind: 'dim' } : null,
    m.width_mm  ? { label: `${mm(m.width_mm)} W`,  kind: 'dim' } : null,
    (m.price_usd != null) ? { label: usd(m.price_usd), kind: 'price' } : null,
  ].filter(Boolean);
}



function describe(m) {
  const dims = [m.length_mm && `${m.length_mm}mm length`, m.width_mm && `${m.width_mm}mm width`, m.height_mm && `${m.height_mm}mm height`]
    .filter(Boolean).join(', ');
  const gripHints = Array.isArray(m.scoreHints) ? m.scoreHints.join(', ') : (m.scoreHints || '');
  return `${m.brand || ''} ${m.name || ''}. ${dims}. Weight ${m.weight_g || ''}g. Shape ${m.shape || ''}. Sensor ${m.sensor || ''}. ${gripHints}. ${m.notes || ''}`.trim();
}

function chipHTML(s) {
  // use class per kind for color styling
  return `<span class="chip chip--${s.kind}">${s.label}</span>`;
}

function pill(m) {
  const el = document.createElement('button');
  el.className = 'pill';
  el.type = 'button';
  el.setAttribute('aria-label', `${m.brand || ''} ${m.name || ''}`.trim() || 'mouse');
  el.innerHTML = `
    <h3>${m.brand ? `<span class="muted">${m.brand}</span> ` : ''}${m.name || '(unnamed)'}</h3>
    <div class="specs">
  ${primarySpecs(m).map(chipHTML).join('')}
</div>

  `;
  el.addEventListener('click', () => showDetails(m));
  return el;
}

function renderGrid(list) {
  grid.innerHTML = '';
  if (!list || list.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'muted';
    empty.style.padding = '12px';
    empty.textContent = 'No matches. Try broader terms like "small", "ergonomic", or a brand name.';
    grid.appendChild(empty);
    return;
  }
  for (const m of list) grid.appendChild(pill(m));
}

function showDetails(m) {
  const img = (m.images && m.images[0]) ? `<img src="${m.images[0]}" alt="${m.name || 'mouse'}" style="width:100%; border-radius:12px; border:1px solid var(--line-dim); margin-bottom:12px;"/>` : '';
  detail.innerHTML = `
    ${img}
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; margin-bottom: 12px;">
      <div><strong>Brand</strong><br>${m.brand || '—'}</div>
      <div><strong>Name</strong><br>${m.name || '—'}</div>
      <div><strong>Weight</strong><br>${g(m.weight_g)}</div>
      <div><strong>Dimensions</strong><br>L ${mm(m.length_mm)} · W ${mm(m.width_mm)} · H ${mm(m.height_mm)}</div>
      <div><strong>Shape</strong><br>${m.shape || '—'}</div>
      <div><strong>Sensor</strong><br>${m.sensor || '—'}</div>
      <div><strong>Price</strong><br>${usd(m.price_usd)}</div>
      <div><strong>Notes</strong><br>${m.notes || '—'}</div>
    </div>
    <div style="display:flex; gap:8px; flex-wrap: wrap;">
      <button class="btn" id="copy-spec">Copy specs</button>
    </div>
  `;

  $('#copy-spec')?.addEventListener('click', async () => {
    const text = `${m.brand || ''} ${m.name || ''}\n` +
      `Weight: ${g(m.weight_g)}, Size: L ${mm(m.length_mm)}, W ${mm(m.width_mm)}, H ${mm(m.height_mm)}\n` +
      `Shape: ${m.shape || '—'}, Sensor: ${m.sensor || '—'}\n` +
      (m.price_usd ? `Price: ${usd(m.price_usd)}\n` : '') +
      (m.notes ? `Notes: ${m.notes}\n` : '');
    try { await navigator.clipboard.writeText(text); toast('Copied to clipboard'); } catch { console.log('Clipboard blocked'); }
  });
}

function toast(msg) {
  const t = document.createElement('div');
  t.textContent = msg;
  t.style.position = 'fixed';
  t.style.bottom = '16px';
  t.style.left = '50%';
  t.style.transform = 'translateX(-50%)';
  t.style.background = 'var(--bg-2)';
  t.style.border = '1px solid var(--line)';
  t.style.padding = '8px 12px';
  t.style.borderRadius = '10px';
  t.style.zIndex = '9999';
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 1400);
}

// --- local filter (no network) ---
function localFilter(query, items) {
  if (!query) return items.slice();
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);

  return items.filter(m => {
    const hay = `${m.brand || ''} ${m.name || ''} ${describe(m)}`.toLowerCase();

    // numeric shortcuts: <70g, <=120mm, >125mm
    for (const tok of tokens) {
      const mWeight = /^([<>]=?)(\d+)\s*g$/.exec(tok);
      const mLen = /^([<>]=?)(\d+)\s*mm$/.exec(tok);
      if (mWeight) {
        const [, op, num] = mWeight; const n = Number(num);
        const w = Number(m.weight_g ?? NaN);
        if (!Number.isFinite(w)) return false;
        if (op === '<'  && !(w <  n)) return false;
        if (op === '<=' && !(w <= n)) return false;
        if (op === '>'  && !(w >  n)) return false;
        if (op === '>=' && !(w >= n)) return false;
        continue;
      }
      if (mLen) {
        const [, op, num] = mLen; const n = Number(num);
        const L = Number(m.length_mm ?? NaN);
        if (!Number.isFinite(L)) return false;
        if (op === '<'  && !(L <  n)) return false;
        if (op === '<=' && !(L <= n)) return false;
        if (op === '>'  && !(L >  n)) return false;
        if (op === '>=' && !(L >= n)) return false;
        continue;
      }
      if (!hay.includes(tok)) return false;
    }
    return true;
  });
}

let initialized = false;
let all = null;

async function boot() {
  if (!bindDom()) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
      setTimeout(boot, 50);
    }
    return;
  }

  // Only initialize once, but re-render on navigation
  if (!initialized) {
    // Build normalized array once
    try {
      const mice = await loadMice();
      all = Array.isArray(mice) ? mice.map(normalize).filter(Boolean) : [];
    } catch (e) {
      console.warn("Failed to load mice from API; showing empty list.", e);
      all = [];
    }

    const handleQueryInput = () => {
      const query = q.value.trim();
      const filtered = localFilter(query, all);
      renderGrid(filtered);
    };

    let debounceTimer = null;
    q.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(handleQueryInput, 200);
    });
    clearBtn.addEventListener('click', () => { q.value = ''; handleQueryInput(); });

    initialized = true;
  }

  // Always re-render on navigation
  if (all) {
    const handleQueryInput = () => {
      const query = q.value.trim();
      const filtered = localFilter(query, all);
      renderGrid(filtered);
    };

    // Deep-link support: /htmls/mouse-db.html?q=lightweight claw <70g
    const urlQ = new URLSearchParams(location.search).get('q');
    if (urlQ) { 
      q.value = urlQ; 
      handleQueryInput(); 
    } else {
      // Render all items if no query
      renderGrid(all);
    }

    // Optional: pre-select first item
    if (all[0]) showDetails(all[0]);
  }
}

// Listen for navigation events
if (typeof window !== 'undefined') {
  window.addEventListener('database-page-ready', boot);
}

boot();
