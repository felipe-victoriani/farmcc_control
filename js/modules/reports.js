/**
 * @file reports.js
 * @description Módulo de relatórios farmacêuticos.
 * 5 abas: Balanço Mensal (Port.344/98 Art.58), Consumo por Cirurgia,
 * Validades, Perdas/Desvios, Trilha de Auditoria.
 */

import { dbReadAll, dbRead } from "../core/db.js";
import { showToast } from "../shared/notifications.js";
import { icon } from "../shared/icons.js";
import {
  snapshotToArray,
  sortBy,
  formatDate,
  formatDateTime,
  exportCSV,
  formatMonthYear,
  labelTipoMovimento,
  badgeClassLista,
  diasRestantes,
  textoDiasRestantes,
  classificarValidade,
  formatNumber,
  groupBy,
  escapeHtml,
} from "../shared/utils.js";

// ============================================================
// RENDER PRINCIPAL
// ============================================================

export async function renderReportsModule() {
  const main = document.getElementById("app-main");
  if (!main) return;
  main.innerHTML = buildReportsHTML();
  setupReportsListeners();
  await loadTabContent("balanco");
}

function buildReportsHTML() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  return `
  <section class="module-section" id="section-reports">
    <div class="section-header">
      <div>
        <h1 class="section-title">Relatórios</h1>
        <p class="section-subtitle">Relatórios obrigatórios e gerenciais conforme Port. 344/98 e RDC 222/2018</p>
      </div>
      <div class="section-actions">
        <button class="btn btn-secondary btn-sm" id="btn-print-report">
          ${icon("print", "icon icon-sm")} Imprimir
        </button>
        <button class="btn btn-secondary btn-sm" id="btn-export-report">
          ${icon("download", "icon icon-sm")} Exportar CSV
        </button>
      </div>
    </div>

    <!-- Abas -->
    <div class="tabs-bar" role="tablist" aria-label="Relatórios">
      <button class="tab-btn tab-active" role="tab" aria-selected="true"  data-tab="balanco">Balanço Mensal</button>
      <button class="tab-btn" role="tab" aria-selected="false" data-tab="bspo">BSPO Trimestral</button>
      <button class="tab-btn" role="tab" aria-selected="false" data-tab="consumo">Consumo / Cirurgia</button>
      <button class="tab-btn" role="tab" aria-selected="false" data-tab="validades">Validades</button>
      <button class="tab-btn" role="tab" aria-selected="false" data-tab="perdas">Perdas/Desvios</button>
      <button class="tab-btn" role="tab" aria-selected="false" data-tab="auditoria">Trilha de Auditoria</button>
    </div>

    <!-- Painel de filtros do relatório ativo -->
    <div class="filter-bar" id="report-filter-bar">
      <div class="filter-group" id="filter-mensal">
        <select id="rep-mes" class="form-select">
          ${Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}" ${i + 1 === month ? "selected" : ""}>${formatMonthYear(i + 1, year)}</option>`).join("")}
        </select>
        <select id="rep-ano" class="form-select">
          ${[year - 2, year - 1, year, year + 1].map((y) => `<option value="${y}" ${y === year ? "selected" : ""}>${y}</option>`).join("")}
        </select>
      </div>
      <div class="filter-group hidden" id="filter-trimestral">
        <select id="rep-trimestre" class="form-select">
          <option value="1">T1 — Janeiro a Março</option>
          <option value="2">T2 — Abril a Junho</option>
          <option value="3">T3 — Julho a Setembro</option>
          <option value="4">T4 — Outubro a Dezembro</option>
        </select>
        <select id="rep-ano-trim" class="form-select">
          ${[year - 2, year - 1, year, year + 1].map((y) => `<option value="${y}" ${y === year ? "selected" : ""}>${y}</option>`).join("")}
        </select>
      </div>
      <button class="btn btn-primary btn-sm" id="btn-gen-report">
        ${icon("barChart", "icon icon-sm")} Gerar Relatório
      </button>
    </div>

    <!-- Área do relatório -->
    <div id="report-content" class="report-area">
      <div class="empty-state">
        ${icon("fileText", "icon icon-xl")}
        <p class="empty-state-title">Selecione um período e clique em "Gerar Relatório"</p>
      </div>
    </div>
  </section>
  `;
}

// ============================================================
// ABAS
// ============================================================

let activeTab = "balanco";
let reportData = null;

function setupReportsListeners() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      document.querySelectorAll(".tab-btn").forEach((b) => {
        b.classList.remove("tab-active");
        b.setAttribute("aria-selected", "false");
      });
      btn.classList.add("tab-active");
      btn.setAttribute("aria-selected", "true");
      activeTab = btn.dataset.tab;

      // Alternar filtros mensal ↔ trimestral
      const isBspo = activeTab === "bspo";
      document
        .getElementById("filter-mensal")
        ?.classList.toggle("hidden", isBspo);
      document
        .getElementById("filter-trimestral")
        ?.classList.toggle("hidden", !isBspo);

      await loadTabContent(activeTab);
    });
  });

  document
    .getElementById("btn-gen-report")
    ?.addEventListener("click", async () => {
      await loadTabContent(activeTab);
    });

  document.getElementById("btn-print-report")?.addEventListener("click", () => {
    window.print();
  });

  document
    .getElementById("btn-export-report")
    ?.addEventListener("click", () => {
      if (reportData?.length) {
        exportCSV(reportData, `relatorio_${activeTab}`);
        showToast("success", "CSV exportado!");
      } else {
        showToast("warning", "Gere o relatório primeiro.");
      }
    });
}

async function loadTabContent(tab) {
  const mes = parseInt(
    document.getElementById("rep-mes")?.value || new Date().getMonth() + 1,
    10,
  );
  const ano = parseInt(
    document.getElementById("rep-ano")?.value || new Date().getFullYear(),
    10,
  );

  const content = document.getElementById("report-content");
  content.innerHTML = `<div class="skeleton skeleton-text mb-2"></div><div class="skeleton skeleton-text mb-2"></div><div class="skeleton skeleton-text"></div>`;

  try {
    switch (tab) {
      case "balanco":
        await renderBalanco(mes, ano);
        break;
      case "bspo": {
        const trim = parseInt(
          document.getElementById("rep-trimestre")?.value || "1",
          10,
        );
        const anoTrim = parseInt(
          document.getElementById("rep-ano-trim")?.value ||
            new Date().getFullYear(),
          10,
        );
        await renderBSPO(trim, anoTrim);
        break;
      }
      case "consumo":
        await renderConsumo(mes, ano);
        break;
      case "validades":
        await renderValidades();
        break;
      case "perdas":
        await renderPerdas(mes, ano);
        break;
      case "auditoria":
        await renderAuditoria(mes, ano);
        break;
    }
  } catch (err) {
    content.innerHTML = `<div class="alert alert-danger">Erro ao gerar relatório: ${escapeHtml(err.message)}</div>`;
  }
}

// ============================================================
// HELPER: resolve nome e CRF do Farmacêutico RT
// Prioridade: 1) settings.responsavelTecnico  2) usuário com role FARMACEUTICO_RT
// ============================================================
async function resolveRT() {
  const [rawSettings, rawUsers] = await Promise.all([
    dbRead("settings", "main").catch(() => ({})),
    dbReadAll("users").catch(() => ({})),
  ]);
  const cfg = rawSettings || {};
  if (cfg.responsavelTecnico) {
    return { nome: cfg.responsavelTecnico, crf: cfg.crfNumero || "" };
  }
  const users = snapshotToArray(rawUsers || {});
  const rtUser = users.find(
    (u) => u.role === "FARMACEUTICO_RT" && u.ativo !== false,
  );
  if (rtUser) {
    return { nome: rtUser.nome || "", crf: rtUser.crfNumero || "" };
  }
  return { nome: "", crf: "" };
}

// ============================================================
// ABA 1: BALANÇO MENSAL (Port. 344/98 Art.58)
// ============================================================

async function renderBalanco(mes, ano) {
  const content = document.getElementById("report-content");
  const [rawMeds, rawMovs, rt] = await Promise.all([
    dbReadAll("medications"),
    dbReadAll("movements"),
    resolveRT(),
  ]);

  const meds = snapshotToArray(rawMeds).filter(
    (m) => m.lista && m.lista !== "normal",
  );
  const movs = snapshotToArray(rawMovs).filter((m) => {
    const d = m.dataHora ? new Date(m.dataHora) : null;
    return d && d.getMonth() + 1 === mes && d.getFullYear() === ano;
  });

  const rawSettings =
    (await dbRead("settings", "main").catch(() => ({}))) || {};
  const settings = {
    nomeInstituicao: rawSettings.institutionName || "—",
    cnes: rawSettings.cnes || "—",
    nomeRT: rt.nome || "—",
    crf: rt.crf || "—",
  };
  const dataAtual = formatDate(Date.now());

  const rows = meds
    .map((med) => {
      const movsmed = movs.filter((m) => m.medicamentoId === med.id);
      const entradas = movsmed
        .filter((m) => ["entrada", "devolucao"].includes(m.tipo))
        .reduce((s, m) => s + (Number(m.quantidade) || 0), 0);
      const saidas = movsmed
        .filter((m) => m.tipo === "saida")
        .reduce((s, m) => s + (Number(m.quantidade) || 0), 0);
      const perdas = movsmed
        .filter((m) => ["perda", "descarte"].includes(m.tipo))
        .reduce((s, m) => s + (Number(m.quantidade) || 0), 0);
      return { med, entradas, saidas, perdas, saldo: med.qtdAtual ?? 0 };
    })
    .filter((r) => r.entradas || r.saidas || r.perdas || r.saldo);

  reportData = rows.map((r) => ({
    Medicamento: r.med.nome,
    "DCB/DCI": r.med.dcb || "",
    Lista: r.med.lista,
    Entradas: r.entradas,
    Saídas: r.saidas,
    "Perdas/Desvios": r.perdas,
    "Saldo Atual": r.saldo,
    Unidade: r.med.unidade || "",
  }));

  content.innerHTML = `
    <div class="report-document" id="report-printable">
      <div class="report-header print-block">
        <h2 class="report-title">BALANÇO MENSAL DE SUBSTÂNCIAS CONTROLADAS</h2>
        <p class="report-subtitle">Portaria SVS/MS n° 344/98 — Art. 58 | ${formatMonthYear(mes, ano)}</p>
        <div class="report-meta-grid">
          <div><span class="label">Instituição:</span> <strong>${escapeHtml(settings.nomeInstituicao)}</strong></div>
          <div><span class="label">CNES:</span> <strong>${escapeHtml(settings.cnes)}</strong></div>
          <div><span class="label">Farmacêutico RT:</span> <strong>${escapeHtml(settings.nomeRT)}</strong></div>
          <div><span class="label">CRF:</span> <strong>${escapeHtml(settings.crf)}</strong></div>
          <div><span class="label">Emissão:</span> <strong>${dataAtual}</strong></div>
        </div>
      </div>

      ${
        !rows.length
          ? `<div class="alert alert-info">Nenhuma movimentação de controlados no período.</div>`
          : `
      <table class="data-table report-table">
        <thead>
          <tr>
            <th>Medicamento / DCB</th>
            <th>Lista</th>
            <th class="text-right">Entradas</th>
            <th class="text-right">Saídas</th>
            <th class="text-right">Perdas/Desvios</th>
            <th class="text-right">Saldo Atual</th>
            <th>Unidade</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (r) => `<tr>
            <td>
              <div class="cell-primary">${escapeHtml(r.med.nome)}</div>
              ${r.med.dcb ? `<div class="cell-secondary">${escapeHtml(r.med.dcb)}</div>` : ""}
            </td>
            <td><span class="badge ${badgeClassLista(r.med.lista)}">${r.med.lista}</span></td>
            <td class="text-right text-success fw-600">${formatNumber(r.entradas)}</td>
            <td class="text-right text-danger fw-600">${formatNumber(r.saidas)}</td>
            <td class="text-right text-warning">${r.perdas ? formatNumber(r.perdas) : "—"}</td>
            <td class="text-right fw-600">${formatNumber(r.saldo)}</td>
            <td>${escapeHtml(r.med.unidade || "")}</td>
          </tr>`,
            )
            .join("")}
        </tbody>
      </table>
      `
      }

      <div class="report-footer-signature print-block">
        <p class="text-sm text-muted">Este relatório deve ser mantido por 5 anos conforme Port. 344/98 Art. 58.</p>
        <div class="signature-line">
          <div class="signature-block">
            <div class="signature-field"></div>
            <p>Farmacêutico Responsável Técnico</p>
            <p>${escapeHtml(settings.nomeRT !== "—" ? settings.nomeRT : "____________________________")}</p>
            <p>CRF: ${escapeHtml(settings.crf !== "—" ? settings.crf : "__________")}</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ============================================================
// ABA BSPO: BALANÇO TRIMESTRAL (Port. 344/98 Anexo XX)
// Prazo legal: até dia 15 de jan/abr/jul/out
// ============================================================

async function renderBSPO(trimestre, ano) {
  const content = document.getElementById("report-content");

  // Meses do trimestre
  const mesesPorTrimestre = {
    1: [1, 2, 3],
    2: [4, 5, 6],
    3: [7, 8, 9],
    4: [10, 11, 12],
  };
  const meses = mesesPorTrimestre[trimestre];
  const nomeTrimestre = {
    1: "1º Trimestre (Jan–Mar)",
    2: "2º Trimestre (Abr–Jun)",
    3: "3º Trimestre (Jul–Set)",
    4: "4º Trimestre (Out–Dez)",
  }[trimestre];
  const prazoEntrega = {
    1: "15 de abril",
    2: "15 de julho",
    3: "15 de outubro",
    4: "15 de janeiro",
  }[trimestre];

  const [rawMeds, rawMovs, rt] = await Promise.all([
    dbReadAll("medications"),
    dbReadAll("movements"),
    resolveRT(),
  ]);

  const meds = snapshotToArray(rawMeds).filter(
    (m) => m.lista && !["", "normal"].includes(m.lista),
  );
  const movs = snapshotToArray(rawMovs).filter((m) => {
    const d = m.dataHora ? new Date(m.dataHora) : null;
    return d && d.getFullYear() === ano && meses.includes(d.getMonth() + 1);
  });

  const rawSettings =
    (await dbRead("settings", "main").catch(() => ({}))) || {};
  const nomeRT = rt.nome || "—";
  const crfRT = rt.crf || "—";

  const rows = meds
    .map((med) => {
      const movsmed = movs.filter((m) => m.medicamentoId === med.id);
      const entradas = movsmed
        .filter((m) => ["entrada", "devolucao"].includes(m.tipo))
        .reduce((s, m) => s + (Number(m.quantidade) || 0), 0);
      const saidas = movsmed
        .filter((m) => m.tipo === "saida")
        .reduce((s, m) => s + (Number(m.quantidade) || 0), 0);
      const perdas = movsmed
        .filter((m) => ["perda", "descarte"].includes(m.tipo))
        .reduce((s, m) => s + (Number(m.quantidade) || 0), 0);
      return { med, entradas, saidas, perdas, saldo: med.qtdAtual ?? 0 };
    })
    .filter((r) => r.entradas || r.saidas || r.perdas || r.saldo);

  reportData = rows.map((r) => ({
    Medicamento: r.med.nome,
    "DCB/DCI": r.med.dcb || "",
    Lista: r.med.lista,
    Entradas: r.entradas,
    Saídas: r.saidas,
    "Perdas/Desvios": r.perdas,
    "Saldo Atual": r.saldo,
    Unidade: r.med.unidade || "",
  }));

  content.innerHTML = `
    <div class="report-document" id="report-printable">
      <div class="report-header print-block">
        <h2 class="report-title">BSPO — BALANÇO DE SUBSTÂNCIAS PSICOATIVAS E OUTRAS CONTROLADAS</h2>
        <p class="report-subtitle">Portaria SVS/MS nº 344/98 — Anexo XX | ${nomeTrimestre} / ${ano}</p>
        <div class="alert alert-warning mb-3" style="font-size:12px">
          ${icon("alertTriangle", "icon icon-sm")} Prazo de entrega: até <strong>${prazoEntrega} de ${ano + (trimestre === 4 ? 1 : 0)}</strong> para o SNGPC / Vigilância Sanitária local.
        </div>
        <div class="report-meta-grid">
          <div><span class="label">Farmacêutico RT:</span> <strong>${escapeHtml(nomeRT)}</strong></div>
          <div><span class="label">CRF:</span> <strong>${escapeHtml(crfRT)}</strong></div>
          <div><span class="label">Período:</span> <strong>${nomeTrimestre} / ${ano}</strong></div>
          <div><span class="label">Emissão:</span> <strong>${formatDate(Date.now())}</strong></div>
        </div>
      </div>
      ${
        !rows.length
          ? `<div class="alert alert-info">Nenhuma movimentação de controlados no trimestre.</div>`
          : `<table class="data-table report-table">
          <thead>
            <tr>
              <th>Medicamento / DCB</th><th>Lista</th>
              <th class="text-right">Entradas</th><th class="text-right">Saídas</th>
              <th class="text-right">Perdas/Desvios</th><th class="text-right">Saldo Atual</th><th>Unidade</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (r) => `<tr>
              <td><div class="cell-primary">${escapeHtml(r.med.nome)}</div>${r.med.dcb ? `<div class="cell-secondary">${escapeHtml(r.med.dcb)}</div>` : ""}</td>
              <td><span class="badge ${badgeClassLista(r.med.lista)}">${r.med.lista}</span></td>
              <td class="text-right text-success fw-600">${formatNumber(r.entradas)}</td>
              <td class="text-right text-danger fw-600">${formatNumber(r.saidas)}</td>
              <td class="text-right text-warning">${r.perdas ? formatNumber(r.perdas) : "—"}</td>
              <td class="text-right fw-600">${formatNumber(r.saldo)}</td>
              <td>${escapeHtml(r.med.unidade || "")}</td>
            </tr>`,
              )
              .join("")}
          </tbody>
          <tfoot>
            <tr style="border-top:2px solid var(--color-border)">
              <td colspan="2"><strong>TOTAIS</strong></td>
              <td class="text-right fw-600 text-success">${formatNumber(rows.reduce((s, r) => s + r.entradas, 0))}</td>
              <td class="text-right fw-600 text-danger">${formatNumber(rows.reduce((s, r) => s + r.saidas, 0))}</td>
              <td class="text-right fw-600 text-warning">${formatNumber(rows.reduce((s, r) => s + r.perdas, 0))}</td>
              <td class="text-right fw-600">${formatNumber(rows.reduce((s, r) => s + r.saldo, 0))}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>`
      }
      <div class="report-footer-signature print-block">
        <p class="text-sm text-muted">BSPO deve ser entregue ao SNGPC e à Vigilância Sanitária local até o prazo legal. Conservar por mínimo 5 anos (Port. 344/98 Art. 58).</p>
        <div class="signature-line">
          <div class="signature-block">
            <div class="signature-field"></div>
            <p>Farmacêutico Responsável Técnico</p>
            <p>${escapeHtml(nomeRT !== "—" ? nomeRT : "____________________________")}</p>
            <p>CRF: ${escapeHtml(crfRT !== "—" ? crfRT : "__________")}</p>
          </div>
          <div class="signature-block">
            <div class="signature-field"></div>
            <p>Responsável pela Instituição</p>
            <p>____________________________</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ============================================================
// ABA 2: CONSUMO POR CIRURGIA
// ============================================================

async function renderConsumo(mes, ano) {
  const content = document.getElementById("report-content");
  const [rawMovs, rawSurgs] = await Promise.all([
    dbReadAll("movements"),
    dbReadAll("surgeries"),
  ]);

  const movs = snapshotToArray(rawMovs).filter((m) => {
    const d = m.dataHora ? new Date(m.dataHora) : null;
    return (
      d &&
      d.getMonth() + 1 === mes &&
      d.getFullYear() === ano &&
      m.tipo === "saida" &&
      m.prontuario
    );
  });

  const surgs = snapshotToArray(rawSurgs);
  const byProntuario = groupBy(movs, "prontuario");

  reportData = movs.map((m) => ({
    Prontuário: m.prontuario || "",
    Paciente: m.pacienteNome || "",
    "Data/Hora": formatDateTime(m.dataHora),
    Cirurgia: m.tipoCirurgia || "",
    Medicamento: m.medicamentoNome || "",
    Lista: m.medicamentoLista || "",
    "Qtd.": m.quantidade,
    Por: m.registradoPorNome || "",
  }));

  const prontuarios = Object.keys(byProntuario);

  content.innerHTML = `
    <div class="report-document" id="report-printable">
      <h2 class="report-title">MAPA DE CONSUMO POR CIRURGIA</h2>
      <p class="report-subtitle">${formatMonthYear(mes, ano)} — ${movs.length} registros em ${prontuarios.length} prontuários</p>

      ${
        !movs.length
          ? `<div class="alert alert-info">Nenhuma saída registrada por prontuário no período.</div>`
          : `
      ${prontuarios
        .map((pron) => {
          const items = byProntuario[pron];
          const surg = surgs.find((s) => s.prontuario === pron);
          const total = items.reduce(
            (s, m) => s + (Number(m.quantidade) || 0),
            0,
          );
          return `
        <details class="collapsible" open>
          <summary class="collapsible-header">
            ${icon("chevronRight", "icon icon-sm collapsible-icon")}
            <strong>Prontuário ${escapeHtml(pron)}</strong>
            ${items[0]?.pacienteNome ? ` — ${escapeHtml(items[0].pacienteNome)}` : ""}
            ${surg ? ` — ${escapeHtml(surg.tipoCirurgia)}` : ""}
            <span class="badge badge-neutral ml-auto">${items.length} items</span>
          </summary>
          <div class="collapsible-body">
            <table class="data-table">
              <thead><tr><th>Data/Hora</th><th>Medicamento</th><th>Lista</th><th class="text-right">Qtd.</th><th>Registrado por</th></tr></thead>
              <tbody>
                ${items
                  .map(
                    (m) => `<tr>
                  <td>${formatDateTime(m.dataHora)}</td>
                  <td>${escapeHtml(m.medicamentoNome || "—")}</td>
                  <td><span class="badge ${badgeClassLista(m.medicamentoLista)}">${m.medicamentoLista || "—"}</span></td>
                  <td class="text-right">${formatNumber(m.quantidade)}</td>
                  <td>${escapeHtml(m.registradoPorNome || "—")}</td>
                </tr>`,
                  )
                  .join("")}
              </tbody>
              <tfoot><tr><td colspan="3"><strong>Total</strong></td><td class="text-right fw-600">${formatNumber(total)}</td><td></td></tr></tfoot>
            </table>
          </div>
        </details>`;
        })
        .join("")}
      `
      }
    </div>
  `;
}

// ============================================================
// ABA 3: VALIDADES
// ============================================================

async function renderValidades() {
  const content = document.getElementById("report-content");
  const raw = await dbReadAll("medications");
  const meds = snapshotToArray(raw).filter(
    (m) => m.validade && m.status === "ativo",
  );
  const sorted = sortBy(meds, "validade");

  reportData = sorted.map((m) => ({
    Medicamento: m.nome,
    "DCB/DCI": m.dcb || "",
    Lista: m.lista,
    Lote: m.lote || "",
    Validade: formatDate(m.validade),
    "Dias Restantes": diasRestantes(m.validade),
    Status: classificarValidade(m.validade),
    "Qtd. Atual": m.qtdAtual ?? 0,
    Unidade: m.unidade || "",
  }));

  const vencidos = sorted.filter((m) => diasRestantes(m.validade) < 0);
  const urgentes = sorted.filter((m) => {
    const d = diasRestantes(m.validade);
    return d >= 0 && d <= 30;
  });
  const alertas = sorted.filter((m) => {
    const d = diasRestantes(m.validade);
    return d > 30 && d <= 90;
  });

  content.innerHTML = `
    <div class="report-document" id="report-printable">
      <h2 class="report-title">RELATÓRIO DE VALIDADES</h2>
      <p class="report-subtitle">Emitido em ${formatDate(Date.now())}</p>

      <div class="kpi-grid kpi-grid-3 mb-4">
        <div class="kpi-card kpi-card-danger">
          ${icon("xCircle", "icon icon-md")}
          <div class="kpi-body"><p class="kpi-label">Vencidos</p><p class="kpi-value">${vencidos.length}</p></div>
        </div>
        <div class="kpi-card kpi-card-warning">
          ${icon("alertTriangle", "icon icon-md")}
          <div class="kpi-body"><p class="kpi-label">Vencem em 30 dias</p><p class="kpi-value">${urgentes.length}</p></div>
        </div>
        <div class="kpi-card">
          ${icon("clock", "icon icon-md")}
          <div class="kpi-body"><p class="kpi-label">Alertas (31–90 dias)</p><p class="kpi-value">${alertas.length}</p></div>
        </div>
      </div>

      <table class="data-table report-table">
        <thead>
          <tr>
            <th>Medicamento</th>
            <th>Lista</th>
            <th>Lote</th>
            <th>Validade</th>
            <th>Dias Rest.</th>
            <th class="text-right">Qtd. Atual</th>
            <th>Unidade</th>
          </tr>
        </thead>
        <tbody>
          ${
            sorted
              .filter((m) => diasRestantes(m.validade) <= 90)
              .map((m) => {
                const dias = diasRestantes(m.validade);
                const cls =
                  dias < 0 ? "row-critical" : dias <= 30 ? "row-warning" : "";
                return `<tr class="${cls}">
              <td>${escapeHtml(m.nome)}</td>
              <td><span class="badge ${badgeClassLista(m.lista)}">${m.lista}</span></td>
              <td>${escapeHtml(m.lote || "—")}</td>
              <td>${formatDate(m.validade)}</td>
              <td>${textoDiasRestantes(dias)}</td>
              <td class="text-right">${formatNumber(m.qtdAtual ?? 0)}</td>
              <td>${escapeHtml(m.unidade || "")}</td>
            </tr>`;
              })
              .join("") ||
            '<tr><td colspan="7" class="text-muted text-center">Nenhum item vencido ou próximo do vencimento.</td></tr>'
          }
        </tbody>
      </table>
    </div>
  `;
}

// ============================================================
// ABA 4: PERDAS E DESVIOS
// ============================================================

async function renderPerdas(mes, ano) {
  const content = document.getElementById("report-content");
  const raw = await dbReadAll("movements");
  const movs = snapshotToArray(raw).filter((m) => {
    if (!["perda", "descarte"].includes(m.tipo)) return false;
    const d = m.dataHora ? new Date(m.dataHora) : null;
    return d && d.getMonth() + 1 === mes && d.getFullYear() === ano;
  });

  reportData = movs.map((m) => ({
    "Data/Hora": formatDateTime(m.dataHora),
    Tipo: labelTipoMovimento(m.tipo),
    Protocolo: m.protocolo || "",
    Medicamento: m.medicamentoNome || "",
    Lista: m.medicamentoLista || "",
    "Qtd.": m.quantidade,
    Causa: m.causa || "",
    Justificativa: m.justificativa || "",
    Responsável: m.registradoPorNome || "",
  }));

  const totalPerdas = movs
    .filter((m) => m.tipo === "perda")
    .reduce((s, m) => s + (Number(m.quantidade) || 0), 0);
  const totalDescartes = movs
    .filter((m) => m.tipo === "descarte")
    .reduce((s, m) => s + (Number(m.quantidade) || 0), 0);
  const desvios = movs.filter((m) => m.causa === "desvio");

  content.innerHTML = `
    <div class="report-document" id="report-printable">
      <h2 class="report-title">RELATÓRIO DE PERDAS E DESVIOS</h2>
      <p class="report-subtitle">${formatMonthYear(mes, ano)}</p>

      ${
        desvios.length
          ? `<div class="alert alert-danger mb-3">
        <strong>⚠ ATENÇÃO:</strong> ${desvios.length} desvio(s) registrado(s) no período. Verificar comunicação à VISA conforme Port. 344/98.
      </div>`
          : ""
      }

      <div class="kpi-grid kpi-grid-3 mb-4">
        <div class="kpi-card"><div class="kpi-body"><p class="kpi-label">Total Perdas</p><p class="kpi-value">${totalPerdas}</p></div></div>
        <div class="kpi-card"><div class="kpi-body"><p class="kpi-label">Total Descartes</p><p class="kpi-value">${totalDescartes}</p></div></div>
        <div class="kpi-card kpi-card-danger"><div class="kpi-body"><p class="kpi-label">Desvios/Roubos</p><p class="kpi-value">${desvios.length}</p></div></div>
      </div>

      ${
        !movs.length
          ? `<div class="alert alert-info">Nenhuma perda ou descarte no período.</div>`
          : `
      <table class="data-table report-table">
        <thead>
          <tr><th>Data/Hora</th><th>Tipo</th><th>Medicamento</th><th>Lista</th><th class="text-right">Qtd.</th><th>Causa</th><th>Justificativa</th><th>Responsável</th></tr>
        </thead>
        <tbody>
          ${movs
            .map(
              (m) => `<tr class="${m.causa === "desvio" ? "row-critical" : ""}">
            <td>${formatDateTime(m.dataHora)}</td>
            <td><span class="badge badge-warning">${labelTipoMovimento(m.tipo)}</span></td>
            <td>${escapeHtml(m.medicamentoNome || "—")}</td>
            <td><span class="badge ${badgeClassLista(m.medicamentoLista)}">${m.medicamentoLista || "—"}</span></td>
            <td class="text-right">${formatNumber(m.quantidade)}</td>
            <td>${escapeHtml(m.causa || "—")}</td>
            <td>${escapeHtml(m.justificativa || "—")}</td>
            <td>${escapeHtml(m.registradoPorNome || "—")}</td>
          </tr>`,
            )
            .join("")}
        </tbody>
      </table>
      `
      }
    </div>
  `;
}

// ============================================================
// ABA 5: TRILHA DE AUDITORIA
// ============================================================

async function renderAuditoria(mes, ano) {
  const content = document.getElementById("report-content");
  const raw = await dbReadAll("audit_log");
  const logs = snapshotToArray(raw)
    .filter((l) => {
      const d = l.timestamp ? new Date(l.timestamp) : null;
      return d && d.getMonth() + 1 === mes && d.getFullYear() === ano;
    })
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  reportData = logs.map((l) => ({
    "Data/Hora": formatDateTime(l.timestamp),
    Usuário: l.userName || "",
    Ação: l.action || "",
    Módulo: l.module || "",
    Registro: l.recordId || "",
    Detalhes: l.details || "",
  }));

  content.innerHTML = `
    <div class="report-document" id="report-printable">
      <h2 class="report-title">TRILHA DE AUDITORIA</h2>
      <p class="report-subtitle">${formatMonthYear(mes, ano)} — ${logs.length} eventos</p>

      ${
        !logs.length
          ? `<div class="alert alert-info">Nenhum evento de auditoria no período.</div>`
          : `
      <table class="data-table report-table">
        <thead>
          <tr><th>Data/Hora</th><th>Usuário</th><th>Ação</th><th>Módulo</th><th>Detalhes</th></tr>
        </thead>
        <tbody>
          ${logs
            .slice(0, 200)
            .map(
              (l) => `<tr>
            <td>${formatDateTime(l.timestamp)}</td>
            <td>${escapeHtml(l.userName || "—")}</td>
            <td><code class="text-sm">${escapeHtml(l.action || "—")}</code></td>
            <td>${escapeHtml(l.module || "—")}</td>
            <td class="text-sm">${escapeHtml(l.details || "—")}</td>
          </tr>`,
            )
            .join("")}
        </tbody>
      </table>
      ${logs.length > 200 ? `<p class="text-sm text-muted mt-2">Exibindo 200 de ${logs.length} eventos. Exporte CSV para ver todos.</p>` : ""}
      `
      }
    </div>
  `;
}

// ============================================================
// HELPER
// ============================================================
