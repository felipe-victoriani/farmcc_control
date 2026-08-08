/**
 * @file permissions.js
 * @description Módulo de Gerenciamento de Permissões por Perfil.
 * Permite ao Admin liberar ou restringir acesso a módulos por role,
 * sem precisar editar o código-fonte.
 *
 * As permissões são salvas em /settings/moduleAccess no Firebase.
 * O roteador (app.js) lê essas configurações antes de carregar cada módulo.
 */

import { dbRead, dbSet, auditLog } from "../core/db.js";
import { getSessionProfile } from "../core/auth.js";
import { showToast, confirmDialog } from "../shared/notifications.js";
import { icon } from "../shared/icons.js";
import { escapeHtml, friendlyError } from "../shared/utils.js";

// ============================================================
// DEFINIÇÕES
// ============================================================

const ROLES = [
  { key: "FARMACEUTICO_RT", label: "Farmacêutico RT", cor: "badge-primary" },
  { key: "FARMACEUTICO", label: "Farmacêutico", cor: "badge-info" },
  {
    key: "TECNICO_FARMACIA",
    label: "Técnico em Farmácia",
    cor: "badge-neutral",
  },
  {
    key: "MEDICO_ANESTESISTA",
    label: "Médico / Anestesista",
    cor: "badge-warning",
  },
  { key: "ENFERMEIRO_RT", label: "Enfermeiro RT", cor: "badge-success" },
  { key: "GESTOR", label: "Gestor", cor: "badge-purple" },
];

const MODULES = [
  { key: "estoque", label: "Estoque de Medicamentos", icon: "pill" },
  { key: "movimentacoes", label: "Movimentações", icon: "movements" },
  { key: "controlados", label: "Controlados (Port. 344/98)", icon: "lock" },
  { key: "pacientes", label: "Pacientes & Cirurgias", icon: "patients" },
  { key: "validades", label: "Validades", icon: "expiry" },
  { key: "residuos", label: "Resíduos (RDC 222/2018)", icon: "waste" },
  {
    key: "instrumentais",
    label: "Instrumentais (RDC 15/2012)",
    icon: "clipboard",
  },
  { key: "relatorios", label: "Relatórios", icon: "reports" },
  { key: "conformidade", label: "Conformidade", icon: "compliance" },
  { key: "auditoria", label: "Auditoria", icon: "audit" },
  { key: "configuracoes", label: "Configurações", icon: "settings" },
];

// Padrões (o que cada role pode ver por padrão — alinhado com auth.js)
const DEFAULTS = {
  FARMACEUTICO_RT: [
    "estoque",
    "movimentacoes",
    "controlados",
    "pacientes",
    "validades",
    "residuos",
    "instrumentais",
    "relatorios",
    "conformidade",
    "auditoria",
    "configuracoes",
  ],
  FARMACEUTICO: [
    "estoque",
    "movimentacoes",
    "controlados",
    "pacientes",
    "validades",
    "residuos",
    "instrumentais",
    "relatorios",
    "conformidade",
    "configuracoes",
  ],
  TECNICO_FARMACIA: [
    "estoque",
    "movimentacoes",
    "pacientes",
    "validades",
    "residuos",
    "instrumentais",
    "conformidade",
    "configuracoes",
  ],
  MEDICO_ANESTESISTA: [
    "estoque",
    "movimentacoes",
    "pacientes",
    "conformidade",
    "configuracoes",
  ],
  ENFERMEIRO_RT: [
    "estoque",
    "movimentacoes",
    "pacientes",
    "validades",
    "residuos",
    "instrumentais",
    "conformidade",
    "configuracoes",
  ],
  GESTOR: [
    "estoque",
    "movimentacoes",
    "pacientes",
    "validades",
    "residuos",
    "relatorios",
    "conformidade",
  ],
};

// ============================================================
// RENDER PRINCIPAL
// ============================================================

export async function renderPermissionsModule() {
  const main = document.getElementById("app-main");
  if (!main) return;

  // Carregar configurações salvas
  let saved = {};
  try {
    const snap = await dbRead("settings", "moduleAccess");
    saved = snap || {};
  } catch {
    /* usa defaults */
  }

  // Mesclar com defaults
  const access = {};
  ROLES.forEach(({ key }) => {
    access[key] = saved[key] ? saved[key] : [...(DEFAULTS[key] || [])];
  });

  main.innerHTML = buildPermissionsHTML(access);
  setupPermissionsListeners(access);
}

function buildPermissionsHTML(access) {
  return `
  <section class="module-section" id="section-permissions">
    <div class="section-header">
      <div>
        <h1 class="section-title">Permissões por Perfil</h1>
        <p class="section-subtitle">Defina quais módulos cada perfil pode acessar. Admin e Farmacêutico RT sempre têm acesso total.</p>
      </div>
      <div class="section-actions">
        <button class="btn btn-secondary btn-sm" id="btn-reset-permissions">
          ${icon("refresh", "icon icon-sm")} Restaurar padrões
        </button>
        <button class="btn btn-primary btn-sm" id="btn-save-permissions">
          ${icon("check", "icon icon-sm")} Salvar Permissões
        </button>
      </div>
    </div>

    <div class="alert alert-info mb-3">
      ${icon("shield", "icon icon-sm")}
      <div>
        <strong>Admin e Farmacêutico RT</strong> sempre têm acesso a todos os módulos e não aparecem aqui.
        As alterações abaixo afetam imediatamente todos os usuários dos perfis selecionados após salvar.
      </div>
    </div>

    <div class="card">
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="data-table" id="permissions-table">
            <thead>
              <tr>
                <th style="min-width:200px">Módulo</th>
                ${ROLES.map(
                  (r) => `<th class="text-center" style="min-width:110px">
                  <span class="badge ${r.cor}" style="white-space:normal;text-align:center">${escapeHtml(r.label)}</span>
                </th>`,
                ).join("")}
              </tr>
            </thead>
            <tbody>
              ${MODULES.map(
                (mod) => `
              <tr>
                <td>
                  <div style="display:flex;align-items:center;gap:8px">
                    ${icon(mod.icon, "icon icon-sm text-muted")}
                    <span class="fw-600">${escapeHtml(mod.label)}</span>
                  </div>
                </td>
                ${ROLES.map((role) => {
                  const checked = access[role.key]?.includes(mod.key);
                  return `<td class="text-center">
                    <input type="checkbox"
                      class="form-checkbox perm-toggle"
                      data-role="${role.key}"
                      data-module="${mod.key}"
                      ${checked ? "checked" : ""}
                      style="width:18px;height:18px;cursor:pointer;accent-color:var(--color-primary)">
                  </td>`;
                }).join("")}
              </tr>`,
              ).join("")}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <p class="text-sm text-muted mt-3">
      ${icon("alertTriangle", "icon icon-xs")} As restrições definidas aqui controlam a visibilidade dos módulos no menu.
      As regras do Firebase Realtime Database garantem a segurança dos dados no servidor independentemente desta configuração.
    </p>
  </section>
  `;
}

// ============================================================
// LISTENERS
// ============================================================

function setupPermissionsListeners(access) {
  // Atualizar objeto access em memória ao marcar/desmarcar
  document.querySelectorAll(".perm-toggle").forEach((cb) => {
    cb.addEventListener("change", () => {
      const { role, module: mod } = cb.dataset;
      if (!access[role]) access[role] = [];
      if (cb.checked) {
        if (!access[role].includes(mod)) access[role].push(mod);
      } else {
        access[role] = access[role].filter((m) => m !== mod);
      }
    });
  });

  // Salvar
  document
    .getElementById("btn-save-permissions")
    ?.addEventListener("click", async () => {
      const profile = getSessionProfile();
      try {
        await dbSet("settings/moduleAccess", access);
        await auditLog({
          uid: profile?.uid || "",
          userName: profile?.nome || "",
          action: "UPDATE_PERMISSIONS",
          module: "permissions",
          details: "Permissões por perfil atualizadas pelo administrador.",
        });
        // Propagar para o módulo de roteamento em memória
        window.__moduleAccess = access;
        showToast(
          "success",
          "Permissões salvas!",
          "Aplicadas imediatamente a todos os usuários.",
        );
      } catch (err) {
        showToast("error", "Erro ao salvar", friendlyError(err));
      }
    });

  // Restaurar padrões
  document
    .getElementById("btn-reset-permissions")
    ?.addEventListener("click", async () => {
      const confirmado = await confirmDialog({
        title: "Restaurar permissões padrão",
        message:
          "Todas as permissões por perfil serão substituídas pelos valores padrão do sistema. Clique em Salvar depois para confirmar a mudança.",
        confirmLabel: "Restaurar padrões",
      });
      if (!confirmado) return;
      ROLES.forEach(({ key }) => {
        access[key] = [...(DEFAULTS[key] || [])];
      });
      await renderPermissionsModule(); // Re-renderiza com defaults
      showToast(
        "info",
        "Padrões restaurados.",
        "Clique em Salvar para confirmar.",
      );
    });
}

// ============================================================
// EXPORT: verificar acesso de um módulo para o role atual
// Usado pelo roteador e pelo renderSidebar
// ============================================================

export async function canAccessModule(moduleKey, role) {
  // ADMIN e FARMACEUTICO_RT sempre têm acesso
  if (["ADMIN", "FARMACEUTICO_RT"].includes(role)) return true;

  // Checar config salva no banco (cache em memória para evitar leituras repetidas)
  if (!window.__moduleAccess) {
    try {
      const saved = await dbRead("settings", "moduleAccess");
      window.__moduleAccess = saved || {};
    } catch {
      window.__moduleAccess = {};
    }
  }

  const roleAccess = window.__moduleAccess[role] || DEFAULTS[role] || [];
  return roleAccess.includes(moduleKey);
}
