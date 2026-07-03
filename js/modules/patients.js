/**
 * @file patients.js
 * @description Módulo de pacientes, cirurgias e rastreabilidade por prontuário.
 */

import {
  dbReadAll,
  dbRead,
  dbCreate,
  dbUpdate,
  dbDelete,
  auditLog,
} from "../core/db.js";
import { getSessionProfile } from "../core/auth.js";
import { showToast } from "../shared/notifications.js";
import { icon } from "../shared/icons.js";
import {
  snapshotToArray,
  sortBy,
  searchMatch,
  formatDate,
  formatDateTime,
  exportCSV,
  debounce,
  formatNumber,
} from "../shared/utils.js";

// ============================================================
// RENDER PRINCIPAL
// ============================================================

export async function renderPatientsModule() {
  const main = document.getElementById("app-main");
  if (!main) return;
  main.innerHTML = buildPatientsHTML();
  await loadSurgeries();
  setupPatientsListeners();
}

function buildPatientsHTML() {
  const profile = getSessionProfile();
  const canCreate =
    profile &&
    [
      "ADMIN",
      "FARMACEUTICO_RT",
      "FARMACEUTICO",
      "TECNICO_FARMACIA",
      "MEDICO_ANESTESISTA",
      "ENFERMEIRO_RT",
    ].includes(profile.role);
  const canDelete =
    profile && ["ADMIN", "FARMACEUTICO_RT"].includes(profile.role);

  return `
  <section class="module-section" id="section-patients">
    <div class="section-header">
      <div>
        <h1 class="section-title">Pacientes &amp; Cirurgias</h1>
        <p class="section-subtitle">Rastreabilidade de consumo por paciente / procedimento cirúrgico</p>
      </div>
      <div class="section-actions">
        <button class="btn btn-secondary btn-sm" id="btn-export-patients">
          ${icon("download", "icon icon-sm")} Exportar CSV
        </button>
        ${
          canCreate
            ? `<button class="btn btn-primary btn-sm" id="btn-new-surgery">
          ${icon("plus", "icon icon-sm")} Nova Cirurgia
        </button>`
            : ""
        }
      </div>
    </div>

    <!-- Busca por prontuário -->
    <div class="filter-bar">
      <div class="filter-search">
        ${icon("search", "icon icon-sm filter-search-icon")}
        <input type="search" id="patient-search" class="form-input" placeholder="Buscar por prontuário, nome, cirurgia...">
      </div>
      <div class="filter-group">
        <input type="date" id="filter-pat-data-inicio" class="form-input" title="Data inicial">
        <input type="date" id="filter-pat-data-fim"    class="form-input" title="Data final">
        <select id="filter-pat-status" class="form-select">
          <option value="">Todos os Status</option>
          <option value="agendada">Agendada</option>
          <option value="realizada">Realizada</option>
          <option value="cancelada">Cancelada</option>
        </select>
        <button class="btn btn-ghost btn-sm" id="btn-clear-pat-filters">
          ${icon("xClose", "icon icon-sm")} Limpar
        </button>
      </div>
    </div>

    <!-- Tabela de cirurgias -->
    <div class="card">
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="data-table" id="surgeries-table">
            <thead>
              <tr>
                <th>Prontuário</th>
                <th>Paciente</th>
                <th>Data</th>
                <th>Tipo de Cirurgia</th>
                <th>Sala</th>
                <th>Anestesista</th>
                <th>Status</th>
                <th class="text-right">Ações</th>
              </tr>
            </thead>
            <tbody id="surgeries-tbody">
              <tr><td colspan="8"><div class="skeleton skeleton-text"></div></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </section>

  <!-- Modal de Cirurgia -->
  <dialog id="modal-surgery" class="modal" aria-modal="true" aria-labelledby="modal-surg-title">
    <div class="modal-content modal-lg">
      <div class="modal-header">
        <h2 class="modal-title" id="modal-surg-title">Nova Cirurgia</h2>
        <button class="btn btn-icon" id="close-modal-surg" aria-label="Fechar">
          ${icon("xClose", "icon icon-sm")}
        </button>
      </div>
      <form id="form-surgery" novalidate>
        <div class="modal-body">
          <div class="form-grid form-grid-2">
            <div class="form-group">
              <label class="form-label" for="surg-prontuario">Nº Prontuário <span class="required">*</span></label>
              <input type="text" id="surg-prontuario" name="prontuario" class="form-input" required maxlength="30">
              <span class="form-error" id="err-surg-prontuario"></span>
            </div>
            <div class="form-group">
              <label class="form-label" for="surg-paciente">Nome do Paciente <span class="required">*</span></label>
              <input type="text" id="surg-paciente" name="pacienteNome" class="form-input" required maxlength="200">
              <span class="form-error" id="err-surg-paciente"></span>
            </div>
            <div class="form-group">
              <label class="form-label" for="surg-data">Data da Cirurgia <span class="required">*</span></label>
              <input type="date" id="surg-data" name="data" class="form-input" required>
              <span class="form-error" id="err-surg-data"></span>
            </div>
            <div class="form-group">
              <label class="form-label" for="surg-hora">Horário</label>
              <input type="time" id="surg-hora" name="hora" class="form-input">
            </div>
            <div class="form-group form-col-2">
              <label class="form-label" for="surg-tipo">Tipo de Cirurgia <span class="required">*</span></label>
              <input type="text" id="surg-tipo" name="tipoCirurgia" class="form-input" required maxlength="200" placeholder="Ex: Laparoscopia diagnóstica">
              <span class="form-error" id="err-surg-tipo"></span>
            </div>
            <div class="form-group">
              <label class="form-label" for="surg-sala">Sala</label>
              <input type="text" id="surg-sala" name="sala" class="form-input" maxlength="50" placeholder="Ex: CC-01">
            </div>
            <div class="form-group">
              <label class="form-label" for="surg-cirurgiao">Cirurgião</label>
              <input type="text" id="surg-cirurgiao" name="cirurgiao" class="form-input" maxlength="100">
            </div>
            <div class="form-group">
              <label class="form-label" for="surg-anestesista">Anestesista</label>
              <input type="text" id="surg-anestesista" name="anestesista" class="form-input" maxlength="100">
            </div>
            <div class="form-group">
              <label class="form-label" for="surg-tipo-anestesia">Tipo de Anestesia</label>
              <select id="surg-tipo-anestesia" name="tipoAnestesia" class="form-select">
                <option value="">Selecione...</option>
                <option value="geral">Geral</option>
                <option value="regional">Regional</option>
                <option value="local">Local</option>
                <option value="sedacao">Sedação</option>
                <option value="combinada">Combinada</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="surg-status">Status</label>
              <select id="surg-status" name="status" class="form-select">
                <option value="agendada">Agendada</option>
                <option value="realizada">Realizada</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>
            <div class="form-group form-col-2">
              <label class="form-label" for="surg-obs">Observações</label>
              <textarea id="surg-obs" name="observacoes" class="form-input form-textarea" rows="3" maxlength="500"></textarea>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" id="cancel-modal-surg">Cancelar</button>
          <button type="submit" class="btn btn-primary" id="btn-save-surg">
            ${icon("check", "icon icon-sm")} Salvar
          </button>
        </div>
      </form>
    </div>
  </dialog>

  <!-- Painel lateral: Medicamentos usados na cirurgia -->
  <div id="surg-detail-panel" class="side-panel" role="complementary" aria-label="Detalhes da cirurgia">
    <div class="side-panel-header">
      <h3 class="side-panel-title">Medicamentos Utilizados</h3>
      <button class="btn btn-icon" id="close-surg-panel" aria-label="Fechar">
        ${icon("xClose", "icon icon-sm")}
      </button>
    </div>
    <div id="surg-detail-content" class="side-panel-body"></div>
  </div>
  <div id="surg-panel-overlay" class="side-panel-overlay hidden"></div>
  `;
}

// ============================================================
// CARREGAR E FILTRAR CIRURGIAS
// ============================================================

let surgeriesCache = [];

export async function loadSurgeries(filters = {}) {
  const raw = await dbReadAll("surgeries");
  const all = snapshotToArray(raw);
  surgeriesCache = sortBy(all, "data", "desc");
  applyPatFilters(filters);
}

function applyPatFilters(filters = {}) {
  const search = (
    document.getElementById("patient-search")?.value || ""
  ).trim();
  const dataInicio =
    document.getElementById("filter-pat-data-inicio")?.value || "";
  const dataFim = document.getElementById("filter-pat-data-fim")?.value || "";
  const status = document.getElementById("filter-pat-status")?.value || "";

  let filtered = surgeriesCache.filter((s) => {
    if (
      search &&
      !searchMatch(s.pacienteNome, search) &&
      !searchMatch(s.prontuario, search) &&
      !searchMatch(s.tipoCirurgia, search)
    )
      return false;
    if (status && s.status !== status) return false;
    if (dataInicio && s.data < dataInicio) return false;
    if (dataFim && s.data > dataFim) return false;
    return true;
  });

  renderSurgeriesTable(filtered);
}

function renderSurgeriesTable(surgeries) {
  const tbody = document.getElementById("surgeries-tbody");
  if (!tbody) return;

  if (!surgeries.length) {
    tbody.innerHTML = `<tr><td colspan="8">
      <div class="empty-state">
        ${icon("hospital", "icon icon-xl")}
        <p class="empty-state-title">Nenhuma cirurgia encontrada</p>
        <p class="empty-state-desc">Cadastre procedimentos para rastrear o consumo de medicamentos.</p>
      </div>
    </td></tr>`;
    return;
  }

  const profile = getSessionProfile();
  const canEdit =
    profile &&
    [
      "ADMIN",
      "FARMACEUTICO_RT",
      "FARMACEUTICO",
      "MEDICO_ANESTESISTA",
      "ENFERMEIRO_RT",
    ].includes(profile.role);
  const canDelete =
    profile && ["ADMIN", "FARMACEUTICO_RT"].includes(profile.role);

  const statusBadge = {
    agendada: "badge-info",
    realizada: "badge-success",
    cancelada: "badge-neutral",
  };

  tbody.innerHTML = surgeries
    .map(
      (s) => `
    <tr>
      <td><strong>${escapeHtml(s.prontuario)}</strong></td>
      <td>${escapeHtml(s.pacienteNome)}</td>
      <td>${formatDate(s.data)}${s.hora ? " " + s.hora : ""}</td>
      <td>${escapeHtml(s.tipoCirurgia)}</td>
      <td>${escapeHtml(s.sala || "—")}</td>
      <td>${escapeHtml(s.anestesista || "—")}</td>
      <td><span class="badge ${statusBadge[s.status] || "badge-neutral"}">${labelStatus(s.status)}</span></td>
      <td class="text-right">
        <div class="action-group">
          <button class="btn btn-icon btn-ghost" data-action="view-meds" data-id="${s.id}" data-prontuario="${escapeHtml(s.prontuario)}" title="Ver medicamentos">
            ${icon("pill", "icon icon-sm")}
          </button>
          ${
            canEdit
              ? `<button class="btn btn-icon btn-ghost" data-action="edit" data-id="${s.id}" title="Editar">
            ${icon("edit", "icon icon-sm")}
          </button>`
              : ""
          }
          ${
            canDelete
              ? `<button class="btn btn-icon btn-ghost btn-danger-ghost" data-action="delete" data-id="${s.id}" title="Excluir">
            ${icon("trash2", "icon icon-sm")}
          </button>`
              : ""
          }
        </div>
      </td>
    </tr>
  `,
    )
    .join("");
}

// ============================================================
// MODAL CIRURGIA
// ============================================================

function openNewSurgeryModal() {
  const modal = document.getElementById("modal-surgery");
  if (!modal) return;
  document.getElementById("modal-surg-title").textContent = "Nova Cirurgia";
  document.getElementById("form-surgery").reset();
  document.getElementById("form-surgery").removeAttribute("data-edit-id");
  // Data padrão = hoje
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("surg-data").value = today;
  modal.showModal();
}

async function openEditSurgeryModal(id) {
  const s = await dbRead("surgeries", id);
  if (!s) {
    showToast("error", "Erro", "Cirurgia não encontrada.");
    return;
  }

  document.getElementById("modal-surg-title").textContent = "Editar Cirurgia";
  const form = document.getElementById("form-surgery");
  form.setAttribute("data-edit-id", id);

  const fields = [
    "prontuario",
    "pacienteNome",
    "data",
    "hora",
    "tipoCirurgia",
    "sala",
    "cirurgiao",
    "anestesista",
    "tipoAnestesia",
    "status",
    "observacoes",
  ];
  fields.forEach((f) => {
    const el = form.querySelector(`[name="${f}"]`);
    if (el) el.value = s[f] ?? "";
  });

  document.getElementById("modal-surgery").showModal();
}

async function saveSurgery(formData, editId = null) {
  const profile = getSessionProfile();
  if (!profile) return;

  document
    .querySelectorAll("#form-surgery .form-error")
    .forEach((el) => (el.textContent = ""));
  let valid = true;
  if (!formData.get("prontuario")?.trim()) {
    setErr("err-surg-prontuario", "Obrigatório.");
    valid = false;
  }
  if (!formData.get("pacienteNome")?.trim()) {
    setErr("err-surg-paciente", "Obrigatório.");
    valid = false;
  }
  if (!formData.get("data")) {
    setErr("err-surg-data", "Obrigatório.");
    valid = false;
  }
  if (!formData.get("tipoCirurgia")?.trim()) {
    setErr("err-surg-tipo", "Obrigatório.");
    valid = false;
  }
  if (!valid) return;

  const btn = document.getElementById("btn-save-surg");
  btn.disabled = true;

  try {
    const data = {
      prontuario: formData.get("prontuario")?.trim(),
      pacienteNome: formData.get("pacienteNome")?.trim(),
      data: formData.get("data"),
      hora: formData.get("hora") || "",
      tipoCirurgia: formData.get("tipoCirurgia")?.trim(),
      sala: formData.get("sala")?.trim() || "",
      cirurgiao: formData.get("cirurgiao")?.trim() || "",
      anestesista: formData.get("anestesista")?.trim() || "",
      tipoAnestesia: formData.get("tipoAnestesia") || "",
      status: formData.get("status") || "agendada",
      observacoes: formData.get("observacoes")?.trim() || "",
      registradoPor: profile.uid || "",
    };

    if (editId) {
      await dbUpdate("surgeries", editId, data);
      await auditLog({
        uid: profile.uid || "",
        userName: profile.nome,
        action: "UPDATE_SURGERY",
        module: "patients",
        recordId: editId,
        details: `Cirurgia editada: ${data.pacienteNome}`,
      });
      showToast("success", "Cirurgia atualizada!");
    } else {
      const newId = await dbCreate("surgeries", data);
      await auditLog({
        uid: profile.uid || "",
        userName: profile.nome,
        action: "CREATE_SURGERY",
        module: "patients",
        recordId: newId,
        details: `Cirurgia criada: ${data.pacienteNome} — ${data.tipoCirurgia}`,
      });
      showToast("success", "Cirurgia cadastrada!");
    }

    document.getElementById("modal-surgery").close();
    await loadSurgeries();
  } catch (err) {
    showToast("error", "Erro ao salvar", err.message);
  } finally {
    btn.disabled = false;
  }
}

async function deleteSurgery(id) {
  const profile = getSessionProfile();
  if (!profile || profile.role !== "FARMACEUTICO_RT") {
    showToast("error", "Sem permissão");
    return;
  }
  if (!window.confirm("Confirma a exclusão desta cirurgia?")) return;
  try {
    await dbDelete("surgeries", id);
    await auditLog({
      uid: profile.uid || "",
      userName: profile.nome,
      action: "DELETE_SURGERY",
      module: "patients",
      recordId: id,
      details: "Cirurgia excluída",
    });
    showToast("success", "Cirurgia excluída.");
    await loadSurgeries();
  } catch (err) {
    showToast("error", "Erro ao excluir", err.message);
  }
}

// ============================================================
// PAINEL DE MEDICAMENTOS POR CIRURGIA / PRONTUÁRIO
// ============================================================

async function openSurgeryMedsPanel(surgId, prontuario) {
  const panel = document.getElementById("surg-detail-panel");
  const overlay = document.getElementById("surg-panel-overlay");
  const content = document.getElementById("surg-detail-content");
  if (!panel) return;

  content.innerHTML = '<div class="skeleton skeleton-text mb-2"></div>';
  panel.classList.add("open");
  overlay?.classList.remove("hidden");

  try {
    const raw = await dbReadAll("movements");
    const movs = snapshotToArray(raw)
      .filter((m) => m.prontuario === prontuario || m.tipo === "saida")
      .filter((m) => m.prontuario === prontuario)
      .sort((a, b) => (b.dataHora || 0) - (a.dataHora || 0));

    if (!movs.length) {
      content.innerHTML =
        '<p class="text-sm text-muted">Nenhum medicamento registrado para este prontuário.</p>';
      return;
    }

    const totalItens = movs.reduce(
      (s, m) => s + (Number(m.quantidade) || 0),
      0,
    );

    content.innerHTML = `
      <p class="text-sm text-muted mb-3">Prontuário: <strong>${escapeHtml(prontuario)}</strong> — ${movs.length} registros — Total: ${formatNumber(totalItens)} itens</p>
      <table class="data-table">
        <thead><tr><th>Data/Hora</th><th>Medicamento</th><th>Qtd</th><th>Por</th></tr></thead>
        <tbody>
          ${movs
            .map(
              (m) => `<tr>
            <td>${formatDateTime(m.dataHora)}</td>
            <td>${escapeHtml(m.medicamentoNome || "—")}</td>
            <td class="text-right">${formatNumber(m.quantidade)}</td>
            <td>${escapeHtml(m.registradoPorNome || "—")}</td>
          </tr>`,
            )
            .join("")}
        </tbody>
      </table>
    `;
  } catch (err) {
    content.innerHTML = `<p class="text-danger">Erro: ${escapeHtml(err.message)}</p>`;
  }
}

// ============================================================
// EXPORTAÇÃO
// ============================================================

function exportPatientsCSV() {
  const data = surgeriesCache.map((s) => ({
    Prontuário: s.prontuario,
    Paciente: s.pacienteNome,
    Data: formatDate(s.data),
    Hora: s.hora || "",
    Cirurgia: s.tipoCirurgia,
    Sala: s.sala || "",
    Cirurgião: s.cirurgiao || "",
    Anestesista: s.anestesista || "",
    Anestesia: s.tipoAnestesia || "",
    Status: labelStatus(s.status),
    Observações: s.observacoes || "",
  }));
  exportCSV(data, "cirurgias_pacientes");
  showToast("success", "CSV exportado!", `${data.length} registros.`);
}

// ============================================================
// LISTENERS
// ============================================================

function setupPatientsListeners() {
  document
    .getElementById("btn-new-surgery")
    ?.addEventListener("click", openNewSurgeryModal);
  document
    .getElementById("btn-export-patients")
    ?.addEventListener("click", exportPatientsCSV);

  document
    .getElementById("close-modal-surg")
    ?.addEventListener("click", () =>
      document.getElementById("modal-surgery")?.close(),
    );
  document
    .getElementById("cancel-modal-surg")
    ?.addEventListener("click", () =>
      document.getElementById("modal-surgery")?.close(),
    );

  document
    .getElementById("form-surgery")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target;
      await saveSurgery(
        new FormData(form),
        form.getAttribute("data-edit-id") || null,
      );
    });

  document
    .getElementById("surgeries-tbody")
    ?.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const { action, id, prontuario } = btn.dataset;
      if (action === "edit") await openEditSurgeryModal(id);
      if (action === "delete") await deleteSurgery(id);
      if (action === "view-meds") await openSurgeryMedsPanel(id, prontuario);
    });

  document.getElementById("close-surg-panel")?.addEventListener("click", () => {
    document.getElementById("surg-detail-panel")?.classList.remove("open");
    document.getElementById("surg-panel-overlay")?.classList.add("hidden");
  });
  document
    .getElementById("surg-panel-overlay")
    ?.addEventListener("click", () => {
      document.getElementById("surg-detail-panel")?.classList.remove("open");
      document.getElementById("surg-panel-overlay")?.classList.add("hidden");
    });

  const debouncedFilter = debounce(() => applyPatFilters(), 300);
  document
    .getElementById("patient-search")
    ?.addEventListener("input", debouncedFilter);
  document
    .getElementById("filter-pat-data-inicio")
    ?.addEventListener("change", () => applyPatFilters());
  document
    .getElementById("filter-pat-data-fim")
    ?.addEventListener("change", () => applyPatFilters());
  document
    .getElementById("filter-pat-status")
    ?.addEventListener("change", () => applyPatFilters());

  document
    .getElementById("btn-clear-pat-filters")
    ?.addEventListener("click", () => {
      document.getElementById("patient-search").value = "";
      document.getElementById("filter-pat-data-inicio").value = "";
      document.getElementById("filter-pat-data-fim").value = "";
      document.getElementById("filter-pat-status").value = "";
      applyPatFilters();
    });
}

// ============================================================
// HELPERS
// ============================================================

function labelStatus(s) {
  return (
    { agendada: "Agendada", realizada: "Realizada", cancelada: "Cancelada" }[
      s
    ] ||
    s ||
    "—"
  );
}

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
