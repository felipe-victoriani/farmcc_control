/**
 * @file medications.js
 * @description Módulo completo de gestão de medicamentos e estoque.
 * CRUD, filtros, exportação CSV, histórico de movimentações, badges Portaria 344/98.
 */

import {
  dbReadAll,
  dbRead,
  dbCreate,
  dbUpdate,
  dbDelete,
  dbListen,
  dbUnlisten,
} from "../core/db.js";
import { auditLog } from "../core/db.js";
import { getSessionProfile } from "../core/auth.js";
import { showToast } from "../shared/notifications.js";
import { icon } from "../shared/icons.js";
import {
  formatDate,
  formatDateTime,
  snapshotToArray,
  sortBy,
  searchMatch,
  badgeClassLista,
  isControlado,
  classificarValidade,
  textoDiasRestantes,
  diasRestantes,
  classificarEstoque,
  percentualEstoque,
  exportCSV,
  labelTipoMovimento,
  formatNumber,
  debounce,
  generateId,
} from "../shared/utils.js";

// ============================================================
// RENDER PRINCIPAL DO MÓDULO
// ============================================================

/**
 * Renderiza o módulo de medicamentos no container #app-main.
 * @param {string} [filterLista=''] - Filtro inicial de lista (vindo de rota)
 */
export async function renderMedicationsModule(filterLista = "") {
  const main = document.getElementById("app-main");
  if (!main) return;

  // Guardar o filtro inicial da rota
  initialRouteFilter = filterLista;

  main.innerHTML = buildMedicationsHTML();
  await loadMedications({ lista: filterLista });
  setupMedicationsListeners();
}

function buildMedicationsHTML() {
  const profile = getSessionProfile();
  const canCreate =
    profile &&
    [
      "ADMIN",
      "FARMACEUTICO_RT",
      "FARMACEUTICO",
      "TECNICO_FARMACIA",
      "ENFERMEIRO_RT",
    ].includes(profile.role);

  return `
  <section class="module-section" id="section-medications">
    <div class="section-header">
      <div>
        <h1 class="section-title">Estoque de Medicamentos</h1>
        <p class="section-subtitle">Controle conforme Portaria SVS/MS n° 344/98</p>
      </div>
      <div class="section-actions">
        <button class="btn btn-secondary btn-sm" id="btn-export-meds">
          ${icon("download", "icon icon-sm")} Exportar CSV
        </button>
        ${
          canCreate
            ? `<button class="btn btn-primary btn-sm" id="btn-new-med">
          ${icon("plus", "icon icon-sm")} Novo Medicamento
        </button>`
            : ""
        }
      </div>
    </div>

    <!-- KPIs -->
    <div class="kpi-grid" id="meds-kpi-grid">
      <div class="kpi-card skeleton-card"><div class="skeleton skeleton-text"></div></div>
      <div class="kpi-card skeleton-card"><div class="skeleton skeleton-text"></div></div>
      <div class="kpi-card skeleton-card"><div class="skeleton skeleton-text"></div></div>
      <div class="kpi-card skeleton-card"><div class="skeleton skeleton-text"></div></div>
    </div>

    <!-- Filtros -->
    <div class="filter-bar" id="meds-filter-bar">
      <div class="filter-search">
        <label for="med-search" class="sr-only">Buscar medicamento</label>
        ${icon("search", "icon icon-sm filter-search-icon")}
        <input type="search" id="med-search" class="form-input" placeholder="Buscar por nome, DCB, lote...">
      </div>
      <div class="filter-group">
        <select id="filter-lista" class="form-select">
          <option value="">Todas as Listas</option>
          <option value="controlado">Todos os Controlados</option>
          <option value="validade">Validades Próximas (≤90d)</option>
          <option value="A1">Lista A1 (Entorpecentes)</option>
          <option value="A2">Lista A2 (Entorpecentes Veterinários)</option>
          <option value="B1">Lista B1 (Psicotrópicos)</option>
          <option value="B2">Lista B2 (Psicotrópicos Veterinários)</option>
          <option value="C1">Lista C1 (Outras Substâncias)</option>
          <option value="C2">Lista C2 (Retinóicas)</option>
          <option value="C3">Lista C3 (Imunossupressores)</option>
          <option value="normal">Não Controlado</option>
        </select>
        <select id="filter-status" class="form-select">
          <option value="">Todos os Status</option>
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
        </select>
        <select id="filter-categoria" class="form-select">
          <option value="">Todas as Categorias</option>
          <option value="analgesico">Analgésico</option>
          <option value="anestesico">Anestésico</option>
          <option value="bloqueador_nm">Bloqueador Neuromuscular</option>
          <option value="sedativo">Sedativo</option>
          <option value="antiemetico">Antiemético</option>
          <option value="antibiotico">Antibiótico</option>
          <option value="corticoide">Corticoide</option>
          <option value="outro">Outro</option>
        </select>
        <select id="filter-estoque" class="form-select">
          <option value="">Qualquer Estoque</option>
          <option value="critical">Sem Estoque</option>
          <option value="low">Abaixo do Mínimo</option>
          <option value="ok">Adequado</option>
        </select>
        <button class="btn btn-ghost btn-sm" id="btn-clear-filters">
          ${icon("xClose", "icon icon-sm")} Limpar
        </button>
      </div>
    </div>

    <!-- Tabela -->
    <div class="card">
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="data-table" id="meds-table">
            <thead>
              <tr>
                <th>Medicamento</th>
                <th>Lista</th>
                <th>Estoque Atual</th>
                <th>Unidade</th>
                <th>Validade</th>
                <th>Categoria</th>
                <th>Status</th>
                <th class="text-right">Ações</th>
              </tr>
            </thead>
            <tbody id="meds-tbody">
              <tr><td colspan="8"><div class="skeleton skeleton-text"></div></td></tr>
            </tbody>
          </table>
        </div>
        <div id="meds-pagination" class="pagination-wrapper"></div>
      </div>
    </div>
  </section>

  <!-- Modal Medicamento -->
  <dialog id="modal-medication" class="modal" aria-modal="true" aria-labelledby="modal-med-title">
    <div class="modal-content modal-lg">
      <div class="modal-header">
        <h2 class="modal-title" id="modal-med-title">Novo Medicamento</h2>
        <button class="btn btn-icon modal-close-btn" aria-label="Fechar">
          ${icon("xClose", "icon icon-sm")}
        </button>
      </div>
      <form id="form-medication" novalidate>
        <div class="modal-body">
          <div class="form-grid form-grid-2">
            <div class="form-group form-col-2">
              <label class="form-label" for="med-nome">Nome do Medicamento <span class="required">*</span></label>
              <input type="text" id="med-nome" name="nome" class="form-input" required maxlength="200" placeholder="Ex: Fentanila Citrato">
              <span class="form-error" id="err-med-nome"></span>
            </div>
            <div class="form-group">
              <label class="form-label" for="med-dcb">DCB/DCI</label>
              <input type="text" id="med-dcb" name="dcb" class="form-input" maxlength="200" placeholder="Denominação Comum Brasileira">
            </div>
            <div class="form-group">
              <label class="form-label" for="med-lista">Lista (Portaria 344/98) <span class="required">*</span></label>
              <select id="med-lista" name="lista" class="form-select" required>
                <option value="">Selecione...</option>
                <option value="A1">A1 — Entorpecentes</option>
                <option value="A2">A2 — Entorpecentes Veterinários</option>
                <option value="B1">B1 — Psicotrópicos</option>
                <option value="B2">B2 — Psicotrópicos Veterinários</option>
                <option value="C1">C1 — Outras Substâncias</option>
                <option value="C2">C2 — Retinóicas</option>
                <option value="C3">C3 — Imunossupressores</option>
                <option value="normal">Não Controlado</option>
              </select>
              <span class="form-error" id="err-med-lista"></span>
            </div>
            <div class="form-group">
              <label class="form-label" for="med-categoria">Categoria <span class="required">*</span></label>
              <select id="med-categoria" name="categoria" class="form-select" required>
                <option value="">Selecione...</option>
                <option value="analgesico">Analgésico</option>
                <option value="anestesico">Anestésico</option>
                <option value="bloqueador_nm">Bloqueador Neuromuscular</option>
                <option value="sedativo">Sedativo</option>
                <option value="antiemetico">Antiemético</option>
                <option value="antibiotico">Antibiótico</option>
                <option value="corticoide">Corticoide</option>
                <option value="outro">Outro</option>
              </select>
              <span class="form-error" id="err-med-categoria"></span>
            </div>
            <div class="form-group">
              <label class="form-label" for="med-concentracao">Concentração</label>
              <input type="text" id="med-concentracao" name="concentracao" class="form-input" maxlength="50" placeholder="Ex: 0,05 mg/mL">
            </div>
            <div class="form-group">
              <label class="form-label" for="med-apresentacao">Apresentação</label>
              <input type="text" id="med-apresentacao" name="apresentacao" class="form-input" maxlength="100" placeholder="Ex: Ampola 10mL">
            </div>
            <div class="form-group">
              <label class="form-label" for="med-lote">Lote</label>
              <input type="text" id="med-lote" name="lote" class="form-input" maxlength="50">
            </div>
            <div class="form-group">
              <label class="form-label" for="med-fabricante">Fabricante/Fornecedor</label>
              <input type="text" id="med-fabricante" name="fabricante" class="form-input" maxlength="100">
            </div>
            <div class="form-group">
              <label class="form-label" for="med-validade">Validade</label>
              <input type="date" id="med-validade" name="validade" class="form-input">
            </div>
            <div class="form-group">
              <label class="form-label" for="med-unidade">Unidade <span class="required">*</span></label>
              <select id="med-unidade" name="unidade" class="form-select" required>
                <option value="">Selecione...</option>
                <option value="ampola">Ampola</option>
                <option value="frasco">Frasco</option>
                <option value="comprimido">Comprimido</option>
                <option value="capsula">Cápsula</option>
                <option value="bisnaga">Bisnaga</option>
                <option value="seringa">Seringa Preenchida</option>
                <option value="unidade">Unidade</option>
                <option value="ml">mL</option>
                <option value="mg">mg</option>
                <option value="g">g</option>
              </select>
              <span class="form-error" id="err-med-unidade"></span>
            </div>
            <div class="form-group">
              <label class="form-label" for="med-qtd-atual">Qtd. Atual <span class="required">*</span></label>
              <input type="number" id="med-qtd-atual" name="qtdAtual" class="form-input" required min="0" step="1" value="0">
              <span class="form-error" id="err-med-qtd-atual"></span>
            </div>
            <div class="form-group">
              <label class="form-label" for="med-qtd-minima">Qtd. Mínima (alerta)</label>
              <input type="number" id="med-qtd-minima" name="qtdMinima" class="form-input" min="0" step="1" value="5">
            </div>
            <div class="form-group">
              <label class="form-label" for="med-qtd-maxima">Qtd. Máxima</label>
              <input type="number" id="med-qtd-maxima" name="qtdMaxima" class="form-input" min="0" step="1" value="100">
            </div>
            <div class="form-group">
              <label class="form-label" for="med-registro-anvisa">Registro ANVISA</label>
              <input type="text" id="med-registro-anvisa" name="registroAnvisa" class="form-input" maxlength="20" placeholder="Ex: 1234567890001">
            </div>
            <div class="form-group form-col-2">
              <label class="form-label" for="med-obs">Observações / Armazenamento</label>
              <textarea id="med-obs" name="observacoes" class="form-input form-textarea" rows="3" maxlength="500" placeholder="Condições de armazenamento, restrições, etc."></textarea>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary modal-cancel">Cancelar</button>
          <button type="submit" class="btn btn-primary" id="btn-save-med">
            ${icon("check", "icon icon-sm")} Salvar Medicamento
          </button>
        </div>
      </form>
    </div>
  </dialog>

  <!-- Painel Lateral: Histórico -->
  <div id="side-panel-history" class="side-panel" role="complementary" aria-label="Histórico de movimentações">
    <div class="side-panel-header">
      <h3 class="side-panel-title">Histórico de Movimentações</h3>
      <button class="btn btn-icon" id="close-side-panel" aria-label="Fechar painel">
        ${icon("xClose", "icon icon-sm")}
      </button>
    </div>
    <div id="side-panel-content" class="side-panel-body"></div>
  </div>
  <div id="side-panel-overlay" class="side-panel-overlay hidden"></div>
  `;
}

// ============================================================
// CARREGAMENTO E RENDERIZAÇÃO DA TABELA
// ============================================================

/** Cache de medicamentos carregados */
let medsCache = [];

/** Filtro inicial da rota (ex: 'controlado' quando acessa /controlados) */
let initialRouteFilter = "";

/**
 * Carrega e renderiza a lista de medicamentos com filtros aplicados.
 * @param {Object} [filters={}]
 */
export async function loadMedications(filters = {}) {
  renderKPIs([]);
  const raw = await dbReadAll("medications");
  const all = snapshotToArray(raw);
  medsCache = all;
  renderKPIs(all);
  applyAndRenderFilters(filters);
}

function applyAndRenderFilters(filters = {}) {
  // Atualizar os campos de filtro se forem passados via parâmetro (ANTES de ler)
  if (filters.lista !== undefined && document.getElementById("filter-lista")) {
    document.getElementById("filter-lista").value = filters.lista;
  }

  const search = (
    document.getElementById("med-search")?.value ||
    filters.search ||
    ""
  ).trim();
  const lista =
    document.getElementById("filter-lista")?.value || filters.lista || "";
  const status =
    document.getElementById("filter-status")?.value || filters.status || "";
  const categoria =
    document.getElementById("filter-categoria")?.value ||
    filters.categoria ||
    "";
  const estoque =
    document.getElementById("filter-estoque")?.value || filters.estoque || "";

  let filtered = medsCache.filter((med) => {
    if (
      search &&
      !searchMatch(med.nome, search) &&
      !searchMatch(med.dcb, search) &&
      !searchMatch(med.lote, search)
    )
      return false;

    // Tratamento especial para filtros de rota
    if (lista) {
      if (lista === "controlado") {
        // Filtrar apenas medicamentos controlados (Port. 344/98)
        const medLista = med.lista || "normal";
        if (!isControlado(medLista)) return false;
      } else if (lista === "validade") {
        // Filtrar apenas medicamentos com validade próxima ou vencidos (90 dias ou menos)
        if (!med.validade) return false;
        const dias = diasRestantes(med.validade);
        if (dias > 90) return false;
      } else {
        // Filtrar por lista específica
        const medLista = med.lista || "normal";
        if (medLista !== lista) return false;
      }
    }

    if (status && med.status !== status) return false;
    if (categoria && med.categoria !== categoria) return false;
    if (estoque) {
      const cls = classificarEstoque(med.qtdAtual ?? 0, med.qtdMinima ?? 0);
      if (cls !== estoque) return false;
    }
    return true;
  });

  filtered = sortBy(filtered, "nome");
  renderMedsTable(filtered);
}

function renderMedsTable(meds) {
  const tbody = document.getElementById("meds-tbody");
  if (!tbody) return;

  if (!meds.length) {
    tbody.innerHTML = `
      <tr><td colspan="8">
        <div class="empty-state">
          ${icon("inbox", "icon icon-xl")}
          <p class="empty-state-title">Nenhum medicamento encontrado</p>
          <p class="empty-state-desc">Ajuste os filtros ou cadastre um novo medicamento.</p>
        </div>
      </td></tr>`;
    return;
  }

  const profile = getSessionProfile();
  const canEdit =
    profile &&
    ["ADMIN", "FARMACEUTICO_RT", "FARMACEUTICO"].includes(profile.role);
  const canDelete =
    profile && ["ADMIN", "FARMACEUTICO_RT"].includes(profile.role);

  tbody.innerHTML = meds
    .map((med) => {
      const validadeStatus = classificarValidade(med.validade);
      const diasVal = diasRestantes(med.validade);
      const validadeLabel = med.validade ? formatDate(med.validade) : "—";
      const validadeClass = {
        expired: "text-danger fw-600",
        urgent: "text-warning fw-600",
        warning: "text-warning",
        ok: "",
      }[validadeStatus];

      const estoqueStatus = classificarEstoque(
        med.qtdAtual ?? 0,
        med.qtdMinima ?? 0,
      );
      const pct = percentualEstoque(med.qtdAtual ?? 0, med.qtdMaxima ?? 100);
      const barClass =
        estoqueStatus === "critical"
          ? "critical"
          : estoqueStatus === "low"
            ? "low"
            : "ok";

      const rowClass =
        validadeStatus === "expired" || estoqueStatus === "critical"
          ? "row-critical"
          : "";

      return `<tr class="${rowClass}" data-med-id="${med.id}">
      <td>
        <div class="cell-primary">${escapeHtml(med.nome)}</div>
        ${med.dcb ? `<div class="cell-secondary">${escapeHtml(med.dcb)}</div>` : ""}
        ${med.concentracao ? `<div class="cell-secondary">${escapeHtml(med.concentracao)}</div>` : ""}
      </td>
      <td><span class="badge ${badgeClassLista(med.lista)}">${med.lista || "—"}</span></td>
      <td>
        <div class="cell-primary">${formatNumber(med.qtdAtual ?? 0)}</div>
        <div class="progress-bar-mini">
          <div class="progress-bar-fill ${barClass}" style="width:${pct}%"></div>
        </div>
        <div class="cell-secondary">mín: ${formatNumber(med.qtdMinima ?? 0)}</div>
      </td>
      <td>${escapeHtml(med.unidade || "—")}</td>
      <td class="${validadeClass}">
        <div>${validadeLabel}</div>
        ${med.validade ? `<div class="cell-secondary">${textoDiasRestantes(diasVal)}</div>` : ""}
      </td>
      <td>${escapeHtml(labelCategoria(med.categoria))}</td>
      <td>
        <span class="badge ${med.status === "ativo" ? "badge-success" : "badge-neutral"}">
          ${med.status === "ativo" ? "Ativo" : "Inativo"}
        </span>
      </td>
      <td class="text-right">
        <div class="action-group">
          <button class="btn btn-icon btn-ghost" data-action="history" data-id="${med.id}" title="Histórico">
            ${icon("clock", "icon icon-sm")}
          </button>
          ${
            canEdit
              ? `<button class="btn btn-icon btn-ghost" data-action="edit" data-id="${med.id}" title="Editar">
            ${icon("edit", "icon icon-sm")}
          </button>`
              : ""
          }
          ${
            canDelete
              ? `<button class="btn btn-icon btn-ghost btn-danger-ghost" data-action="delete" data-id="${med.id}" title="Excluir">
            ${icon("trash2", "icon icon-sm")}
          </button>`
              : ""
          }
        </div>
      </td>
    </tr>`;
    })
    .join("");
}

function renderKPIs(meds) {
  const grid = document.getElementById("meds-kpi-grid");
  if (!grid) return;

  const total = meds.length;
  const ativos = meds.filter((m) => m.status === "ativo").length;
  const semEstoque = meds.filter((m) => (m.qtdAtual ?? 0) <= 0).length;
  const vencendo = meds.filter((m) => {
    const d = diasRestantes(m.validade);
    return d >= 0 && d <= 30;
  }).length;
  const vencidos = meds.filter((m) => diasRestantes(m.validade) < 0).length;

  grid.innerHTML = `
    <div class="kpi-card">
      <div class="kpi-icon kpi-icon-blue">${icon("package", "icon icon-md")}</div>
      <div class="kpi-body">
        <p class="kpi-label">Total de Itens</p>
        <p class="kpi-value">${total}</p>
        <p class="kpi-sub">${ativos} ativos</p>
      </div>
    </div>
    <div class="kpi-card ${semEstoque > 0 ? "kpi-card-danger" : ""}">
      <div class="kpi-icon kpi-icon-red">${icon("alert", "icon icon-md")}</div>
      <div class="kpi-body">
        <p class="kpi-label">Sem Estoque</p>
        <p class="kpi-value">${semEstoque}</p>
        <p class="kpi-sub">itens críticos</p>
      </div>
    </div>
    <div class="kpi-card ${vencendo > 0 ? "kpi-card-warning" : ""}">
      <div class="kpi-icon kpi-icon-yellow">${icon("expiry", "icon icon-md")}</div>
      <div class="kpi-body">
        <p class="kpi-label">Vencendo em 30d</p>
        <p class="kpi-value">${vencendo}</p>
        <p class="kpi-sub">${vencidos} já vencidos</p>
      </div>
    </div>
    <div class="kpi-card">
      <div class="kpi-icon kpi-icon-purple">${icon("shield", "icon icon-md")}</div>
      <div class="kpi-body">
        <p class="kpi-label">Controlados</p>
        <p class="kpi-value">${meds.filter((m) => isControlado(m.lista)).length}</p>
        <p class="kpi-sub">Port. 344/98</p>
      </div>
    </div>
  `;
}

// ============================================================
// MODAL: NOVO / EDITAR MEDICAMENTO
// ============================================================

export function openNewMedicationModal() {
  const modal = document.getElementById("modal-medication");
  if (!modal) return;
  document.getElementById("modal-med-title").textContent = "Novo Medicamento";
  document.getElementById("form-medication").reset();
  document.getElementById("form-medication").removeAttribute("data-edit-id");
  modal.showModal();
}

export async function openEditMedicationModal(medId) {
  const med = await dbRead("medications", medId);
  if (!med) {
    showToast("error", "Erro", "Medicamento não encontrado.");
    return;
  }

  const modal = document.getElementById("modal-medication");
  document.getElementById("modal-med-title").textContent = "Editar Medicamento";
  const form = document.getElementById("form-medication");
  form.setAttribute("data-edit-id", medId);

  // Preencher campos
  const fields = [
    "nome",
    "dcb",
    "lista",
    "categoria",
    "concentracao",
    "apresentacao",
    "lote",
    "fabricante",
    "validade",
    "unidade",
    "qtdAtual",
    "qtdMinima",
    "qtdMaxima",
    "registroAnvisa",
    "observacoes",
  ];
  fields.forEach((f) => {
    const el = form.querySelector(`[name="${f}"]`);
    if (el) el.value = med[f] ?? "";
  });

  modal.showModal();
}

async function saveMedication(formData, editId = null) {
  const profile = getSessionProfile();
  if (!profile) return;

  // Validação básica
  const errors = validateMedForm(formData);
  if (errors.length) {
    errors.forEach((e) => {
      const el = document.getElementById(`err-med-${e.field}`);
      if (el) el.textContent = e.msg;
    });
    return;
  }

  const btn = document.getElementById("btn-save-med");
  btn.disabled = true;
  btn.innerHTML = `${icon("loading", "icon icon-sm")} Salvando...`;

  try {
    const data = {
      nome: formData.get("nome")?.trim(),
      dcb: formData.get("dcb")?.trim() || "",
      lista: formData.get("lista") || "normal", // Garantir valor padrão
      categoria: formData.get("categoria"),
      concentracao: formData.get("concentracao")?.trim() || "",
      apresentacao: formData.get("apresentacao")?.trim() || "",
      lote: formData.get("lote")?.trim() || "",
      fabricante: formData.get("fabricante")?.trim() || "",
      validade: formData.get("validade") || "",
      unidade: formData.get("unidade"),
      qtdAtual: parseInt(formData.get("qtdAtual"), 10) || 0,
      qtdMinima: parseInt(formData.get("qtdMinima"), 10) || 0,
      qtdMaxima: parseInt(formData.get("qtdMaxima"), 10) || 100,
      registroAnvisa: formData.get("registroAnvisa")?.trim() || "",
      observacoes: formData.get("observacoes")?.trim() || "",
      status: "ativo",
    };

    if (editId) {
      await dbUpdate("medications", editId, data);
      await auditLog({
        uid: profile.uid || "",
        userName: profile.nome,
        action: "UPDATE_MEDICATION",
        module: "medications",
        recordId: editId,
        details: `Medicamento editado: ${data.nome}`,
      });
      showToast("success", "Medicamento atualizado!", data.nome);
    } else {
      const newId = await dbCreate("medications", data);
      await auditLog({
        uid: profile.uid || "",
        userName: profile.nome,
        action: "CREATE_MEDICATION",
        module: "medications",
        recordId: newId,
        details: `Medicamento criado: ${data.nome}`,
      });
      showToast("success", "Medicamento cadastrado!", data.nome);
    }

    document.getElementById("modal-medication").close();
    // Reaplicar os filtros atuais após salvar
    await loadMedications({
      lista: document.getElementById("filter-lista")?.value || "",
      search: document.getElementById("med-search")?.value || "",
      status: document.getElementById("filter-status")?.value || "",
      categoria: document.getElementById("filter-categoria")?.value || "",
      estoque: document.getElementById("filter-estoque")?.value || "",
    });
  } catch (err) {
    showToast("error", "Erro ao salvar", err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = `${icon("check", "icon icon-sm")} Salvar Medicamento`;
  }
}

function validateMedForm(formData) {
  const errors = [];
  if (!formData.get("nome")?.trim())
    errors.push({ field: "nome", msg: "Nome é obrigatório." });
  if (!formData.get("lista"))
    errors.push({ field: "lista", msg: "Selecione a lista." });
  if (!formData.get("categoria"))
    errors.push({ field: "categoria", msg: "Selecione a categoria." });
  if (!formData.get("unidade"))
    errors.push({ field: "unidade", msg: "Selecione a unidade." });
  if (parseInt(formData.get("qtdAtual"), 10) < 0)
    errors.push({ field: "qtd-atual", msg: "Quantidade inválida." });

  // Lote e validade obrigatórios para controlados A e B (Port. 344/98)
  const listasControladas = ["A1", "A2", "A3", "B1", "B2"];
  const lista = formData.get("lista");
  if (listasControladas.includes(lista)) {
    if (!formData.get("lote")?.trim())
      errors.push({
        field: "lote",
        msg: "Lote obrigatório para controlados A/B (Port. 344/98).",
      });
    if (!formData.get("validade"))
      errors.push({
        field: "validade",
        msg: "Validade obrigatória para controlados A/B.",
      });
  }

  return errors;
}

// ============================================================
// EXCLUIR MEDICAMENTO
// ============================================================

export async function deleteMedication(medId) {
  const profile = getSessionProfile();
  if (!profile || !["ADMIN", "FARMACEUTICO_RT"].includes(profile.role)) {
    showToast(
      "error",
      "Sem permissão",
      "Apenas o Administrador ou Farmacêutico RT podem excluir medicamentos.",
    );
    return;
  }

  const med = await dbRead("medications", medId);
  if (!med) return;

  const confirmado = window.confirm(
    `Confirma a exclusão de "${med.nome}"?\n\nATENÇÃO: Esta ação é irreversível. Todo o histórico ficará órfão.`,
  );
  if (!confirmado) return;

  try {
    await dbDelete("medications", medId);
    await auditLog({
      uid: profile.uid || "",
      userName: profile.nome,
      action: "DELETE_MEDICATION",
      module: "medications",
      recordId: medId,
      details: `Medicamento excluído: ${med.nome}`,
    });
    showToast("success", "Medicamento excluído.", med.nome);
    // Reaplicar os filtros atuais após excluir
    await loadMedications({
      lista: document.getElementById("filter-lista")?.value || "",
      search: document.getElementById("med-search")?.value || "",
      status: document.getElementById("filter-status")?.value || "",
      categoria: document.getElementById("filter-categoria")?.value || "",
      estoque: document.getElementById("filter-estoque")?.value || "",
    });
  } catch (err) {
    showToast("error", "Erro ao excluir", err.message);
  }
}

// ============================================================
// PAINEL LATERAL: HISTÓRICO
// ============================================================

export async function openMedicationHistory(medId) {
  const panel = document.getElementById("side-panel-history");
  const overlay = document.getElementById("side-panel-overlay");
  const content = document.getElementById("side-panel-content");

  if (!panel || !content) return;

  content.innerHTML = `<div class="skeleton skeleton-text mb-2"></div><div class="skeleton skeleton-text mb-2"></div>`;
  panel.classList.add("open");
  overlay?.classList.remove("hidden");

  try {
    const med = await dbRead("medications", medId);
    const raw = await dbReadAll("movements");
    const allMovs = snapshotToArray(raw);
    const movs = allMovs
      .filter((m) => m.medicamentoId === medId && m.status !== "cancelado")
      .sort((a, b) => (b.dataHora || 0) - (a.dataHora || 0))
      .slice(0, 50);

    content.innerHTML = `
      <div class="mb-3">
        <h4 class="fw-600">${escapeHtml(med?.nome || medId)}</h4>
        <p class="text-sm text-muted">Estoque atual: <strong>${formatNumber(med?.qtdAtual ?? 0)}</strong> ${escapeHtml(med?.unidade || "")}</p>
      </div>
      ${movs.length === 0 ? '<p class="text-sm text-muted">Nenhuma movimentação registrada.</p>' : ""}
      <div class="timeline">
        ${movs
          .map(
            (mov) => `
          <div class="timeline-item timeline-${mov.tipo}">
            <div class="timeline-marker"></div>
            <div class="timeline-content">
              <p class="timeline-title">${labelTipoMovimento(mov.tipo)} — ${formatNumber(mov.quantidade)} ${escapeHtml(med?.unidade || "")}</p>
              <p class="timeline-sub">${formatDateTime(mov.dataHora)}</p>
              ${mov.protocolo ? `<p class="timeline-sub">Protocolo: ${escapeHtml(mov.protocolo)}</p>` : ""}
              ${mov.pacienteNome ? `<p class="timeline-sub">Paciente: ${escapeHtml(mov.pacienteNome)}</p>` : ""}
              ${mov.registradoPorNome ? `<p class="timeline-sub">Por: ${escapeHtml(mov.registradoPorNome)}</p>` : ""}
              ${mov.justificativa ? `<p class="timeline-sub text-muted">${escapeHtml(mov.justificativa)}</p>` : ""}
            </div>
          </div>
        `,
          )
          .join("")}
      </div>
    `;
  } catch (err) {
    content.innerHTML = `<p class="text-danger">Erro ao carregar histórico: ${escapeHtml(err.message)}</p>`;
  }
}

function closeHistoryPanel() {
  document.getElementById("side-panel-history")?.classList.remove("open");
  document.getElementById("side-panel-overlay")?.classList.add("hidden");
}

// ============================================================
// EXPORTAÇÃO CSV
// ============================================================

export function exportMedicationsCSV() {
  const data = medsCache.map((med) => ({
    Nome: med.nome,
    "DCB/DCI": med.dcb || "",
    Lista: med.lista,
    Categoria: labelCategoria(med.categoria),
    Concentração: med.concentracao || "",
    Apresentação: med.apresentacao || "",
    Lote: med.lote || "",
    Fabricante: med.fabricante || "",
    Validade: med.validade ? formatDate(med.validade) : "",
    Unidade: med.unidade,
    "Qtd. Atual": med.qtdAtual ?? 0,
    "Qtd. Mínima": med.qtdMinima ?? 0,
    "Qtd. Máxima": med.qtdMaxima ?? 0,
    "Reg. ANVISA": med.registroAnvisa || "",
    Status: med.status,
  }));
  exportCSV(data, "estoque_medicamentos");
  showToast("success", "CSV exportado!", `${data.length} itens exportados.`);
}

// ============================================================
// EVENT LISTENERS
// ============================================================

function setupMedicationsListeners() {
  // Botão novo medicamento
  document
    .getElementById("btn-new-med")
    ?.addEventListener("click", openNewMedicationModal);

  // Exportar CSV
  document
    .getElementById("btn-export-meds")
    ?.addEventListener("click", exportMedicationsCSV);

  // Formulário de salvar
  document
    .getElementById("form-medication")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      // Limpar erros anteriores
      document
        .querySelectorAll(".form-error")
        .forEach((el) => (el.textContent = ""));
      const form = e.target;
      const editId = form.getAttribute("data-edit-id") || null;
      await saveMedication(new FormData(form), editId);
    });

  // Botão cancelar no modal
  document
    .querySelectorAll(".modal-cancel, .modal-close-btn")
    .forEach((btn) => {
      btn.addEventListener("click", () => {
        document.getElementById("modal-medication")?.close();
      });
    });

  // Fechar painel lateral
  document
    .getElementById("close-side-panel")
    ?.addEventListener("click", closeHistoryPanel);
  document
    .getElementById("side-panel-overlay")
    ?.addEventListener("click", closeHistoryPanel);

  // Ações na tabela (delegação de eventos)
  document
    .getElementById("meds-tbody")
    ?.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const { action, id } = btn.dataset;
      if (action === "edit") await openEditMedicationModal(id);
      if (action === "delete") await deleteMedication(id);
      if (action === "history") await openMedicationHistory(id);
    });

  // Filtros com debounce
  const debouncedFilter = debounce(() => applyAndRenderFilters(), 300);
  document
    .getElementById("med-search")
    ?.addEventListener("input", debouncedFilter);
  document
    .getElementById("filter-lista")
    ?.addEventListener("change", () => applyAndRenderFilters());
  document
    .getElementById("filter-status")
    ?.addEventListener("change", () => applyAndRenderFilters());
  document
    .getElementById("filter-categoria")
    ?.addEventListener("change", () => applyAndRenderFilters());
  document
    .getElementById("filter-estoque")
    ?.addEventListener("change", () => applyAndRenderFilters());

  // Limpar filtros
  document
    .getElementById("btn-clear-filters")
    ?.addEventListener("click", () => {
      document.getElementById("med-search").value = "";
      // Manter o filtro inicial da rota (ex: 'controlado' se estiver na página de controlados)
      document.getElementById("filter-lista").value = initialRouteFilter;
      document.getElementById("filter-status").value = "";
      document.getElementById("filter-categoria").value = "";
      document.getElementById("filter-estoque").value = "";
      applyAndRenderFilters();
    });
}

// ============================================================
// HELPERS
// ============================================================

function labelCategoria(cat) {
  const map = {
    analgesico: "Analgésico",
    anestesico: "Anestésico",
    bloqueador_nm: "Bloqueador Neuromuscular",
    sedativo: "Sedativo",
    antiemetico: "Antiemético",
    antibiotico: "Antibiótico",
    corticoide: "Corticoide",
    outro: "Outro",
  };
  return map[cat] || cat || "—";
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
