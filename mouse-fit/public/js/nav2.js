// nav2.js — index.html navigation with section highlighting + real page links

// Mix of in-page sections and external pages:
const navItems = [
  // type: 'section' => anchor within index.html
  { type: 'section', id: 'home',     label: 'Home' },
    {
    href: '/index.html#projects',
    label: 'Projects',
    attrs: { 'data-link': 'projects' },
    isActive: ({ path, hash }) => {
      const onHome = path === '/' || path.endsWith('/index.html');
      return onHome && hash === '#projects';
    },
  },
  { type: 'section', id: 'about',    label: 'About the author' },

  // type: 'page' => normal navigation to another HTML (like nav.js)
  
  {
    type: 'page',
    href: '/htmls/mice.html',
    label: 'Mouse-Database',
    // same active logic as your nav.js
    isActive: ({ path }) =>
      path.endsWith('/htmls/mice.html') || path.endsWith('/htmls/mouse-db.html'),
  },

  // (Optional) add more external pages like your original nav:
  // { type: 'page', href: '/htmls/measure.html', label: 'Measure' },
  // { type: 'page', href: '/htmls/grip.html',    label: 'Grip' },
  // { type: 'page', href: '/htmls/ai.html',      label: 'AI' },
  // { type: 'page', href: '/htmls/report.html',  label: 'Report' },
];

function buildNav2() {
  const state = { path: window.location.pathname, hash: window.location.hash };

  const nav = document.createElement('nav');
  nav.className = 'nav';
  nav.innerHTML = `
    <div class="nav-inner">
      <a class="brand" href="#home" data-scroll>
        <span class="logo-pill" aria-hidden="true">MF</span>
        <span class="brand-text">Mouse-Fit</span>
      </a>

      <ul class="nav-links" role="list" data-links></ul>

      <div class="nav-spacer" aria-hidden="true"></div>

      <label class="search" role="search" aria-label="Site search">
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M21 21l-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z"
                fill="none" stroke="currentColor" stroke-width="2"/>
        </svg>
        <input type="search" placeholder="Search" aria-label="Search" />
      </label>

      <a class="reg-btn" href="#" data-action="register">Register</a>
    </div>
  `;
  document.body.prepend(nav);

  const list = nav.querySelector('[data-links]');

  // Build links
  const linkMap = new Map(); // id or href => <a>
  navItems.forEach((item) => {
    const li = document.createElement('li');
    const a  = document.createElement('a');

    if (item.type === 'section') {
      a.href = `#${item.id}`;
      a.setAttribute('data-scroll', '');
      linkMap.set(item.id, a);
    } else {
      a.href = item.href;
      linkMap.set(item.href, a);

      // compute active like nav.js
      const active = item.isActive
        ? item.isActive(state)
        : state.path === new URL(item.href, location.origin).pathname;
      if (active) a.setAttribute('aria-current', 'page');
    }

    a.textContent = item.label;
    li.appendChild(a);
    list.appendChild(li);
  });

  // Smooth scroll for section anchors only
  nav.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-scroll]');
    if (!a) return;
    const hash = a.getAttribute('href');
    const el = document.querySelector(hash);
    if (!el) return;

    e.preventDefault();
    const navH = nav.offsetHeight || 64;
    const y = window.scrollY + el.getBoundingClientRect().top - (navH + 8);
    window.scrollTo({ top: y, behavior: 'smooth' });
    history.replaceState(null, '', hash);
  });

  // Make sure sections don’t hide under sticky bar
  const navH = nav.offsetHeight || 64;
  navItems.forEach((it) => {
    if (it.type === 'section') {
      const el = document.getElementById(it.id);
      if (el) el.style.scrollMarginTop = `${navH + 12}px`;
    }
  });

  // Active-on-scroll for sections
  const sectionIds = navItems.filter(i => i.type === 'section').map(i => i.id);
  const sectionVisibility = new Map(); // id -> ratio

  function setActiveSection(id) {
    // Clear aria-current only from SECTION links; leave page links (e.g., Mouse DB) alone
    sectionIds.forEach(secId => {
      const a = linkMap.get(secId);
      if (a) a.removeAttribute('aria-current');
    });
    const a = linkMap.get(id);
    if (a) a.setAttribute('aria-current', 'page');
  }

  const thresholds = [];
  for (let i = 0; i <= 20; i++) thresholds.push(i / 20);

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const id = entry.target.id;
      sectionVisibility.set(id, entry.isIntersecting ? entry.intersectionRatio : 0);
    });
    let best = { id: null, r: 0 };
    sectionVisibility.forEach((r, id) => { if (r > best.r) best = { id, r }; });
    if (best.id) setActiveSection(best.id);
  }, {
    root: null,
    rootMargin: `-${navH + 8}px 0px 0px 0px`,
    threshold: thresholds,
  });

  sectionIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) io.observe(el);
  });

  // Initial highlight (hash or top)
  const initial = (location.hash || '#home').slice(1);
  if (sectionIds.includes(initial)) setActiveSection(initial);

  // Demo click for register
  nav.querySelector('[data-action="register"]')?.addEventListener('click', (e) => {
    e.preventDefault();
    alert('Register flow coming soon');
  });
}

document.addEventListener('DOMContentLoaded', buildNav2);
