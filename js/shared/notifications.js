/**
 * @file notifications.js
 * @description Sistema de toasts, alertas de validade/estoque e badge de notificações.
 */

import { dbReadAll } from "../core/db.js";
import { snapshotToArray, diasRestantes } from "./utils.js";

// ============================================================
// TOAST
// ============================================================

/** Fila de toasts ativos */
let toastCount = 0;

/**
 * Exibe um toast de notificação.
 * @param {'success'|'error'|'warning'|'info'} type
 * @param {string} title
 * @param {string} [message='']
 * @param {number} [duration=5000]
 * @returns {string} ID do toast criado
 */
export function showToast(type, title, message = "", duration = 5000) {
  const container = getToastContainer();
  const id = `toast-${++toastCount}`;

  const iconMap = {
    success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-sm"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    error: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-sm"><circle cx="12" cy="12" r="9"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-sm"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-sm"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="8.5"/><line x1="12" y1="11" x2="12" y2="16"/></svg>`,
  };

  const toast = document.createElement("div");
  toast.id = id;
  toast.className = `toast toast-${type}`;
  toast.setAttribute("role", "alert");
  toast.setAttribute("aria-live", "polite");
  toast.innerHTML = `
    <div class="toast-icon">${iconMap[type] || iconMap.info}</div>
    <div class="toast-body">
      <p class="toast-title">${escapeHtml(title)}</p>
      ${message ? `<p class="toast-message">${escapeHtml(message)}</p>` : ""}
    </div>
    <button class="toast-close btn btn-icon" aria-label="Fechar notificação">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="icon icon-sm">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>
  `;

  container.appendChild(toast);

  // Animar entrada
  requestAnimationFrame(() => toast.classList.add("toast-visible"));

  // Fechar ao clicar no X
  toast
    .querySelector(".toast-close")
    .addEventListener("click", () => removeToast(toast));

  // Auto-remover
  if (duration > 0) {
    setTimeout(() => removeToast(toast), duration);
  }

  return id;
}

function removeToast(toastEl) {
  if (!toastEl || !toastEl.parentNode) return;
  toastEl.classList.remove("toast-visible");
  toastEl.classList.add("toast-leaving");
  toastEl.addEventListener("animationend", () => toastEl.remove(), {
    once: true,
  });
  setTimeout(() => toastEl.remove(), 400);
}

function getToastContainer() {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.setAttribute("aria-live", "polite");
    container.setAttribute("aria-atomic", "false");
    document.body.appendChild(container);
  }
  return container;
}

// ============================================================
// ALERTAS DE VALIDADE E ESTOQUE
// ============================================================

/**
 * @typedef {Object} Alert
 * @property {'expiry'|'stock'} type
 * @property {'urgent'|'warning'|'critical'} severity
 * @property {string} medId
 * @property {string} nome
 * @property {string} [lote]
 * @property {number} [diasRestantes]
 * @property {number} [qtdAtual]
 * @property {number} [qtdMinima]
 */

/**
 * Verifica medicamentos próximos ao vencimento.
 * @returns {Promise<Alert[]>}
 */
export async function checkExpiryAlerts() {
  const data = await dbReadAll("medications");
  if (!data) return [];

  const meds = snapshotToArray(data);
  const alerts = [];

  for (const med of meds) {
    if (!med.validade || med.status === "inativo") continue;
    const dias = diasRestantes(med.validade);
    if (dias <= 90) {
      alerts.push({
        type: "expiry",
        severity: dias < 0 ? "critical" : dias <= 30 ? "urgent" : "warning",
        medId: med.id,
        nome: med.nome,
        lote: med.lote || "—",
        diasRestantes: dias,
      });
    }
  }

  return alerts.sort((a, b) => a.diasRestantes - b.diasRestantes);
}

/**
 * Verifica medicamentos com estoque abaixo do mínimo.
 * @returns {Promise<Alert[]>}
 */
export async function checkStockAlerts() {
  const data = await dbReadAll("medications");
  if (!data) return [];

  const meds = snapshotToArray(data);
  const alerts = [];

  for (const med of meds) {
    if (med.status === "inativo") continue;
    const qtdAtual = med.qtdAtual ?? 0;
    const qtdMinima = med.qtdMinima ?? 0;
    if (qtdAtual <= qtdMinima) {
      alerts.push({
        type: "stock",
        severity: qtdAtual <= 0 ? "critical" : "warning",
        medId: med.id,
        nome: med.nome,
        qtdAtual,
        qtdMinima,
      });
    }
  }

  return alerts.sort((a, b) => a.qtdAtual - b.qtdAtual);
}

/**
 * Verifica todos os alertas (validade + estoque).
 * @returns {Promise<{expiry: Alert[], stock: Alert[], total: number}>}
 */
export async function checkAllAlerts() {
  const [expiry, stock] = await Promise.all([
    checkExpiryAlerts(),
    checkStockAlerts(),
  ]);
  return { expiry, stock, total: expiry.length + stock.length };
}

// ============================================================
// ATUALIZAÇÃO DE BADGES
// ============================================================

/**
 * Atualiza o badge do sino no header e os badges de nav relevantes.
 * @param {number} count - Total de alertas
 */
export function updateAlertBadges(count) {
  // Badge do sino no header
  const bellBadge = document.getElementById("alert-count-badge");
  if (bellBadge) {
    bellBadge.textContent = count > 99 ? "99+" : String(count);
    bellBadge.classList.toggle("hidden", count === 0);
  }

  // Badge no nav de validades
  const validadesBadge = document.getElementById("nav-badge-validades");
  if (validadesBadge) {
    validadesBadge.textContent = count > 99 ? "99+" : String(count);
    validadesBadge.classList.toggle("hidden", count === 0);
  }
}

// ============================================================
// CONFIRMAÇÃO / PROMPT (substitutos de confirm()/prompt() nativos)
// ============================================================

/**
 * Exibe um modal de confirmação estilizado (substitui window.confirm).
 * @param {Object} opts
 * @param {string} [opts.title='Confirmar ação']
 * @param {string} [opts.message='']
 * @param {Array<{label:string,value:*}>|string} [opts.details] - Linhas de detalhe do registro afetado
 * @param {string} [opts.confirmLabel='Confirmar']
 * @param {string|null} [opts.cancelLabel='Cancelar'] - Passe null para ocultar (modo apenas "OK")
 * @param {boolean} [opts.danger=false]
 * @returns {Promise<boolean>}
 */
export function confirmDialog({
  title = "Confirmar ação",
  message = "",
  details = null,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  danger = false,
} = {}) {
  return new Promise((resolve) => {
    document.getElementById("app-confirm-dialog")?.remove();

    const detailsHTML = renderDialogDetails(details);
    const modal = document.createElement("dialog");
    modal.id = "app-confirm-dialog";
    modal.className = "modal";
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "app-confirm-title");
    modal.innerHTML = `
      <div class="modal-content modal-sm">
        <div class="modal-header" style="background:${danger ? "var(--color-danger-dim)" : "var(--color-warning-dim)"}">
          <h2 class="modal-title" id="app-confirm-title" style="color:${danger ? "var(--color-danger)" : "var(--color-warning)"}">${escapeHtml(title)}</h2>
        </div>
        <div class="modal-body">
          <p>${escapeHtml(message)}</p>
          ${detailsHTML}
        </div>
        <div class="modal-footer">
          ${cancelLabel ? `<button type="button" class="btn btn-secondary" data-confirm-cancel>${escapeHtml(cancelLabel)}</button>` : ""}
          <button type="button" class="btn ${danger ? "btn-danger" : "btn-primary"}" data-confirm-ok>${escapeHtml(confirmLabel)}</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.showModal();
    modal.querySelector("[data-confirm-ok]")?.focus();

    const finish = (result) => {
      modal.close();
      modal.remove();
      resolve(result);
    };
    modal
      .querySelector("[data-confirm-cancel]")
      ?.addEventListener("click", () => finish(false));
    modal
      .querySelector("[data-confirm-ok]")
      ?.addEventListener("click", () => finish(true));
    modal.addEventListener("cancel", (e) => {
      e.preventDefault();
      finish(false);
    });
  });
}

/**
 * Exibe um modal para captura de texto obrigatório (substitui window.prompt).
 * @param {Object} opts
 * @param {string} [opts.title='Informe o motivo']
 * @param {string} [opts.message='']
 * @param {Array<{label:string,value:*}>|string} [opts.details] - Linhas de detalhe do registro afetado
 * @param {string} [opts.label='Motivo']
 * @param {string} [opts.placeholder='']
 * @param {boolean} [opts.required=true]
 * @param {string} [opts.confirmLabel='Confirmar']
 * @param {string} [opts.cancelLabel='Cancelar']
 * @param {boolean} [opts.danger=false]
 * @returns {Promise<string|null>} Texto informado, ou null se cancelado/vazio
 */
export function promptDialog({
  title = "Informe o motivo",
  message = "",
  details = null,
  label = "Motivo",
  placeholder = "",
  required = true,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  danger = false,
} = {}) {
  return new Promise((resolve) => {
    document.getElementById("app-prompt-dialog")?.remove();

    const detailsHTML = renderDialogDetails(details);
    const modal = document.createElement("dialog");
    modal.id = "app-prompt-dialog";
    modal.className = "modal";
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "app-prompt-title");
    modal.innerHTML = `
      <div class="modal-content modal-sm">
        <div class="modal-header" style="background:${danger ? "var(--color-danger-dim)" : "var(--color-warning-dim)"}">
          <h2 class="modal-title" id="app-prompt-title" style="color:${danger ? "var(--color-danger)" : "var(--color-warning)"}">${escapeHtml(title)}</h2>
        </div>
        <div class="modal-body">
          ${message ? `<p class="mb-2">${escapeHtml(message)}</p>` : ""}
          ${detailsHTML}
          <div class="form-group mt-2">
            <label class="form-label" for="app-prompt-value">${escapeHtml(label)} ${required ? '<span class="required">*</span>' : ""}</label>
            <textarea id="app-prompt-value" class="form-input form-textarea" rows="3" placeholder="${escapeHtml(placeholder)}"></textarea>
            <span class="form-error" id="app-prompt-error"></span>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-prompt-cancel>${escapeHtml(cancelLabel)}</button>
          <button type="button" class="btn ${danger ? "btn-danger" : "btn-primary"}" data-prompt-ok>${escapeHtml(confirmLabel)}</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.showModal();
    const textarea = modal.querySelector("#app-prompt-value");
    textarea?.focus();

    const finish = (result) => {
      modal.close();
      modal.remove();
      resolve(result);
    };
    modal
      .querySelector("[data-prompt-cancel]")
      ?.addEventListener("click", () => finish(null));
    modal.querySelector("[data-prompt-ok]")?.addEventListener("click", () => {
      const value = textarea.value.trim();
      if (required && !value) {
        modal.querySelector("#app-prompt-error").textContent =
          "Este campo é obrigatório.";
        textarea.classList.add("error");
        return;
      }
      finish(value);
    });
    modal.addEventListener("cancel", (e) => {
      e.preventDefault();
      finish(null);
    });
  });
}

function renderDialogDetails(details) {
  if (!details) return "";
  if (typeof details === "string") return details;
  if (Array.isArray(details)) {
    return `<div class="confirm-details">${details
      .map(
        (d) =>
          `<div class="confirm-details-row"><span class="confirm-details-label">${escapeHtml(d.label)}</span><span class="confirm-details-value">${escapeHtml(String(d.value ?? "—"))}</span></div>`,
      )
      .join("")}</div>`;
  }
  return "";
}

// ============================================================
// MODAL DE ALERTAS CRÍTICOS
// ============================================================

/**
 * Filtra apenas os alertas de severidade crítica/urgente de um conjunto de alertas.
 * @param {{expiry: Alert[], stock: Alert[]}} alerts
 * @returns {Alert[]}
 */
export function getCriticalAlerts(alerts) {
  if (!alerts || typeof alerts !== "object") return [];
  return [
    ...(alerts.expiry || []).filter(
      (a) => a.severity === "critical" || a.severity === "urgent",
    ),
    ...(alerts.stock || []).filter((a) => a.severity === "critical"),
  ];
}

/**
 * Exibe modal com alertas críticos na abertura do sistema.
 * @param {{expiry: Alert[], stock: Alert[], total: number}} alerts
 */
export function showAlertsModal(alerts) {
  // Garantir que alerts tenha a estrutura correta
  if (!alerts || typeof alerts !== "object") {
    console.error("showAlertsModal: alerts inválido", alerts);
    return;
  }

  const critical = getCriticalAlerts(alerts);

  // Remover modal anterior se existir
  const existing = document.getElementById("critical-alerts-modal");
  if (existing) existing.remove();

  const modal = document.createElement("dialog");
  modal.id = "critical-alerts-modal";
  modal.className = "modal";
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "critical-alerts-title");

  // Se não houver alertas críticos, mostrar mensagem positiva
  if (!critical.length) {
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header" style="background:var(--color-success-dim)">
          <h2 class="modal-title" id="critical-alerts-title" style="color:var(--color-success)">
            ✓ Nenhum Alerta Crítico
          </h2>
        </div>
        <div class="modal-body">
          <p class="text-center text-muted">Tudo está sob controle! Não há alertas críticos no momento.</p>
          ${alerts.total > 0 ? `<p class="text-center text-sm text-muted mt-2">Você tem ${alerts.total} alerta(s) de nível baixo. Consulte os módulos de Validades e Estoque para mais detalhes.</p>` : ""}
        </div>
        <div class="modal-footer">
          <button id="close-critical-alerts" class="btn btn-primary">OK</button>
        </div>
      </div>
    `;
  } else {
    // Mostrar alertas críticos
    const rows = critical
      .slice(0, 10)
      .map((a) => {
        if (a.type === "expiry") {
          const label =
            a.diasRestantes < 0
              ? `<span class="badge badge-danger">Vencido há ${Math.abs(a.diasRestantes)}d</span>`
              : `<span class="badge badge-warning">Vence em ${a.diasRestantes}d</span>`;
          return `<tr>
          <td>${escapeHtml(a.nome)}</td>
          <td>${escapeHtml(a.lote)}</td>
          <td>${label}</td>
        </tr>`;
        } else {
          const label =
            a.qtdAtual <= 0
              ? `<span class="badge badge-danger">Sem estoque</span>`
              : `<span class="badge badge-warning">Qtd: ${a.qtdAtual} (mín: ${a.qtdMinima})</span>`;
          return `<tr>
          <td>${escapeHtml(a.nome)}</td>
          <td>—</td>
          <td>${label}</td>
        </tr>`;
        }
      })
      .join("");

    const more =
      critical.length > 10
        ? `<p class="text-sm text-muted mt-2">...e mais ${critical.length - 10} alertas. Consulte os módulos de Validades e Estoque.</p>`
        : "";

    modal.innerHTML = `
      <div class="modal-content modal-lg">
        <div class="modal-header" style="background:var(--color-danger-dim)">
          <h2 class="modal-title" id="critical-alerts-title" style="color:var(--color-danger)">
            ⚠ Alertas Críticos (${critical.length})
          </h2>
        </div>
        <div class="modal-body">
          <p class="text-sm text-muted mb-3">Os itens abaixo requerem atenção imediata:</p>
          <table class="data-table">
            <thead>
              <tr><th>Medicamento</th><th>Lote</th><th>Status</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          ${more}
        </div>
        <div class="modal-footer">
          <button id="close-critical-alerts" class="btn btn-primary">Entendido — Vou verificar</button>
        </div>
      </div>
    `;
  }

  document.body.appendChild(modal);
  modal.showModal();

  modal
    .querySelector("#close-critical-alerts")
    .addEventListener("click", () => {
      modal.close();
      modal.remove();
    });
}

// ============================================================
// UTILITÁRIO
// ============================================================

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
