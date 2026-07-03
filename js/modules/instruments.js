/**
 * @file instruments.js
 * @description Módulo de Controle de Instrumentais Cirúrgicos e Reprocessamento.
 * Conformidade com RDC ANVISA nº 15/2012.
 *
 * Rastreabilidade: instrumental → esterilização → procedimento cirúrgico → paciente
 */

import {
  dbReadAll,
  dbCreate,
  dbUpdate,
  dbDelete,
  dbRead,
  auditLog,
} from "../core/db.js";
import { getSessionProfile } from "../core/auth.js";
import { showToast } from "../shared/notifications.js";
import { icon } from "../shared/icons.js";
import {
  snapshotToArray,
  sortBy,
  formatDate,
  formatDateTime,
  escapeHtml,
  exportCSV,
  debounce,
} from "../shared/utils.js";

// ============================================================
// RENDER PRINCIPAL
// ============================================================

export async function renderInstrumentsModule() {
  const main = document.getElementById("app-main");
  if (!main) return;

  const profile = getSessionProfile();
  const canEdit =
    profile &&
    ["ADMIN", "FARMACEUTICO_RT", "FARMACEUTICO", "TECNICO_FARMACIA"].includes(
      profile.role,
    );
  const canDelete =
    profile && ["ADMIN", "FARMACEUTICO_RT"].includes(profile.role);

  main.innerHTML = buildInstrumentsHTML(canEdit, canDelete);
  await loadInstruments();
  setupInstrumentsListeners();
}

function buildInstrumentsHTML(canEdit, canDelete) {
  return `
  <section class="module-section" id="section-instruments">
    <div class="section-header">
      <div>
        <h1 class="section-title">Instrumentais Cirúrgicos</h1>
        <p class="section-subtitle">Controle de reprocessamento conforme RDC ANVISA nº 15/2012</p>
      </div>
      <div class="section-actions">
        <button class="btn btn-secondary btn-sm" id="btn-export-instruments">
          ${icon("download", "icon icon-sm")} Exportar CSV
        </button>
        ${
          canEdit
            ? `<button class="btn btn-primary btn-sm" id="btn-new-instrument">
          ${icon("plus", "icon icon-sm")} Novo Instrumental
        </button>`
            : ""
        }
      </div>
    </div>

    <div class="alert alert-info mb-3">
      ${icon("shield", "icon icon-sm")}
      <strong>RDC 15/2012</strong> — Todo instrumental reprocessável deve ter rastreabilidade de ciclos de esterilização,
      com número máximo de usos definido pelo fabricante. Instrumentais que atingirem o limite devem ser descartados.
    </div>

    <!-- KPIs -->
    <div class="kpi-grid" id="instruments-kpi-grid">
      <div class="kpi-card skeleton-card"><div class="skeleton skeleton-text"></div></div>
      <div class="kpi-card skeleton-card"><div class="skeleton skeleton-text"></div></div>
      <div class="kpi-card skeleton-card"><div class="skeleton skeleton-text"></div></div>
    </div>

    <!-- Filtro -->
    <div class="filter-bar">
      <div class="filter-search">
        ${icon("search", "icon icon-sm filter-search-icon")}
        <input type="search" id="inst-search" class="form-input" placeholder="Buscar por nome, nº série...">
      </div>
      <select id="filter-inst-status" class="form-select" style="width:auto">
        <option value="">Todos os status</option>
        <option value="ativo">Em uso</option>
        <option value="descartado">Descartado</option>
        <option value="manutencao">Manutenção</option>
      </select>
    </div>

    <!-- Tabela -->
    <div class="card">
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="data-table" id="instruments-table">
            <thead>
              <tr>
                <th>Instrumental</th>
                <th>Nº Série</th>
                <th>Tipo</th>
                <th>Fabricante</th>
                <th>Ciclos Realizados</th>
                <th>Ciclos Máx.</th>
                <th>Última Esterilização</th>
                <th>Método</th>
                <th>Status</th>
                <th class="text-right">Ações</th>
              </tr>
            </thead>
            <tbody id="instruments-tbody">
              <tr><td colspan="10"><div class="skeleton skeleton-text"></div></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </section>

  <!-- Modal Instrumental -->
  <dialog id="modal-instrument" class="modal" aria-modal="true">
    <div class="modal-content modal-lg">
      <div class="modal-header">
        <h2 class="modal-title" id="modal-inst-title">Novo Instrumental</h2>
        <button class="btn btn-icon" id="close-modal-inst">${icon("xClose", "icon icon-sm")}</button>
      </div>
      <form id="form-instrument" novalidate>
        <div class="modal-body">
          <div class="form-grid form-grid-2">
            <div class="form-group form-col-2">
              <label class="form-label">Nome do Instrumental <span class="required">*</span></label>
              <input type="text" name="nome" class="form-input" required maxlength="200" placeholder="Ex: Pinça Kelly Curva 14cm">
              <span class="form-error" id="err-inst-nome"></span>
            </div>
            <div class="form-group">
              <label class="form-label">Nº de Série <span class="required">*</span></label>
              <input type="text" name="numeroSerie" class="form-input" required maxlength="50">
              <span class="form-error" id="err-inst-serie"></span>
            </div>
            <div class="form-group">
              <label class="form-label">Tipo / Categoria</label>
              <select name="tipo" class="form-select">
                <option value="">Selecione...</option>
                <option value="pinca">Pinça</option>
                <option value="tesoura">Tesoura</option>
                <option value="bisturi">Cabo de Bisturi</option>
                <option value="afastador">Afastador</option>
                <option value="porta_agulha">Porta-Agulha</option>
                <option value="aspirador">Aspirador</option>
                <option value="laparoscopio">Laparoscópio / Óptica</option>
                <option value="endoscopio">Endoscópio</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Fabricante</label>
              <input type="text" name="fabricante" class="form-input" maxlength="100">
            </div>
            <div class="form-group">
              <label class="form-label">Ciclos Máximos (fabricante) <span class="required">*</span></label>
              <input type="number" name="ciclosMaximos" class="form-input" required min="1" step="1" placeholder="Ex: 100">
              <span class="form-error" id="err-inst-ciclos"></span>
              <span class="form-hint text-sm text-muted">Conforme manual do fabricante (RDC 15/2012 Art. 6)</span>
            </div>
            <div class="form-group">
              <label class="form-label">Ciclos Realizados até hoje</label>
              <input type="number" name="ciclosRealizados" class="form-input" min="0" step="1" value="0">
            </div>
            <div class="form-group">
              <label class="form-label">Data da Última Esterilização</label>
              <input type="date" name="ultimaEsterilizacao" class="form-input">
            </div>
            <div class="form-group">
              <label class="form-label">Método de Esterilização</label>
              <select name="metodoEsterilizacao" class="form-select">
                <option value="">Selecione...</option>
                <option value="autoclave_vapor">Autoclave a vapor (134°C)</option>
                <option value="autoclave_fracionado">Autoclave ciclo fracionado</option>
                <option value="oxido_etileno">Óxido de etileno (ETO)</option>
                <option value="plasma_h2o2">Plasma de H₂O₂ (Sterrad)</option>
                <option value="glutaraldeido">Glutaraldeído 2%</option>
                <option value="acido_peracético">Ácido peracético</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Responsável pela Esterilização</label>
              <input type="text" name="responsavelEsterilizacao" class="form-input" maxlength="100">
            </div>
            <div class="form-group">
              <label class="form-label">Status</label>
              <select name="status" class="form-select">
                <option value="ativo">Em uso</option>
                <option value="manutencao">Em manutenção</option>
                <option value="descartado">Descartado</option>
              </select>
            </div>
            <div class="form-group form-col-2">
              <label class="form-label">Observações / Restrições de Uso</label>
              <textarea name="observacoes" class="form-input form-textarea" rows="2" maxlength="500"></textarea>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" id="cancel-modal-inst">Cancelar</button>
          <button type="submit" class="btn btn-primary" id="btn-save-inst">
            ${icon("check", "icon icon-sm")} Salvar
          </button>
        </div>
      </form>
    </div>
  </dialog>
  `;
}

// ============================================================
// CARREGAR E RENDERIZAR
// ============================================================

let instrumentsCache = [];

async function loadInstruments() {
  const raw = await dbReadAll("instruments");
  instrumentsCache = sortBy(snapshotToArray(raw), "nome");
  renderKPIsInstruments(instrumentsCache);
  renderInstrumentsTable(instrumentsCache);
}

function renderKPIsInstruments(items) {
  const grid = document.getElementById("instruments-kpi-grid");
  if (!grid) return;
  const ativos = items.filter((i) => i.status === "ativo").length;
  const proxLimite = items.filter((i) => {
    const pct = (i.ciclosRealizados || 0) / (i.ciclosMaximos || 1);
    return pct >= 0.8 && i.status === "ativo";
  }).length;
  const descartados = items.filter((i) => i.status === "descartado").length;

  grid.innerHTML = `
    <div class="kpi-card">
      <div class="kpi-icon kpi-icon-blue">${icon("clipboard", "icon icon-md")}</div>
      <div class="kpi-body"><p class="kpi-label">Total em Uso</p><p class="kpi-value">${ativos}</p><p class="kpi-sub">instrumentais ativos</p></div>
    </div>
    <div class="kpi-card ${proxLimite > 0 ? "kpi-card-warning" : ""}">
      <div class="kpi-icon kpi-icon-yellow">${icon("alertTriangle", "icon icon-md")}</div>
      <div class="kpi-body"><p class="kpi-label">Próx. do Limite</p><p class="kpi-value">${proxLimite}</p><p class="kpi-sub">≥80% dos ciclos usados</p></div>
    </div>
    <div class="kpi-card">
      <div class="kpi-icon kpi-icon-red">${icon("trash2", "icon icon-md")}</div>
      <div class="kpi-body"><p class="kpi-label">Descartados</p><p class="kpi-value">${descartados}</p><p class="kpi-sub">limite atingido/danificados</p></div>
    </div>
  `;
}

function renderInstrumentsTable(items) {
  const tbody = document.getElementById("instruments-tbody");
  if (!tbody) return;
  const profile = getSessionProfile();
  const canEdit =
    profile &&
    ["ADMIN", "FARMACEUTICO_RT", "FARMACEUTICO", "TECNICO_FARMACIA"].includes(
      profile.role,
    );
  const canDelete =
    profile && ["ADMIN", "FARMACEUTICO_RT"].includes(profile.role);

  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="10">
      <div class="empty-state">
        ${icon("clipboard", "icon icon-xl")}
        <p class="empty-state-title">Nenhum instrumental cadastrado</p>
        <p class="empty-state-desc">Cadastre instrumentais para rastrear ciclos de reprocessamento (RDC 15/2012).</p>
      </div>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = items
    .map((inst) => {
      const pct = Math.round(
        ((inst.ciclosRealizados || 0) / (inst.ciclosMaximos || 1)) * 100,
      );
      const cicloClass =
        pct >= 100
          ? "text-danger fw-600"
          : pct >= 80
            ? "text-warning fw-600"
            : "";
      const statusBadge =
        {
          ativo: "badge-success",
          manutencao: "badge-warning",
          descartado: "badge-neutral",
        }[inst.status] || "badge-neutral";
      const statusLabel =
        { ativo: "Em uso", manutencao: "Manutenção", descartado: "Descartado" }[
          inst.status
        ] || inst.status;

      return `<tr class="${pct >= 100 ? "row-critical" : pct >= 80 ? "row-warning" : ""}">
      <td><div class="cell-primary">${escapeHtml(inst.nome)}</div></td>
      <td><code class="text-sm">${escapeHtml(inst.numeroSerie || "—")}</code></td>
      <td>${escapeHtml(inst.tipo || "—")}</td>
      <td>${escapeHtml(inst.fabricante || "—")}</td>
      <td class="${cicloClass}">
        ${inst.ciclosRealizados || 0} / ${inst.ciclosMaximos || "?"}
        <div class="progress-bar-mini" style="margin-top:4px">
          <div class="progress-bar-fill ${pct >= 100 ? "critical" : pct >= 80 ? "low" : "ok"}" style="width:${Math.min(pct, 100)}%"></div>
        </div>
      </td>
      <td>${inst.ciclosMaximos || "—"}</td>
      <td>${inst.ultimaEsterilizacao ? formatDate(inst.ultimaEsterilizacao) : "—"}</td>
      <td><span class="text-sm">${escapeHtml(inst.metodoEsterilizacao || "—")}</span></td>
      <td><span class="badge ${statusBadge}">${statusLabel}</span></td>
      <td class="text-right">
        <div class="action-group">
          ${canEdit ? `<button class="btn btn-icon btn-ghost" data-action="add-cycle" data-id="${inst.id}" title="Registrar novo ciclo de esterilização">${icon("refresh", "icon icon-sm")}</button>` : ""}
          ${canEdit ? `<button class="btn btn-icon btn-ghost" data-action="edit-inst" data-id="${inst.id}" title="Editar">${icon("edit", "icon icon-sm")}</button>` : ""}
          ${canDelete ? `<button class="btn btn-icon btn-ghost btn-danger-ghost" data-action="delete-inst" data-id="${inst.id}" title="Excluir">${icon("trash2", "icon icon-sm")}</button>` : ""}
        </div>
      </td>
    </tr>`;
    })
    .join("");
}

// ============================================================
// SALVAR
// ============================================================

async function saveInstrument(formData, editId = null) {
  const profile = getSessionProfile();
  const errors = [];
  if (!formData.get("nome")?.trim())
    errors.push({ field: "nome", msg: "Nome obrigatório." });
  if (!formData.get("numeroSerie")?.trim())
    errors.push({ field: "serie", msg: "Nº de série obrigatório." });
  if (
    !formData.get("ciclosMaximos") ||
    parseInt(formData.get("ciclosMaximos")) < 1
  )
    errors.push({
      field: "ciclos",
      msg: "Ciclos máximos obrigatório (RDC 15/2012).",
    });

  if (errors.length) {
    errors.forEach((e) => {
      const el = document.getElementById(`err-inst-${e.field}`);
      if (el) el.textContent = e.msg;
    });
    return;
  }

  const data = {
    nome: formData.get("nome")?.trim(),
    numeroSerie: formData.get("numeroSerie")?.trim(),
    tipo: formData.get("tipo") || "",
    fabricante: formData.get("fabricante")?.trim() || "",
    ciclosMaximos: parseInt(formData.get("ciclosMaximos"), 10),
    ciclosRealizados: parseInt(formData.get("ciclosRealizados") || "0", 10),
    ultimaEsterilizacao: formData.get("ultimaEsterilizacao") || null,
    metodoEsterilizacao: formData.get("metodoEsterilizacao") || "",
    responsavelEsterilizacao:
      formData.get("responsavelEsterilizacao")?.trim() || "",
    status: formData.get("status") || "ativo",
    observacoes: formData.get("observacoes")?.trim() || "",
  };

  const btn = document.getElementById("btn-save-inst");
  btn.disabled = true;

  try {
    if (editId) {
      await dbUpdate("instruments", editId, data);
      showToast("success", "Instrumental atualizado!");
    } else {
      const id = await dbCreate("instruments", data);
      await auditLog({
        uid: profile?.uid || "",
        userName: profile?.nome,
        action: "CREATE_INSTRUMENT",
        module: "instruments",
        recordId: id,
        details: `Instrumental cadastrado: ${data.nome} — Série: ${data.numeroSerie}`,
      });
      showToast("success", "Instrumental cadastrado!", data.nome);
    }
    document.getElementById("modal-instrument").close();
    await loadInstruments();
  } catch (err) {
    showToast("error", "Erro ao salvar", err.message);
  } finally {
    btn.disabled = false;
  }
}

async function addSterilizationCycle(instId) {
  const profile = getSessionProfile();
  const inst = await dbRead("instruments", instId);
  if (!inst) return;

  const metodo = prompt(
    `Registrar novo ciclo de esterilização para:\n${inst.nome} (${inst.numeroSerie})\n\nMétodo utilizado:`,
  );
  if (!metodo?.trim()) return;

  const novosCiclos = (inst.ciclosRealizados || 0) + 1;
  const atingiuLimite = novosCiclos >= (inst.ciclosMaximos || 999);

  await dbUpdate("instruments", instId, {
    ciclosRealizados: novosCiclos,
    ultimaEsterilizacao: new Date().toISOString().split("T")[0],
    metodoEsterilizacao: metodo.trim(),
    responsavelEsterilizacao: profile?.nome || "",
    status: atingiuLimite ? "descartado" : inst.status,
  });

  await auditLog({
    uid: profile?.uid || "",
    userName: profile?.nome,
    action: "STERILIZATION_CYCLE",
    module: "instruments",
    recordId: instId,
    details: `Ciclo ${novosCiclos}/${inst.ciclosMaximos} — Método: ${metodo.trim()}${atingiuLimite ? " ⚠️ LIMITE ATINGIDO — DESCARTAR" : ""}`,
  });

  if (atingiuLimite) {
    showToast(
      "warning",
      "⚠️ Limite de ciclos atingido!",
      `${inst.nome} deve ser DESCARTADO conforme RDC 15/2012.`,
    );
  } else {
    showToast("success", `Ciclo ${novosCiclos} registrado!`, inst.nome);
  }
  await loadInstruments();
}

// ============================================================
// LISTENERS
// ============================================================

function setupInstrumentsListeners() {
  document
    .getElementById("btn-new-instrument")
    ?.addEventListener("click", () => openInstrumentModal(null));
  document
    .getElementById("close-modal-inst")
    ?.addEventListener("click", () =>
      document.getElementById("modal-instrument")?.close(),
    );
  document
    .getElementById("cancel-modal-inst")
    ?.addEventListener("click", () =>
      document.getElementById("modal-instrument")?.close(),
    );

  document
    .getElementById("form-instrument")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      document
        .querySelectorAll("#form-instrument .form-error")
        .forEach((el) => (el.textContent = ""));
      const form = e.target;
      await saveInstrument(
        new FormData(form),
        form.getAttribute("data-edit-id") || null,
      );
    });

  document
    .getElementById("instruments-tbody")
    ?.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const { action, id } = btn.dataset;
      if (action === "edit-inst") await openInstrumentModal(id);
      if (action === "add-cycle") await addSterilizationCycle(id);
      if (action === "delete-inst") await deleteInstrument(id);
    });

  const search = debounce(() => {
    const q = document.getElementById("inst-search")?.value.toLowerCase() || "";
    const st = document.getElementById("filter-inst-status")?.value || "";
    const filtered = instrumentsCache.filter(
      (i) =>
        (!q ||
          i.nome?.toLowerCase().includes(q) ||
          i.numeroSerie?.toLowerCase().includes(q)) &&
        (!st || i.status === st),
    );
    renderInstrumentsTable(filtered);
  }, 300);

  document.getElementById("inst-search")?.addEventListener("input", search);
  document
    .getElementById("filter-inst-status")
    ?.addEventListener("change", search);
  document
    .getElementById("btn-export-instruments")
    ?.addEventListener("click", () => {
      const data = instrumentsCache.map((i) => ({
        Nome: i.nome,
        "Nº Série": i.numeroSerie,
        Tipo: i.tipo,
        Fabricante: i.fabricante,
        "Ciclos Realizados": i.ciclosRealizados,
        "Ciclos Máximos": i.ciclosMaximos,
        "Última Esterilização": i.ultimaEsterilizacao || "",
        Método: i.metodoEsterilizacao,
        Responsável: i.responsavelEsterilizacao,
        Status: i.status,
      }));
      exportCSV(data, "instrumentais_cirurgicos");
      showToast("success", "CSV exportado!");
    });
}

async function openInstrumentModal(id) {
  const modal = document.getElementById("modal-instrument");
  const form = document.getElementById("form-instrument");
  form.reset();
  form.removeAttribute("data-edit-id");
  document.getElementById("modal-inst-title").textContent = id
    ? "Editar Instrumental"
    : "Novo Instrumental";

  if (id) {
    const inst = await dbRead("instruments", id);
    if (!inst) return;
    form.setAttribute("data-edit-id", id);
    const fields = [
      "nome",
      "numeroSerie",
      "tipo",
      "fabricante",
      "ciclosMaximos",
      "ciclosRealizados",
      "ultimaEsterilizacao",
      "metodoEsterilizacao",
      "responsavelEsterilizacao",
      "status",
      "observacoes",
    ];
    fields.forEach((f) => {
      const el = form.querySelector(`[name="${f}"]`);
      if (el) el.value = inst[f] ?? "";
    });
  }
  modal.showModal();
}

async function deleteInstrument(id) {
  const inst = await dbRead("instruments", id);
  if (!inst) return;
  if (
    !confirm(
      `Excluir "${inst.nome}" (${inst.numeroSerie})?\n\nATENÇÃO: O histórico de ciclos será perdido.`,
    )
  )
    return;
  const profile = getSessionProfile();
  await dbDelete("instruments", id);
  await auditLog({
    uid: profile?.uid || "",
    userName: profile?.nome,
    action: "DELETE_INSTRUMENT",
    module: "instruments",
    recordId: id,
    details: `Instrumental excluído: ${inst.nome}`,
  });
  showToast("success", "Instrumental excluído.");
  await loadInstruments();
}
