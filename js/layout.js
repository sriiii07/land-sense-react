/**
 * layout.js
 * Renders the shared authority-dashboard shell (top navigation + sidebar)
 * and injects page-specific content into it. Kept in one place so every
 * inner page stays in sync instead of duplicating the sidebar markup.
 */

const NAV_ITEMS = [
  { id: "dashboard",   label: "Dashboard",          href: "dashboard.html",   icon: "layout-dashboard" },
  { id: "predictions", label: "Predictions",        href: "predictions.html",icon: "line-chart" },
  { id: "citizens",    label: "Citizen Monitoring",  href: "citizens.html",   icon: "users" },
  { id: "shelters",    label: "Shelter Management",  href: "shelters.html",   icon: "home" },
  { id: "analytics",   label: "Analytics",           href: "analytics.html",  icon: "bar-chart-2" },
  { id: "settings",    label: "Settings",            href: "settings.html",   icon: "settings" },
];

function renderLayout(activeId, pageTitle, contentHtml, afterRender) {
  const root = document.getElementById("app");

  const navHtml = NAV_ITEMS.map(item => `
    <a class="sidebar-link ${item.id === activeId ? "sidebar-link--active" : ""}" href="${item.href}">
      <i data-lucide="${item.icon}" aria-hidden="true"></i>
      <span>${item.label}</span>
    </a>
  `).join("");

  root.innerHTML = `
    <div class="shell">
      <aside class="sidebar">
        <div class="sidebar-brand">
          <i data-lucide="mountain-snow" aria-hidden="true"></i>
          <div>
            <div class="sidebar-brand-title">SAFEGROUND AI</div>
            <div class="sidebar-brand-sub">AI- BasedLandslide Prediction</div>
          </div>
        </div>
        <nav class="sidebar-nav">${navHtml}</nav>
        <a class="sidebar-link sidebar-logout" href="index.html">
          <i data-lucide="log-out" aria-hidden="true"></i>
          <span>Sign out</span>
        </a>
      </aside>

      <div class="main">
        <header class="topbar">
          <div>
            <h1 class="topbar-title">${pageTitle}</h1>
            <p class="topbar-sub">Last updated ${APP_DATA.lastUpdated}</p>
          </div>
          <div class="topbar-right">
            <span class="badge badge--critical" id="topbar-alert-badge">
              <i data-lucide="alert-triangle" aria-hidden="true"></i> 1 Critical Alert
            </span>
            <div class="officer-chip">
              <i data-lucide="user-circle" aria-hidden="true"></i>
              <span>${APP_DATA.officer.name}</span>
            </div>
          </div>
        </header>

        <main class="content">
          ${contentHtml}
        </main>
      </div>
    </div>
  `;

  if (window.lucide) lucide.createIcons();
  if (typeof afterRender === "function") afterRender();
}

function riskBadge(level) {
  return `<span class="badge badge--${level}">${riskLabel(level)}</span>`;
}

function statusBadge(status) {
  const map = {
    safe: { cls: "success", label: "Safe" },
    help: { cls: "critical", label: "Needs Help" },
    none: { cls: "neutral", label: "No Response" },
  };
  const s = map[status] || map.none;
  return `<span class="badge badge--${s.cls}">${s.label}</span>`;
}
