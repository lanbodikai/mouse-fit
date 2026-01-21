const links = [
  { href: '/htmls/ai.html', label: 'AI' },
  { href: '/htmls/measure.html', label: 'Measure' },
  { href: '/htmls/grip.html', label: 'Grip' },
  {
    href: '/htmls/mouse-db.html',
    label: 'Mouse DB',
    isActive: ({ path }) =>
      path.endsWith('/htmls/mouse-db.html'),
  },
  { href: '/htmls/report.html', label: 'Report' },
];

const buildNav = () => {
  const nav = document.createElement('nav');
  nav.className = 'nav';

  // NOTE: include the inner container so CSS can target .nav-inner
  nav.innerHTML = `
    <div class="nav-inner">
      <a class="brand" href="/index.html">
        <span class="logo-pill" aria-hidden="true">MF</span>
        <span class="brand-text">Mouse-Fit</span>
      </a>

      <ul class="nav-links" role="list"></ul>

      <div class="nav-spacer" aria-hidden="true"></div>

      <label class="search" role="search" aria-label="Site search">
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M21 21l-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z"
                fill="none" stroke="currentColor" stroke-width="2"/>
        </svg>
        <input type="search" placeholder="Search" aria-label="Search" />
      </label>
    </div>
  `;

  const list = nav.querySelector('.nav-links');
  const state = { path: window.location.pathname, hash: window.location.hash };

  links.forEach((link) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = link.href;
    a.textContent = link.label;

    if (link.attrs) {
      for (const [k, v] of Object.entries(link.attrs)) a.setAttribute(k, v);
    }

    const computedActive = link.isActive
      ? link.isActive(state)
      : (() => {
          const target = new URL(link.href, window.location.origin).pathname;
          return state.path === target || state.path.endsWith(target);
        })();

    if (computedActive) a.setAttribute('aria-current', 'page');

    li.appendChild(a);
    list.appendChild(li);
  });

  // Prefer placing after .page-frame; otherwise prepend to body.
  const frame = document.querySelector('.page-frame');
  if (frame?.parentElement) frame.insertAdjacentElement('afterend', nav);
  else document.body.prepend(nav);

  // Temporary register action
  nav.querySelector('[data-action="register"]')?.addEventListener('click', (e) => {
    e.preventDefault();
    alert('Register flow coming soon');
  });
};

document.addEventListener('DOMContentLoaded', buildNav);
