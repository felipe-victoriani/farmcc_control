/**
 * @file app.js
 * @description Shell principal do FarmaCC Pro.
 * Roteamento hash-based, sidebar, header e footer da aplicação.
 */

import {
  requireAuth,
  logoutUser,
  getSessionProfile,
  currentUserCan,
} from "./auth.js";
import { dbUnlistenAll, dbRead } from "./db.js";
import {
  checkAllAlerts,
  showAlertsModal,
  updateAlertBadges,
  showToast,
} from "../shared/notifications.js";
import { icon } from "../shared/icons.js";
import { formatDate, escapeHtml } from "../shared/utils.js";

// ============================================================
// BOOT
// ============================================================

(async function boot() {
  // Verificar autenticaÃ§Ã£o (redireciona para index.html se nÃ£o logado)
  await requireAuth();

  initOfflineDetection();
  renderSidebar();
  renderHeader();
  renderFooter();
  initInactivityTimer();

  const profile = getSessionProfile();

  // Alertas de validade/estoque na entrada
  try {
    const alerts = await checkAllAlerts();
    updateAlertBadges(alerts.total);
    if (alerts.total > 0) showAlertsModal([...alerts.expiry, ...alerts.stock]);
  } catch {
    /* silencioso */
  }

  // Roteamento inicial
  routeTo(location.hash.slice(1) || "dashboard");
  window.addEventListener("hashchange", () =>
    routeTo(location.hash.slice(1) || "dashboard"),
  );

  document
    .getElementById("nav-logout")
    ?.addEventListener("click", async (e) => {
      e.preventDefault();
      await logoutUser();
    });

  // Atualizar rodapé quando configurações mudarem
  document.addEventListener("farmac:refreshFooter", () => renderFooter());

  // Sinalizar que o app está pronto (remove tela de loading em app.html)
  document.dispatchEvent(new CustomEvent("app:ready"));
})();

// ============================================================
// ROTEADOR
// ============================================================

async function routeTo(route) {
  dbUnlistenAll();
  setActiveNav(route);
  updateBreadcrumb(route);

  const main = document.getElementById("app-main");
  main.innerHTML = `<div class="loading-spinner">${icon("loading", "icon icon-xl")}</div>`;

  // Verificar permissão de módulo via configuração do Admin
  const profile = getSessionProfile();
  if (profile && !["ADMIN", "FARMACEUTICO_RT"].includes(profile.role)) {
    const { canAccessModule } = await import("../modules/permissions.js");
    const allowed = await canAccessModule(route, profile.role);
    if (!allowed && !["dashboard", "saida", "entrada"].includes(route)) {
      renderUnauthorized();
      return;
    }
  }

  try {
    switch (route) {
      case "dashboard": {
        const { renderDashboard } = await import("../modules/dashboard.js");
        await renderDashboard();
        break;
      }
      case "estoque":
      case "controlados": {
        const { renderMedicationsModule } =
          await import("../modules/medications.js");
        await renderMedicationsModule(
          route === "controlados" ? "controlado" : "",
        );
        break;
      }
      case "movimentacoes":
      case "saida":
      case "entrada": {
        const { renderMovementsModule } =
          await import("../modules/movements.js");
        await renderMovementsModule(route !== "movimentacoes" ? route : "");
        break;
      }
      case "rastreabilidade":
      case "pacientes": {
        const { renderPatientsModule } = await import("../modules/patients.js");
        await renderPatientsModule();
        break;
      }
      case "validades": {
        const { renderMedicationsModule } =
          await import("../modules/medications.js");
        await renderMedicationsModule("validade");
        break;
      }
      case "residuos": {
        const { renderResiduesModule } = await import("../modules/residues.js");
        await renderResiduesModule();
        break;
      }
      case "relatorios": {
        if (!currentUserCan("view_reports")) {
          renderUnauthorized();
          return;
        }
        const { renderReportsModule } = await import("../modules/reports.js");
        await renderReportsModule();
        break;
      }
      case "instrumentais": {
        const { renderInstrumentsModule } =
          await import("../modules/instruments.js");
        await renderInstrumentsModule();
        break;
      }
      case "conformidade":
      case "compliance": {
        const { renderComplianceModule } =
          await import("../modules/compliance.js");
        await renderComplianceModule();
        break;
      }
      case "auditoria": {
        if (!currentUserCan("view_audit")) {
          renderUnauthorized();
          return;
        }
        const { renderAuditModule } = await import("../modules/audit.js");
        await renderAuditModule();
        break;
      }
      case "configuracoes": {
        if (!currentUserCan("edit_settings")) {
          renderUnauthorized();
          return;
        }
        const { renderSettingsModule } = await import("../modules/settings.js");
        await renderSettingsModule();
        break;
      }
      case "usuarios": {
        if (!currentUserCan("manage_users")) {
          renderUnauthorized();
          return;
        }
        const { renderUsersModule } = await import("../modules/users.js");
        await renderUsersModule();
        break;
      }
      case "permissoes": {
        if (!currentUserCan("manage_users")) {
          renderUnauthorized();
          return;
        }
        const { renderPermissionsModule } =
          await import("../modules/permissions.js");
        await renderPermissionsModule();
        break;
      }
      default: {
        const { renderDashboard } = await import("../modules/dashboard.js");
        await renderDashboard();
      }
    }
  } catch (err) {
    main.innerHTML = `<div class="alert alert-danger">Erro ao carregar módulo: ${escapeHtml(err.message)}</div>`;
    console.error("[router]", err);
  }
}

function renderUnauthorized() {
  document.getElementById("app-main").innerHTML = `
    <div class="empty-state mt-8">
      ${icon("lock", "icon icon-xl text-warning")}
      <p class="empty-state-title">Acesso Restrito</p>
      <p class="empty-state-desc">Você não tem permissão para acessar este módulo.</p>
    </div>
  `;
}

// ============================================================
// SIDEBAR
// ============================================================

const NAV_ITEMS = [
  {
    id: "dashboard",
    label: "Dashboard",
    iconName: "dashboard",
    hash: "dashboard",
  },
  { id: "estoque", label: "Estoque", iconName: "pill", hash: "estoque" },
  {
    id: "movimentacoes",
    label: "Movimentações",
    iconName: "movements",
    hash: "movimentacoes",
  },
  {
    id: "controlados",
    label: "Controlados",
    iconName: "lock",
    hash: "controlados",
  },
  {
    id: "pacientes",
    label: "Pacientes",
    iconName: "patients",
    hash: "pacientes",
  },
  {
    id: "validades",
    label: "Validades",
    iconName: "expiry",
    hash: "validades",
    badge: "nav-badge-validades",
  },
  { id: "residuos", label: "Resíduos", iconName: "waste", hash: "residuos" },
  {
    id: "instrumentais",
    label: "Instrumentais",
    iconName: "clipboard",
    hash: "instrumentais",
  },
  {
    id: "relatorios",
    label: "Relatórios",
    iconName: "reports",
    hash: "relatorios",
    permission: "view_reports",
  },
  {
    id: "conformidade",
    label: "Conformidade",
    iconName: "compliance",
    hash: "conformidade",
  },
  {
    id: "auditoria",
    label: "Auditoria",
    iconName: "audit",
    hash: "auditoria",
    permission: "view_audit",
  },
  {
    id: "configuracoes",
    label: "Configurações",
    iconName: "settings",
    hash: "configuracoes",
    permission: "edit_settings",
  },
  {
    id: "usuarios",
    label: "Usuários",
    iconName: "users",
    hash: "usuarios",
    permission: "manage_users",
  },
  {
    id: "permissoes",
    label: "Permissões",
    iconName: "lock",
    hash: "permissoes",
    permission: "manage_users",
  },
];

function renderSidebar() {
  const sidebar = document.getElementById("app-sidebar");
  if (!sidebar) return;

  const profile = getSessionProfile();

  // Sidebar sempre inicia colapsada (expande ao passar o mouse)
  document.querySelector(".app-layout")?.classList.add("sidebar-collapsed");

  const items = NAV_ITEMS.filter(
    (item) => !item.permission || currentUserCan(item.permission),
  );

  const navHTML = items
    .map(
      (item) => `
    <li>
      <a href="#${item.hash}" class="nav-item" id="nav-${item.id}" role="menuitem" data-tooltip="${escapeHtml(item.label)}">
        <span class="nav-item-icon">${icon(item.iconName, "icon icon-sm")}</span>
        <span class="nav-label">${escapeHtml(item.label)}</span>
        ${item.badge ? `<span class="nav-badge hidden" id="${item.badge}"></span>` : ""}
      </a>
    </li>
  `,
    )
    .join("");

  sidebar.innerHTML = `
    <div class="sidebar-logo">
      <div class="sidebar-logo-icon">
        ${icon("hospital", "icon icon-sm")}
      </div>
      <div class="sidebar-logo-text">
        <span class="sidebar-logo-name">FarmaCC Pro</span>
      </div>
    </div>

    <div class="sidebar-user">
      <div class="user-avatar">${escapeHtml((profile?.nome || "U").charAt(0).toUpperCase())}</div>
      <div class="user-info">
        <p class="user-name truncate">${escapeHtml(profile?.nome || "—")}</p>
        <p class="user-role">${escapeHtml(labelRole(profile?.role))}</p>
      </div>
    </div>

    <nav class="sidebar-nav" aria-label="Navegação principal">
      <ul role="menu">
        ${navHTML}
        <li class="nav-divider"></li>
        <li>
          <button class="nav-item nav-item-danger" id="nav-logout" role="menuitem">
            <span class="nav-item-icon">${icon("logout", "icon icon-sm")}</span>
            <span class="nav-label">Sair</span>
          </button>
        </li>
      </ul>
    </nav>
  `;
}

function setActiveNav(route) {
  document
    .querySelectorAll(".nav-item")
    .forEach((el) => el.classList.remove("active"));
  const active = document.getElementById(`nav-${route}`);
  if (active) active.classList.add("active");
}

// ============================================================
// HEADER
// ============================================================

function renderHeader() {
  const header = document.getElementById("app-header");
  if (!header) return;

  header.innerHTML = `
    <div class="header-left" style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;">
      <button id="btn-mobile-menu" aria-label="Abrir menu">
        ${icon("menu", "icon icon-sm")}
      </button>
      <nav class="header-breadcrumb" id="app-breadcrumb" aria-label="Caminho de navegação">
        <span class="breadcrumb-item current">Dashboard</span>
      </nav>
    </div>
    <div class="header-right">
      <div id="offline-indicator" class="hidden">
        ${icon("wifiOff", "icon icon-sm text-danger")} Offline
      </div>
      <button class="header-alerts-btn" id="btn-alerts" aria-label="Alertas">
        ${icon("bell", "icon icon-sm")}
        <span id="alert-count-badge" class="alerts-badge hidden">0</span>
      </button>
      <div class="header-date">${formatDate(Date.now())}</div>
    </div>
  `;

  // Mobile drawer — hambúrguer
  document.getElementById("btn-mobile-menu")?.addEventListener("click", () => {
    const sidebar = document.querySelector(".sidebar");
    const overlay = document.getElementById("sidebar-overlay");
    sidebar?.classList.toggle("mobile-open");
    overlay?.classList.toggle("visible");
  });

  document.getElementById("sidebar-overlay")?.addEventListener("click", () => {
    document.querySelector(".sidebar")?.classList.remove("mobile-open");
    document.getElementById("sidebar-overlay")?.classList.remove("visible");
  });

  // Fechar sidebar ao navegar no mobile
  document.querySelector(".sidebar-nav")?.addEventListener("click", (e) => {
    if (e.target.closest("a, button") && window.innerWidth <= 768) {
      document.querySelector(".sidebar")?.classList.remove("mobile-open");
      document.getElementById("sidebar-overlay")?.classList.remove("visible");
    }
  });

  document.getElementById("btn-alerts")?.addEventListener("click", async () => {
    const alerts = await checkAllAlerts();
    showAlertsModal([...alerts.expiry, ...alerts.stock]);
  });
}

const ROUTE_LABELS = {
  dashboard: "Dashboard",
  estoque: "Estoque",
  movimentacoes: "Movimentações",
  controlados: "Controlados",
  pacientes: "Pacientes",
  validades: "Validades",
  residuos: "Resíduos",
  relatorios: "Relatórios",
  conformidade: "Conformidade",
  auditoria: "Auditoria",
  instrumentais: "Instrumentais Cirúrgicos",
  permissoes: "Permissões por Perfil",
  configuracoes: "Configurações",
  usuarios: "Usuários",
};

function updateBreadcrumb(route) {
  const bc = document.getElementById("app-breadcrumb");
  if (!bc) return;
  const label = ROUTE_LABELS[route] || route;
  bc.innerHTML =
    route === "dashboard"
      ? `<span class="breadcrumb-item current">Dashboard</span>`
      : `<a href="#dashboard" class="breadcrumb-item">Dashboard</a><span class="breadcrumb-sep">/</span><span class="breadcrumb-item current">${escapeHtml(label)}</span>`;
}

// ============================================================
// FOOTER
// ============================================================

async function renderFooter() {
  const footer = document.getElementById("app-footer");
  if (!footer) return;
  try {
    const s = (await dbRead("settings", "main").catch(() => ({}))) || {};
    footer.innerHTML = `
      <span>${escapeHtml(s.institutionName || "FarmaCC Pro")}</span>
      ${s.responsavelTecnico ? `<span>RT: ${escapeHtml(s.responsavelTecnico)} — CRF: ${escapeHtml(s.crfNumero || "—")}</span>` : ""}
      <span>v1.0 · Port. 344/98 · RDC 222/2018</span>
    `;
  } catch {
    /* silencioso */
  }
}

// ============================================================
// OFFLINE DETECTION
// ============================================================

function initOfflineDetection() {
  const indicator = document.getElementById("offline-indicator");
  const banner = document.getElementById("offline-banner");

  function update() {
    const offline = !navigator.onLine;
    indicator?.classList.toggle("hidden", !offline);
    banner?.classList.toggle("hidden", !offline);
  }

  window.addEventListener("online", update);
  window.addEventListener("offline", update);
  update();
}

// ============================================================
// INATIVIDADE (15 min)
// ============================================================

let inactivityTimer;
const INACTIVITY_MS = 15 * 60 * 1000;

function initInactivityTimer() {
  const reset = () => {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(async () => {
      showToast("warning", "Sessão encerrada por inatividade.");
      await logoutUser();
    }, INACTIVITY_MS);
  };

  ["mousemove", "keydown", "click", "scroll", "touchstart"].forEach((ev) =>
    document.addEventListener(ev, reset, { passive: true }),
  );
  reset();
}

// ============================================================
// HELPERS
// ============================================================

function labelRole(role) {
  return (
    {
      ADMIN: "Administrador",
      FARMACEUTICO_RT: "Farmacêutico RT",
      FARMACEUTICO: "Farmacêutico",
      TECNICO_FARMACIA: "Técnico em Farmácia",
      MEDICO_ANESTESISTA: "Médico / Anestesista",
      ENFERMEIRO_RT: "Enfermeiro RT",
      GESTOR: "Gestor",
    }[role] ||
    role ||
    "—"
  );
}
