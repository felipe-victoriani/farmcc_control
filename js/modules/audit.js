/**
 * @file audit.js
 * @description Módulo de Trilha de Auditoria — registro imutável de ações (LGPD / RDC 204/17).
 */

import { dbReadAll } from "../core/db.js";
import { icon } from "../shared/icons.js";
import {
  snapshotToArray,
  sortBy,
  formatDateTime,
  escapeHtml,
} from "../shared/utils.js";

export async function renderAuditModule() {
  const main = document.getElementById("app-main");
  const raw = await dbReadAll("audit_log", 500); // últimos 500 eventos
  const logs = sortBy(snapshotToArray(raw), "timestamp", "desc");

  main.innerHTML = `
  <section class="module-section">
    <div class="section-header">
      <div>
        <h1 class="section-title">Trilha de Auditoria</h1>
        <p class="section-subtitle">Registro imutável de todas as ações do sistema — LGPD / RDC 204/17</p>
      </div>
    </div>
    <div class="filter-bar">
      <div class="filter-search">
        ${icon("search", "icon icon-sm filter-search-icon")}
        <input type="search" id="audit-search" class="form-input" placeholder="Buscar ação, usuário, módulo...">
      </div>
    </div>
    <div class="card">
      <div class="card-body p-0">
        <table class="data-table">
          <thead><tr><th>Data/Hora</th><th>Usuário</th><th>Ação</th><th>Módulo</th><th>Detalhes</th></tr></thead>
          <tbody id="audit-tbody">
            ${
              logs
                .slice(0, 150)
                .map(
                  (l) => `<tr>
              <td>${formatDateTime(l.timestamp)}</td>
              <td>${escapeHtml(l.userName || "—")}</td>
              <td><code class="text-sm">${escapeHtml(l.action || "—")}</code></td>
              <td>${escapeHtml(l.module || "—")}</td>
              <td class="text-sm">${escapeHtml(l.details || "—")}</td>
            </tr>`,
                )
                .join("") ||
              '<tr><td colspan="5" class="text-muted text-center">Nenhum evento.</td></tr>'
            }
          </tbody>
        </table>
      </div>
    </div>
  </section>
  `;

  let cache = logs;
  document.getElementById("audit-search")?.addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = q
      ? cache.filter(
          (l) =>
            (l.action || "").toLowerCase().includes(q) ||
            (l.userName || "").toLowerCase().includes(q) ||
            (l.module || "").toLowerCase().includes(q),
        )
      : cache;
    document.getElementById("audit-tbody").innerHTML =
      filtered
        .slice(0, 150)
        .map(
          (l) => `<tr>
        <td>${formatDateTime(l.timestamp)}</td>
        <td>${escapeHtml(l.userName || "—")}</td>
        <td><code class="text-sm">${escapeHtml(l.action || "—")}</code></td>
        <td>${escapeHtml(l.module || "—")}</td>
        <td class="text-sm">${escapeHtml(l.details || "—")}</td>
      </tr>`,
        )
        .join("") ||
      '<tr><td colspan="5" class="text-muted text-center">Nenhum resultado.</td></tr>';
  });
}
