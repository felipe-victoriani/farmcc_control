/**
 * @file compliance.js
 * @description Módulo de conformidade regulatória.
 * Checklist dinâmico com dados Firebase + portaria cards + score animado.
 */

import { dbReadAll, dbRead } from "../core/db.js";
import { getSessionProfile } from "../core/auth.js";
import { showToast } from "../shared/notifications.js";
import { icon } from "../shared/icons.js";
import { snapshotToArray, formatDate, escapeHtml } from "../shared/utils.js";

// ============================================================
// RENDER PRINCIPAL
// ============================================================

export async function renderComplianceModule() {
  const main = document.getElementById("app-main");
  if (!main) return;
  main.innerHTML = buildComplianceHTML();
  await runComplianceChecks();
  setupComplianceListeners();
}

function buildComplianceHTML() {
  return `
  <section class="module-section" id="section-compliance">
    <div class="section-header">
      <div>
        <h1 class="section-title">Conformidade Regulatória</h1>
        <p class="section-subtitle">Verificação de conformidade com as legislações farmacêuticas vigentes</p>
      </div>
      <div class="section-actions">
        <button class="btn btn-secondary btn-sm" id="btn-recheck-compliance">
          ${icon("refresh", "icon icon-sm")} Reverificar
        </button>
        <button class="btn btn-secondary btn-sm" id="btn-print-compliance">
          ${icon("print", "icon icon-sm")} Imprimir
        </button>
      </div>
    </div>

    <!-- Score de conformidade -->
    <div class="card mb-4" id="compliance-score-card">
      <div class="card-body">
        <div class="compliance-score-layout">
          <div class="compliance-ring-wrapper">
            <svg class="compliance-ring" viewBox="0 0 120 120" aria-hidden="true">
              <circle class="ring-track" cx="60" cy="60" r="52" fill="none" stroke="var(--color-border)" stroke-width="10"/>
              <circle class="ring-fill" id="compliance-ring-fill" cx="60" cy="60" r="52" fill="none"
                      stroke="var(--color-success)" stroke-width="10"
                      stroke-linecap="round"
                      stroke-dasharray="326.73" stroke-dashoffset="326.73"
                      transform="rotate(-90 60 60)"/>
            </svg>
            <div class="compliance-ring-label">
              <span id="compliance-score-pct" class="compliance-score-num">0%</span>
              <span class="compliance-score-sub">conformidade</span>
            </div>
          </div>
          <div class="compliance-summary">
            <h3 class="compliance-summary-title">Resumo da Verificação</h3>
            <p id="compliance-summary-text" class="text-muted">Carregando...</p>
            <div id="compliance-counters" class="compliance-counters"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Checklist -->
    <div class="card mb-4">
      <div class="card-header">
        <h2 class="card-title">${icon("clipboard", "icon icon-sm")} Itens Verificados</h2>
      </div>
      <div class="card-body p-0">
        <div id="compliance-checklist">
          ${[...Array(8)]
            .map(
              () => `
            <div class="compliance-item">
              <div class="skeleton skeleton-text" style="width:60%"></div>
            </div>
          `,
            )
            .join("")}
        </div>
      </div>
    </div>

    <!-- Portaria cards -->
    <h2 class="section-title-sm mb-3">Legislação Aplicável</h2>
    <div class="portaria-grid" id="portaria-grid">
      ${buildPortariaCards()}
    </div>
  </section>
  `;
}

// ============================================================
// CHECKLIST DINÂMICO
// ============================================================

async function runComplianceChecks() {
  const checks = await buildChecklist();
  renderChecklist(checks);
  animateScore(checks);
}

async function buildChecklist() {
  const checks = [];

  const add = (label, passed, detail, norma) =>
    checks.push({ label, passed, detail, norma });

  try {
    // 1. Medicamentos cadastrados
    const rawMeds = await dbReadAll("medications");
    const meds = snapshotToArray(rawMeds);
    add(
      "Medicamentos cadastrados no sistema",
      meds.length > 0,
      meds.length > 0
        ? `${meds.length} medicamento(s) cadastrado(s).`
        : "Nenhum medicamento encontrado.",
      "Port. 344/98 Art. 30",
    );

    // 2. Medicamentos controlados com lista definida
    const controlados = meds.filter((m) => m.lista && m.lista !== "normal");
    const semLista = meds.filter((m) => !m.lista);
    add(
      "Medicamentos controlados com lista ANVISA definida",
      semLista.length === 0,
      semLista.length === 0
        ? `${controlados.length} controlado(s) com lista definida.`
        : `${semLista.length} medicamento(s) sem lista definida.`,
      "Port. 344/98 Art. 28",
    );

    // 3. Estoque registrado (qtdAtual definida)
    const semEstoque = meds.filter((m) => m.qtdAtual == null);
    add(
      "Estoque atualizado para todos os medicamentos",
      semEstoque.length === 0,
      semEstoque.length === 0
        ? "Todos com estoque registrado."
        : `${semEstoque.length} medicamento(s) sem qtdAtual.`,
      "Port. 344/98 Art. 58",
    );

    // 4. Movimentações nos últimos 30 dias
    const rawMovs = await dbReadAll("movements");
    const movs = snapshotToArray(rawMovs).filter(
      (m) => m.status !== "cancelado",
    );
    const recentes = movs.filter(
      (m) =>
        m.dataHora && Date.now() - new Date(m.dataHora) < 30 * 86400 * 1000,
    );
    add(
      "Movimentações registradas nos últimos 30 dias",
      recentes.length > 0,
      recentes.length > 0
        ? `${recentes.length} movimentação(ões) nos últimos 30 dias.`
        : "Nenhuma movimentação recente.",
      "Port. 344/98 Art. 58",
    );

    // 5. Trilha de auditoria ativa
    const rawAudit = await dbReadAll("audit_log");
    const audits = snapshotToArray(rawAudit);
    add(
      "Trilha de auditoria com registros",
      audits.length > 0,
      audits.length > 0
        ? `${audits.length} evento(s) auditado(s).`
        : "Nenhum registro de auditoria.",
      "LGPD / RDC 204/17",
    );

    // 6. Usuários com perfil configurado
    const rawUsers = await dbReadAll("users");
    const users = snapshotToArray(rawUsers);
    const ativos = users.filter((u) => u.ativo);
    add(
      "Usuários com perfil e papel definidos",
      ativos.length > 0,
      ativos.length > 0
        ? `${ativos.length} usuário(s) ativo(s).`
        : "Nenhum usuário configurado.",
      "RDC 204/17 Art. 12",
    );

    // 7. Farmacêutico RT configurado
    const rt = users.find((u) => u.role === "FARMACEUTICO_RT" && u.ativo);
    add(
      "Farmacêutico Responsável Técnico cadastrado",
      !!rt,
      rt ? `RT: ${rt.nome}` : "Nenhum RT ativo encontrado.",
      "Lei 5.991/73 Art. 15",
    );

    // 8. Configurações institucionais preenchidas
    const settings = (await dbRead("settings", null).catch(() => null)) || {};
    const hasSettings = !!(
      settings.institutionName && settings.responsavelTecnico
    );
    add(
      "Dados institucionais configurados",
      hasSettings,
      hasSettings
        ? "Instituição e RT preenchidos."
        : "Configurações incompletas (nome e RT são obrigatórios).",
      "Port. 2.814/98",
    );

    // 9. Medicamentos vencidos em estoque
    const vencidos = meds.filter((m) => {
      if (!m.validade || m.status !== "ativo") return false;
      return new Date(m.validade) < new Date();
    });
    add(
      "Nenhum medicamento vencido em estoque",
      vencidos.length === 0,
      vencidos.length === 0
        ? "Nenhum medicamento vencido."
        : `${vencidos.length} medicamento(s) VENCIDO(S) em estoque!`,
      "Port. 344/98 Art. 58 §2",
    );

    // 10. Registro de descartes (resíduos)
    const rawRes = await dbReadAll("residues");
    const residues = snapshotToArray(rawRes);
    add(
      "Descartes de resíduos farmacêuticos registrados",
      residues.length > 0,
      residues.length > 0
        ? `${residues.length} descarte(s) registrado(s).`
        : "Nenhum descarte registrado.",
      "RDC 222/2018",
    );

    // 11. MTR presente nos descartes
    const semMTR = residues.filter((r) => !r.numeroMTR);
    add(
      "Todos os descartes com Número MTR",
      semMTR.length === 0,
      semMTR.length === 0
        ? "Todos os descartes possuem MTR."
        : `${semMTR.length} descarte(s) sem MTR.`,
      "RDC 222/2018 Art. 30",
    );

    // 12. Cirurgias registradas para rastreabilidade
    const rawSurgs = await dbReadAll("surgeries");
    const surgs = snapshotToArray(rawSurgs);
    add(
      "Procedimentos cirúrgicos registrados para rastreabilidade",
      surgs.length > 0,
      surgs.length > 0
        ? `${surgs.length} procedimento(s) registrado(s).`
        : "Nenhuma cirurgia registrada.",
      "RDC 204/17 Art. 8",
    );

    // 13. Estoque mínimo respeitado
    const abaixoMinimo = meds.filter(
      (m) => m.qtdMinima != null && (m.qtdAtual ?? 0) < m.qtdMinima,
    );
    add(
      "Estoque acima do mínimo para todos os medicamentos",
      abaixoMinimo.length === 0,
      abaixoMinimo.length === 0
        ? "Todos acima do estoque mínimo."
        : `${abaixoMinimo.length} medicamento(s) abaixo do mínimo.`,
      "Port. 344/98",
    );
  } catch (err) {
    console.error("[compliance] Erro nos checks:", err);
  }

  return checks;
}

function renderChecklist(checks) {
  const container = document.getElementById("compliance-checklist");
  if (!container) return;

  container.innerHTML = checks
    .map(
      (c, i) => `
    <div class="compliance-item ${c.passed ? "compliance-ok" : "compliance-fail"}" style="animation-delay:${i * 40}ms">
      <div class="compliance-item-icon">
        ${c.passed ? icon("checkCircle", "icon icon-sm text-success") : icon("xCircle", "icon icon-sm text-danger")}
      </div>
      <div class="compliance-item-body">
        <div class="compliance-item-label">${escapeHtml(c.label)}</div>
        <div class="compliance-item-detail">${escapeHtml(c.detail)}</div>
      </div>
      <div class="compliance-item-norma">
        <span class="badge badge-neutral badge-sm">${escapeHtml(c.norma)}</span>
      </div>
    </div>
  `,
    )
    .join("");
}

function animateScore(checks) {
  const total = checks.length;
  const passed = checks.filter((c) => c.passed).length;
  const score = total > 0 ? Math.round((passed / total) * 100) : 0;
  const circumf = 326.73; // 2 * π * 52

  // Texto
  const pctEl = document.getElementById("compliance-score-pct");
  if (pctEl) pctEl.textContent = `${score}%`;

  // Cor do arco
  const ring = document.getElementById("compliance-ring-fill");
  if (ring) {
    const color =
      score >= 80
        ? "var(--color-success)"
        : score >= 50
          ? "var(--color-warning)"
          : "var(--color-danger)";
    ring.setAttribute("stroke", color);
    const offset = circumf - (circumf * score) / 100;
    ring.style.strokeDashoffset = offset;
    ring.style.transition = "stroke-dashoffset 1s ease-in-out";
  }

  // Resumo
  const summaryEl = document.getElementById("compliance-summary-text");
  if (summaryEl) {
    if (score >= 90)
      summaryEl.textContent =
        "Excelente! Sistema amplamente conforme com as legislações aplicáveis.";
    else if (score >= 70)
      summaryEl.textContent =
        "Bom nível de conformidade. Revise os itens com falha.";
    else if (score >= 50)
      summaryEl.textContent =
        "Conformidade parcial. Ação corretiva recomendada.";
    else
      summaryEl.textContent =
        "Atenção: vários requisitos regulatórios não foram atendidos.";
  }

  const countersEl = document.getElementById("compliance-counters");
  if (countersEl) {
    const failed = total - passed;
    countersEl.innerHTML = `
      <span class="compliance-counter compliance-counter-ok">${icon("checkCircle", "icon icon-xs")} ${passed} OK</span>
      <span class="compliance-counter compliance-counter-fail">${icon("xCircle", "icon icon-xs")} ${failed} Falha(s)</span>
    `;
  }
}

// ============================================================
// PORTARIA CARDS
// ============================================================

function buildPortariaCards() {
  const portarias = [
    {
      codigo: "Port. 344/98",
      titulo: "Substâncias Sujeitas a Controle Especial",
      orgao: "SVS/MS",
      resumo:
        "Regulamenta o uso, prescrição, dispensação e controle de substâncias psicoativas, entorpecentes e análogas. Define as listas A1, A2, A3, B1, B2, C1, C2, C3.",
      itens: [
        "Listas de substâncias controladas",
        "Escrituração obrigatória",
        "Notificações de receita",
        "Balanço mensal Art. 58",
      ],
      cor: "#EF4444",
    },
    {
      codigo: "RDC 222/2018",
      titulo: "Gerenciamento de Resíduos de Serviços de Saúde",
      orgao: "ANVISA",
      resumo:
        "Regulamenta as Boas Práticas de Gerenciamento dos Resíduos de Serviços de Saúde. Define a classificação em grupos A–E e o Manifesto de Transporte (MTR).",
      itens: [
        "Classificação grupos A–E",
        "Segregação e acondicionamento",
        "MTR obrigatório",
        "Licença IBAMA",
      ],
      cor: "#F59E0B",
    },
    {
      codigo: "Port. 2.814/98",
      titulo: "Assistência Farmacêutica Hospitalar",
      orgao: "MS",
      resumo:
        "Define normas para a assistência farmacêutica em hospitais e estabelecimentos de saúde, incluindo organização do serviço e responsabilidade técnica.",
      itens: [
        "Responsável Técnico obrigatório",
        "Organização do serviço",
        "Dispensação hospitalar",
      ],
      cor: "#3B82F6",
    },
    {
      codigo: "RDC 306/04",
      titulo: "Resíduos de Serviços de Saúde (revogada parcialmente)",
      orgao: "ANVISA",
      resumo:
        "Resolução precursora da RDC 222/2018. Parcialmente vigente para unidades que ainda referenciam procedimentos específicos.",
      itens: [
        "Gerenciamento de RSS",
        "Plano de Gerenciamento",
        "Tratamento e disposição final",
      ],
      cor: "#8B5CF6",
    },
    {
      codigo: "Lei 11.343/06",
      titulo: "Lei de Drogas",
      orgao: "Brasil",
      resumo:
        "Institui o Sistema Nacional de Políticas Públicas sobre Drogas (SISNAD). Define procedimentos de prevenção e repressão ao tráfico ilícito e uso indevido.",
      itens: [
        "Controle de entorpecentes",
        "Comunicação de irregularidades",
        "Penalidades",
      ],
      cor: "#DC2626",
    },
    {
      codigo: "RDC 204/17",
      titulo: "Farmácia Hospitalar em Serviços de Saúde",
      orgao: "ANVISA",
      resumo:
        "Define os requisitos de Boas Práticas de Farmácia para serviços hospitalares e clínicos, incluindo rastreabilidade e controle de acesso.",
      itens: [
        "Boas Práticas de Farmácia",
        "Rastreabilidade",
        "Acesso restrito a controlados",
        "Registros e documentação",
      ],
      cor: "#059669",
    },
    {
      codigo: "Port. 344/98 Art. 58",
      titulo: "Balanço Mensal de Controlados",
      orgao: "SVS/MS",
      resumo:
        "Artigo específico que exige o balancete mensal de entradas, saídas e saldo de todas as substâncias das listas A e B, mantido por 5 anos.",
      itens: [
        "Balancete mensal",
        "Conservação por 5 anos",
        "Assinatura do RT",
        "Disponível para fiscalização",
      ],
      cor: "#EF4444",
    },
    {
      codigo: "CONAMA 358/05",
      titulo: "Tratamento de Resíduos de Saúde",
      orgao: "CONAMA",
      resumo:
        "Dispõe sobre o tratamento e a disposição final dos resíduos dos serviços de saúde, complementando as normas ANVISA para questões ambientais.",
      itens: [
        "Disposição final adequada",
        "Aterro sanitário licenciado",
        "Relatório ambiental",
      ],
      cor: "#10B981",
    },
  ];

  return portarias
    .map(
      (p) => `
    <div class="portaria-card" style="border-top-color: ${p.cor}">
      <div class="portaria-card-header">
        <span class="portaria-codigo" style="color: ${p.cor}">${escapeHtml(p.codigo)}</span>
        <span class="portaria-orgao">${escapeHtml(p.orgao)}</span>
      </div>
      <h3 class="portaria-titulo">${escapeHtml(p.titulo)}</h3>
      <p class="portaria-resumo">${escapeHtml(p.resumo)}</p>
      <ul class="portaria-itens">
        ${p.itens.map((item) => `<li>${icon("checkCircle", "icon icon-xs text-success")} ${escapeHtml(item)}</li>`).join("")}
      </ul>
    </div>
  `,
    )
    .join("");
}

// ============================================================
// LISTENERS
// ============================================================

function setupComplianceListeners() {
  document
    .getElementById("btn-recheck-compliance")
    ?.addEventListener("click", async () => {
      showToast("info", "Reverificando...", "Aguarde.");
      await runComplianceChecks();
    });

  document
    .getElementById("btn-print-compliance")
    ?.addEventListener("click", () => {
      window.print();
    });
}

// ============================================================
// HELPERS
// ============================================================
