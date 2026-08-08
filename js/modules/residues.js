/**
 * @file residues.js
 * @description Módulo de gerenciamento de resíduos farmacêuticos conforme RDC 222/2018.
 */

import {
  dbReadAll,
  dbCreate,
  dbUpdate,
  dbDelete,
  auditLog,
} from "../core/db.js";
import { getSessionProfile } from "../core/auth.js";
import { showToast, confirmDialog } from "../shared/notifications.js";
import { icon } from "../shared/icons.js";
import {
  snapshotToArray,
  sortBy,
  searchMatch,
  formatDate,
  friendlyError,
  formatDateTime,
  exportCSV,
  debounce,
  validarCNPJ,
  maskCNPJ,
} from "../shared/utils.js";

// ============================================================
// RENDER PRINCIPAL
// ============================================================

export async function renderResiduesModule() {
  const main = document.getElementById("app-main");
  if (!main) return;
  main.innerHTML = buildResiduesHTML();
  await loadResidues();
  setupResiduesListeners();
}

function buildResiduesHTML() {
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
  <section class="module-section" id="section-residues">
    <div class="section-header">
      <div>
        <h1 class="section-title">Gestão de Resíduos</h1>
        <p class="section-subtitle">Controle de resíduos farmacêuticos conforme RDC ANVISA 222/2018</p>
      </div>
      <div class="section-actions">
        <button class="btn btn-secondary btn-sm" id="btn-export-residues">
          ${icon("download", "icon icon-sm")} Exportar CSV
        </button>
        ${
          canCreate
            ? `<button class="btn btn-primary btn-sm" id="btn-new-residue">
          ${icon("plus", "icon icon-sm")} Registrar Descarte
        </button>`
            : ""
        }
      </div>
    </div>

    <!-- Card informativo RDC 222/2018 -->
    <div class="alert alert-info mb-4">
      <div class="alert-body">
        ${icon("shield", "icon icon-md alert-icon")}
        <div>
          <strong>RDC ANVISA 222/2018</strong> — Os resíduos farmacêuticos devem ser segregados, acondicionados e coletados por empresa licenciada. O MTR (Manifesto de Transporte de Resíduos) é obrigatório para todo descarte de resíduos Grupo B e Grupo E.
          <br>
          <a href="https://bvsms.saude.gov.br/bvs/saudelegis/anvisa/2018/rdc0222_28_03_2018.pdf" target="_blank" rel="noopener noreferrer" style="color:var(--color-info);font-weight:600;text-decoration:underline;display:inline-flex;align-items:center;gap:4px;margin-top:4px;">
            RDC 222/2018 — PDF oficial (Ministério da Saúde) ${icon("externalLink", "icon icon-xs")}
          </a>
          &nbsp;·&nbsp;
          <a href="https://antigo.anvisa.gov.br/documents/10181/3427425/RDC_222_2018_.pdf" target="_blank" rel="noopener noreferrer" style="color:var(--color-info);font-weight:600;text-decoration:underline;display:inline-flex;align-items:center;gap:4px;">
            PDF — ANVISA ${icon("externalLink", "icon icon-xs")}
          </a>
        </div>
      </div>
    </div>

    <!-- KPIs -->
    <div class="kpi-grid kpi-grid-3" id="residues-kpi-grid">
      <div class="kpi-card skeleton-card"><div class="skeleton skeleton-text"></div></div>
      <div class="kpi-card skeleton-card"><div class="skeleton skeleton-text"></div></div>
      <div class="kpi-card skeleton-card"><div class="skeleton skeleton-text"></div></div>
    </div>

    <!-- Filtros -->
    <div class="filter-bar">
      <div class="filter-search">
        ${icon("search", "icon icon-sm filter-search-icon")}
        <input type="search" id="residue-search" class="form-input" placeholder="Buscar por descrição, empresa, MTR...">
      </div>
      <div class="filter-group">
        <select id="filter-residue-tipo" class="form-select">
          <option value="">Todos os Grupos</option>
          <option value="B">Grupo B (Químicos)</option>
          <option value="D">Grupo D (Comuns)</option>
          <option value="E">Grupo E (Perfurocortantes)</option>
        </select>
        <input type="date" id="filter-residue-inicio" class="form-input" title="Data inicial">
        <input type="date" id="filter-residue-fim"    class="form-input" title="Data final">
        <button class="btn btn-ghost btn-sm" id="btn-clear-residue-filters">
          ${icon("xClose", "icon icon-sm")} Limpar
        </button>
      </div>
    </div>

    <!-- Tabela -->
    <div class="card">
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="data-table" id="residues-table">
            <thead>
              <tr>
                <th>Data Descarte</th>
                <th>Grupo</th>
                <th>Descrição</th>
                <th class="text-right">Qtd.</th>
                <th>Unidade</th>
                <th>Empresa Coletora</th>
                <th>Nº MTR</th>
                <th>Registrado por</th>
                <th class="text-right">Ações</th>
              </tr>
            </thead>
            <tbody id="residues-tbody">
              <tr><td colspan="9"><div class="skeleton skeleton-text"></div></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </section>

  <!-- Modal de Resíduo -->
  <dialog id="modal-residue" class="modal" aria-modal="true" aria-labelledby="modal-res-title">
    <div class="modal-content modal-lg">
      <div class="modal-header">
        <h2 class="modal-title" id="modal-res-title">Registrar Descarte</h2>
        <button class="btn btn-icon" id="close-modal-residue" aria-label="Fechar">
          ${icon("xClose", "icon icon-sm")}
        </button>
      </div>
      <form id="form-residue" novalidate>
        <div class="modal-body">
          <div class="form-grid form-grid-2">

            <!-- Tipo de resíduo -->
            <div class="form-group">
              <label class="form-label" for="res-grupo">Grupo de Resíduo <span class="required">*</span></label>
              <select id="res-grupo" name="grupoResidue" class="form-select" required>
                <option value="">Selecione...</option>
                <option value="B">Grupo B — Resíduos Químicos (medicamentos vencidos/controlados)</option>
                <option value="D">Grupo D — Resíduos Comuns (embalagens não contaminadas)</option>
                <option value="E">Grupo E — Perfurocortantes (seringas, ampolas)</option>
              </select>
              <span class="form-error" id="err-res-grupo"></span>
            </div>

            <div class="form-group">
              <label class="form-label" for="res-data">Data do Descarte <span class="required">*</span></label>
              <input type="date" id="res-data" name="dataDescarte" class="form-input" required>
              <span class="form-error" id="err-res-data"></span>
            </div>

            <div class="form-group form-col-2">
              <label class="form-label" for="res-descricao">Descrição do Resíduo <span class="required">*</span></label>
              <input type="text" id="res-descricao" name="descricao" class="form-input" required maxlength="300" placeholder="Ex: Fentanil vencido — ampolas 50mcg/mL">
              <span class="form-error" id="err-res-desc"></span>
            </div>

            <div class="form-group">
              <label class="form-label" for="res-quantidade">Quantidade <span class="required">*</span></label>
              <input type="number" id="res-quantidade" name="quantidade" class="form-input" required min="0.01" step="0.01">
              <span class="form-error" id="err-res-qtd"></span>
            </div>

            <div class="form-group">
              <label class="form-label" for="res-unidade">Unidade</label>
              <select id="res-unidade" name="unidade" class="form-select">
                <option value="kg">kg</option>
                <option value="L">L (Litros)</option>
                <option value="unidades">Unidades</option>
                <option value="caixas">Caixas</option>
              </select>
            </div>

            <!-- Empresa coletora -->
            <div class="form-group form-col-2">
              <label class="form-label" for="res-empresa">Empresa Coletora <span class="required">*</span></label>
              <input type="text" id="res-empresa" name="empresaColetora" class="form-input" required maxlength="100">
              <span class="form-error" id="err-res-empresa"></span>
            </div>

            <div class="form-group">
              <label class="form-label" for="res-cnpj">CNPJ da Empresa</label>
              <input type="text" id="res-cnpj" name="cnpjEmpresa" class="form-input" maxlength="18" placeholder="00.000.000/0000-00">
            </div>

            <div class="form-group">
              <label class="form-label" for="res-licenca">Licença IBAMA / CADRI</label>
              <input type="text" id="res-licenca" name="licencaIbama" class="form-input" maxlength="50">
            </div>

            <div class="form-group form-col-2">
              <label class="form-label" for="res-mtr">Número do MTR <span class="required">*</span></label>
              <input type="text" id="res-mtr" name="numeroMTR" class="form-input" required maxlength="50" placeholder="Ex: MTR-2024-001234">
              <span class="form-error" id="err-res-mtr"></span>
            </div>

            <div class="form-group form-col-2">
              <label class="form-label" for="res-obs">Observações</label>
              <textarea id="res-obs" name="observacoes" class="form-input form-textarea" rows="3" maxlength="500"></textarea>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" id="cancel-modal-residue">Cancelar</button>
          <button type="submit" class="btn btn-primary" id="btn-save-residue">
            ${icon("check", "icon icon-sm")} Registrar
          </button>
        </div>
      </form>
    </div>
  </dialog>
  `;
}

// ============================================================
// CARREGAR E FILTRAR
// ============================================================

let residuesCache = [];

export async function loadResidues(filters = {}) {
  const raw = await dbReadAll("residues");
  residuesCache = sortBy(snapshotToArray(raw), "dataDescarte", "desc");
  renderKPIsResidues(residuesCache);
  applyResidueFilters(filters);
}

function applyResidueFilters(filters = {}) {
  const search = (
    document.getElementById("residue-search")?.value || ""
  ).trim();
  const tipo = document.getElementById("filter-residue-tipo")?.value || "";
  const inicio = document.getElementById("filter-residue-inicio")?.value || "";
  const fim = document.getElementById("filter-residue-fim")?.value || "";

  let filtered = residuesCache.filter((r) => {
    if (
      search &&
      !searchMatch(r.descricao, search) &&
      !searchMatch(r.empresaColetora, search) &&
      !searchMatch(r.numeroMTR, search)
    )
      return false;
    if (tipo && r.grupoResidue !== tipo) return false;
    if (inicio && r.dataDescarte < inicio) return false;
    if (fim && r.dataDescarte > fim) return false;
    return true;
  });

  renderResiduesTable(filtered);
}

function renderResiduesTable(residues) {
  const tbody = document.getElementById("residues-tbody");
  if (!tbody) return;

  if (!residues.length) {
    tbody.innerHTML = `<tr><td colspan="9">
      <div class="empty-state">
        ${icon("waste", "icon icon-xl")}
        <p class="empty-state-title">Nenhum descarte registrado</p>
        <p class="empty-state-desc">Registre descartes de resíduos farmacêuticos conforme RDC 222/2018.</p>
      </div>
    </td></tr>`;
    return;
  }

  const profile = getSessionProfile();
  const canDelete =
    profile && ["ADMIN", "FARMACEUTICO_RT"].includes(profile.role);
  const grupoBadge = {
    B: "badge-warning",
    D: "badge-neutral",
    E: "badge-danger",
  };

  tbody.innerHTML = residues
    .map(
      (r) => `
    <tr>
      <td>${formatDate(r.dataDescarte)}</td>
      <td><span class="badge ${grupoBadge[r.grupoResidue] || "badge-neutral"}">Grupo ${escapeHtml(r.grupoResidue)}</span></td>
      <td>
        <div class="cell-primary">${escapeHtml(r.descricao)}</div>
        ${r.observacoes ? `<div class="cell-secondary">${escapeHtml(r.observacoes.substring(0, 60))}</div>` : ""}
      </td>
      <td class="text-right">${r.quantidade}</td>
      <td>${escapeHtml(r.unidade || "")}</td>
      <td>
        <div class="cell-primary">${escapeHtml(r.empresaColetora)}</div>
        ${r.cnpjEmpresa ? `<div class="cell-secondary">${escapeHtml(r.cnpjEmpresa)}</div>` : ""}
      </td>
      <td><code class="text-sm">${escapeHtml(r.numeroMTR || "—")}</code></td>
      <td>${escapeHtml(r.registradoPorNome || "—")}</td>
      <td class="text-right">
        ${
          canDelete
            ? `<button class="btn btn-icon btn-ghost btn-danger-ghost" data-action="delete" data-id="${r.id}" title="Excluir">
          ${icon("trash2", "icon icon-sm")}
        </button>`
            : ""
        }
      </td>
    </tr>
  `,
    )
    .join("");
}

function renderKPIsResidues(residues) {
  const grid = document.getElementById("residues-kpi-grid");
  if (!grid) return;

  const total = residues.length;
  const grupoB = residues.filter((r) => r.grupoResidue === "B").length;
  const semMTR = residues.filter((r) => !r.numeroMTR).length;

  grid.innerHTML = `
    <div class="kpi-card">
      <div class="kpi-icon kpi-icon-blue">${icon("waste", "icon icon-md")}</div>
      <div class="kpi-body"><p class="kpi-label">Total Descartes</p><p class="kpi-value">${total}</p></div>
    </div>
    <div class="kpi-card">
      <div class="kpi-icon kpi-icon-yellow">${icon("shield", "icon icon-md")}</div>
      <div class="kpi-body"><p class="kpi-label">Grupo B (Químicos)</p><p class="kpi-value">${grupoB}</p></div>
    </div>
    <div class="kpi-card ${semMTR ? "kpi-card-danger" : ""}">
      <div class="kpi-icon kpi-icon-red">${icon("alertTriangle", "icon icon-md")}</div>
      <div class="kpi-body"><p class="kpi-label">Sem MTR</p><p class="kpi-value">${semMTR}</p><p class="kpi-sub">${semMTR ? "Atenção: MTR obrigatório!" : "OK"}</p></div>
    </div>
  `;
}

// ============================================================
// SALVAR
// ============================================================

async function saveResidue(formData, editId = null) {
  const profile = getSessionProfile();
  if (!profile) return;

  document
    .querySelectorAll("#form-residue .form-error")
    .forEach((el) => (el.textContent = ""));
  let valid = true;
  if (!formData.get("grupoResidue")) {
    setErr("err-res-grupo", "Obrigatório.");
    valid = false;
  }
  if (!formData.get("dataDescarte")) {
    setErr("err-res-data", "Obrigatório.");
    valid = false;
  }
  if (!formData.get("descricao")?.trim()) {
    setErr("err-res-desc", "Obrigatório.");
    valid = false;
  }
  if (
    !formData.get("quantidade") ||
    isNaN(parseFloat(formData.get("quantidade")))
  ) {
    setErr("err-res-qtd", "Informe uma quantidade válida.");
    valid = false;
  }
  if (!formData.get("empresaColetora")?.trim()) {
    setErr("err-res-empresa", "Obrigatório.");
    valid = false;
  }
  if (!formData.get("numeroMTR")?.trim()) {
    setErr("err-res-mtr", "Obrigatório.");
    valid = false;
  }
  if (!valid) return;

  const cnpj = formData.get("cnpjEmpresa")?.replace(/\D/g, "") || "";
  if (cnpj && !validarCNPJ(cnpj)) {
    setErr("err-res-empresa", "CNPJ inválido.");
    return;
  }

  const btn = document.getElementById("btn-save-residue");
  btn.disabled = true;

  try {
    const data = {
      grupoResidue: formData.get("grupoResidue"),
      dataDescarte: formData.get("dataDescarte"),
      descricao: formData.get("descricao")?.trim(),
      quantidade: parseFloat(formData.get("quantidade")),
      unidade: formData.get("unidade") || "kg",
      empresaColetora: formData.get("empresaColetora")?.trim(),
      cnpjEmpresa: cnpj ? maskCNPJ(cnpj) : "",
      licencaIbama: formData.get("licencaIbama")?.trim() || "",
      numeroMTR: formData.get("numeroMTR")?.trim(),
      observacoes: formData.get("observacoes")?.trim() || "",
      registradoPor: profile.uid || "",
      registradoPorNome: profile.nome,
    };

    if (editId) {
      await dbUpdate("residues", editId, data);
    } else {
      const newId = await dbCreate("residues", data);
      await auditLog({
        uid: profile.uid || "",
        userName: profile.nome,
        action: "CREATE_RESIDUE",
        module: "residues",
        recordId: newId,
        details: `Descarte registrado: Grupo ${data.grupoResidue} — ${data.descricao} — MTR: ${data.numeroMTR}`,
      });
    }

    document.getElementById("modal-residue").close();
    showToast("success", "Descarte registrado!", `MTR: ${data.numeroMTR}`);
    await loadResidues();
  } catch (err) {
    showToast("error", "Erro ao salvar", friendlyError(err));
  } finally {
    btn.disabled = false;
  }
}

async function deleteResidue(id) {
  const profile = getSessionProfile();
  if (!profile || !["ADMIN", "FARMACEUTICO_RT"].includes(profile.role)) {
    showToast(
      "error",
      "Sem permissão",
      "Apenas ADMIN e Farmacêutico RT podem excluir registros.",
    );
    return;
  }
  const residue = residuesCache.find((r) => r.id === id);
  const confirmado = await confirmDialog({
    title: "Excluir registro de descarte",
    message: "Esta ação é irreversível.",
    details: residue
      ? [
          { label: "Descrição", value: residue.descricao || "—" },
          { label: "MTR", value: residue.numeroMTR || "—" },
          { label: "Data", value: formatDate(residue.dataDescarte) },
        ]
      : null,
    confirmLabel: "Excluir definitivamente",
    danger: true,
  });
  if (!confirmado) return;
  try {
    await dbDelete("residues", id);
    showToast("success", "Registro excluído.");
    await loadResidues();
  } catch (err) {
    showToast("error", "Erro", friendlyError(err));
  }
}

// ============================================================
// EXPORTAR
// ============================================================

function exportResiduesCSV() {
  const data = residuesCache.map((r) => ({
    "Data Descarte": formatDate(r.dataDescarte),
    Grupo: `Grupo ${r.grupoResidue}`,
    Descrição: r.descricao,
    Quantidade: r.quantidade,
    Unidade: r.unidade || "",
    "Empresa Coletora": r.empresaColetora,
    CNPJ: r.cnpjEmpresa || "",
    "Licença IBAMA": r.licencaIbama || "",
    "Nº MTR": r.numeroMTR,
    "Registrado por": r.registradoPorNome || "",
    Observações: r.observacoes || "",
  }));
  exportCSV(data, "residuos_farmaceuticos");
  showToast("success", "CSV exportado!", `${data.length} registros.`);
}

// ============================================================
// LISTENERS
// ============================================================

function setupResiduesListeners() {
  document.getElementById("btn-new-residue")?.addEventListener("click", () => {
    const modal = document.getElementById("modal-residue");
    document.getElementById("form-residue").reset();
    document.getElementById("form-residue").removeAttribute("data-edit-id");
    document.getElementById("res-data").value = new Date()
      .toISOString()
      .split("T")[0];
    modal?.showModal();
  });

  document
    .getElementById("btn-export-residues")
    ?.addEventListener("click", exportResiduesCSV);

  document
    .getElementById("close-modal-residue")
    ?.addEventListener("click", () =>
      document.getElementById("modal-residue")?.close(),
    );
  document
    .getElementById("cancel-modal-residue")
    ?.addEventListener("click", () =>
      document.getElementById("modal-residue")?.close(),
    );

  document
    .getElementById("form-residue")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target;
      await saveResidue(
        new FormData(form),
        form.getAttribute("data-edit-id") || null,
      );
    });

  // Máscara CNPJ
  document.getElementById("res-cnpj")?.addEventListener("input", (e) => {
    e.target.value = maskCNPJ(e.target.value);
  });

  document
    .getElementById("residues-tbody")
    ?.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      if (btn.dataset.action === "delete") await deleteResidue(btn.dataset.id);
    });

  const debouncedFilter = debounce(() => applyResidueFilters(), 300);
  document
    .getElementById("residue-search")
    ?.addEventListener("input", debouncedFilter);
  document
    .getElementById("filter-residue-tipo")
    ?.addEventListener("change", () => applyResidueFilters());
  document
    .getElementById("filter-residue-inicio")
    ?.addEventListener("change", () => applyResidueFilters());
  document
    .getElementById("filter-residue-fim")
    ?.addEventListener("change", () => applyResidueFilters());

  document
    .getElementById("btn-clear-residue-filters")
    ?.addEventListener("click", () => {
      document.getElementById("residue-search").value = "";
      document.getElementById("filter-residue-tipo").value = "";
      document.getElementById("filter-residue-inicio").value = "";
      document.getElementById("filter-residue-fim").value = "";
      applyResidueFilters();
    });
}

// ============================================================
// HELPERS
// ============================================================

function setErr(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
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
