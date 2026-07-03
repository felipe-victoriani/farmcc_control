/**
 * @file dashboard.js
 * @description Módulo de Dashboard: KPIs, movimentações recentes e alertas.
 */

import { dbReadAll } from "../core/db.js";
import { icon } from "../shared/icons.js";
import { checkAllAlerts, updateAlertBadges } from "../shared/notifications.js";
import {
  snapshotToArray,
  sortBy,
  formatDateTime,
  formatDate,
  labelTipoMovimento,
  formatNumber,
  escapeHtml,
} from "../shared/utils.js";

// ============================================================
// HELPERS LOCAIS
// ============================================================

function tipoClass(tipo) {
  return (
    {
      saida: "badge-danger",
      entrada: "badge-success",
      devolucao: "badge-info",
      perda: "badge-warning",
      descarte: "badge-neutral",
    }[tipo] || "badge-neutral"
  );
}

// ============================================================
// RENDER
// ============================================================

export async function renderDashboard() {
  const main = document.getElementById("app-main");

  main.innerHTML = `
  <section class="module-section" id="section-dashboard">
    <div class="section-header">
      <div>
        <h1 class="section-title">Dashboard</h1>
        <p class="section-subtitle">Visão geral do sistema — ${formatDate(Date.now())}</p>
      </div>
    </div>

    <!-- KPIs -->
    <div class="kpi-grid" id="dash-kpi-grid">
      ${[...Array(4)].map(() => `<div class="kpi-card skeleton-card"><div class="skeleton skeleton-text"></div></div>`).join("")}
    </div>

    <!-- Linha 2: movimentações recentes + alertas -->
    <div class="dash-grid">
      <div class="card" id="dash-recent-movs">
        <div class="card-header">
          <h2 class="card-title">${icon("activity", "icon icon-sm")} Movimentações Recentes</h2>
          <a href="#movimentacoes" class="btn btn-ghost btn-sm">Ver todas</a>
        </div>
        <div class="card-body p-0">
          <div id="dash-movs-content"><div class="skeleton skeleton-text m-3"></div></div>
        </div>
      </div>
      <div class="card" id="dash-alerts-card">
        <div class="card-header">
          <h2 class="card-title">${icon("bell", "icon icon-sm")} Alertas</h2>
        </div>
        <div class="card-body p-0">
          <div id="dash-alerts-content"><div class="skeleton skeleton-text m-3"></div></div>
        </div>
      </div>
    </div>

    <!-- Ações rápidas -->
    <div class="card mt-4">
      <div class="card-header"><h2 class="card-title">${icon("crosshair", "icon icon-sm")} Ações Rápidas</h2></div>
      <div class="card-body">
        <div class="quick-actions-grid">
          <a href="#saida" class="quick-action-btn quick-action-danger">
            ${icon("minus", "icon icon-md")}
            <span>Registrar Saída</span>
          </a>
          <a href="#entrada" class="quick-action-btn quick-action-success">
            ${icon("plus", "icon icon-md")}
            <span>Registrar Entrada</span>
          </a>
          <a href="#estoque" class="quick-action-btn quick-action-blue">
            ${icon("pill", "icon icon-md")}
            <span>Estoque</span>
          </a>
          <a href="#validades" class="quick-action-btn quick-action-yellow">
            ${icon("expiry", "icon icon-md")}
            <span>Validades</span>
          </a>
          <a href="#relatorios" class="quick-action-btn quick-action-purple">
            ${icon("reports", "icon icon-md")}
            <span>Relatórios</span>
          </a>
          <a href="#conformidade" class="quick-action-btn quick-action-teal">
            ${icon("compliance", "icon icon-md")}
            <span>Conformidade</span>
          </a>
        </div>
      </div>
    </div>
  </section>
  `;

  loadDashboardData();
}

async function loadDashboardData() {
  try {
    const [rawMeds, rawMovs] = await Promise.all([
      dbReadAll("medications"),
      dbReadAll("movements"),
    ]);
    const meds = snapshotToArray(rawMeds);
    const movs = sortBy(snapshotToArray(rawMovs), "dataHora", "desc");

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const movsHoje = movs.filter(
      (m) => m.dataHora && new Date(m.dataHora) >= hoje,
    );
    const saidasHoje = movsHoje.filter((m) => m.tipo === "saida").length;
    const vencidos = meds.filter(
      (m) =>
        m.validade && new Date(m.validade) < new Date() && m.status === "ativo",
    ).length;
    const baixoEstoque = meds.filter(
      (m) => m.qtdMinima != null && (m.qtdAtual ?? 0) < m.qtdMinima,
    ).length;
    const alerts = await checkAllAlerts();

    document.getElementById("dash-kpi-grid").innerHTML = `
      <div class="kpi-card" data-tooltip="Medicamentos Ativos: ${meds.filter((m) => m.status === "ativo").length} de ${meds.length} cadastrados">
        <div class="kpi-icon kpi-icon-blue">${icon("pill", "icon icon-md")}</div>
        <div class="kpi-body"><p class="kpi-label">Medicamentos Ativos</p><p class="kpi-value">${meds.filter((m) => m.status === "ativo").length}</p><p class="kpi-sub">de ${meds.length} cadastrados</p></div>
      </div>
      <div class="kpi-card" data-tooltip="Movimentações Hoje: ${movsHoje.length} total, ${saidasHoje} saída(s)">
        <div class="kpi-icon kpi-icon-green">${icon("activity", "icon icon-md")}</div>
        <div class="kpi-body"><p class="kpi-label">Movimentações Hoje</p><p class="kpi-value">${movsHoje.length}</p><p class="kpi-sub">${saidasHoje} saída(s)</p></div>
      </div>
      <div class="kpi-card ${vencidos > 0 ? "kpi-card-danger" : ""}" data-tooltip="Vencidos: ${vencidos} | Estoque baixo: ${baixoEstoque}">
        <div class="kpi-icon kpi-icon-red">${icon("expiry", "icon icon-md")}</div>
        <div class="kpi-body"><p class="kpi-label">Medicamentos Vencidos</p><p class="kpi-value">${vencidos}</p><p class="kpi-sub">${baixoEstoque} com estoque baixo</p></div>
      </div>
      <div class="kpi-card ${alerts.total > 0 ? "kpi-card-warning" : ""}" data-tooltip="Alertas: ${alerts.total} total | ${alerts.expiry.length} validade(s) | ${alerts.stock.length} estoque(s)">
        <div class="kpi-icon kpi-icon-yellow">${icon("bell", "icon icon-md")}</div>
        <div class="kpi-body"><p class="kpi-label">Alertas Ativos</p><p class="kpi-value">${alerts.total}</p><p class="kpi-sub">${alerts.expiry.length} validade(s), ${alerts.stock.length} estoque(s)</p></div>
      </div>
    `;

    updateAlertBadges(alerts.total);

    const recentMovs = movs.slice(0, 8);
    document.getElementById("dash-movs-content").innerHTML = recentMovs.length
      ? `
      <table class="data-table">
        <thead><tr><th>Data</th><th>Tipo</th><th>Medicamento</th><th class="text-right">Qtd.</th></tr></thead>
        <tbody>
          ${recentMovs
            .map(
              (m) => `<tr>
            <td>${formatDateTime(m.dataHora)}</td>
            <td><span class="badge badge-sm ${tipoClass(m.tipo)}">${labelTipoMovimento(m.tipo)}</span></td>
            <td>${escapeHtml(m.medicamentoNome || "—")}</td>
            <td class="text-right">${formatNumber(m.quantidade)}</td>
          </tr>`,
            )
            .join("")}
        </tbody>
      </table>
    `
      : '<p class="text-muted p-3">Nenhuma movimentação registrada.</p>';

    const allAlerts = [...alerts.expiry, ...alerts.stock];
    document.getElementById("dash-alerts-content").innerHTML = allAlerts.length
      ? `
      <ul class="alert-list">
        ${allAlerts
          .slice(0, 6)
          .map(
            (a) => `<li class="alert-list-item alert-list-${a.type}">
          ${icon(a.type === "critical" ? "xCircle" : "alertTriangle", "icon icon-sm")}
          <span>${escapeHtml(a.message)}</span>
        </li>`,
          )
          .join("")}
      </ul>
    `
      : `<p class="text-success p-3">${icon("checkCircle", "icon icon-sm")} Nenhum alerta crítico.</p>`;
  } catch (err) {
    console.error("[dashboard]", err);
  }
}
