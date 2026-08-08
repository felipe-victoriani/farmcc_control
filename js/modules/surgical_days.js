/**
 * @file surgical_days.js
 * @description Módulo de dias cirúrgicos com múltiplos pacientes.
 * Permite vincular saídas de medicamentos a um dia cirúrgico em vez de pacientes individuais.
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
import { showToast, confirmDialog } from "../shared/notifications.js";
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
  escapeHtml,
  badgeClassLista,
  friendlyError,
} from "../shared/utils.js";

// ============================================================
// RENDER PRINCIPAL
// ============================================================

export async function renderSurgicalDaysModule() {
  const main = document.getElementById("app-main");
  if (!main) return;
  main.innerHTML = buildSurgicalDaysHTML();
  await loadSurgicalDays();
  setupSurgicalDaysListeners();
}

function buildSurgicalDaysHTML() {
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
  <section class="module-section" id="section-surgical-days">
    <div class="section-header">
      <div>
        <h1 class="section-title">Dias Cirúrgicos</h1>
        <p class="section-subtitle">Cadastro de pacientes por dia cirúrgico para rastreabilidade de medicamentos</p>
      </div>
      <div class="section-actions">
        <button class="btn btn-secondary btn-sm" id="btn-export-days">
          ${icon("download", "icon icon-sm")} Exportar CSV
        </button>
        ${
          canCreate
            ? `<button class="btn btn-primary btn-sm" id="btn-new-day">
          ${icon("plus", "icon icon-sm")} Novo Dia Cirúrgico
        </button>`
            : ""
        }
      </div>
    </div>

    <!-- Filtros -->
    <div class="filter-bar">
      <div class="filter-search">
        ${icon("search", "icon icon-sm filter-search-icon")}
        <input type="search" id="day-search" class="form-input" placeholder="Buscar por data, paciente...">
      </div>
      <div class="filter-group">
        <input type="date" id="filter-day-inicio" class="form-input" title="Data inicial">
        <input type="date" id="filter-day-fim"    class="form-input" title="Data final">
        <button class="btn btn-ghost btn-sm" id="btn-clear-day-filters">
          ${icon("xClose", "icon icon-sm")} Limpar
        </button>
      </div>
    </div>

    <!-- Tabela de dias cirúrgicos -->
    <div class="card">
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="data-table" id="days-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Qtd. Pacientes</th>
                <th>Pacientes</th>
                <th>Observações</th>
                <th class="text-right">Ações</th>
              </tr>
            </thead>
            <tbody id="days-tbody">
              <tr><td colspan="5"><div class="skeleton skeleton-text"></div></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </section>

  <!-- Modal de Dia Cirúrgico -->
  <dialog id="modal-day" class="modal" aria-modal="true" aria-labelledby="modal-day-title">
    <div class="modal-content modal-lg">
      <div class="modal-header">
        <h2 class="modal-title" id="modal-day-title">Novo Dia Cirúrgico</h2>
        <button class="btn btn-icon" id="close-modal-day" aria-label="Fechar">
          ${icon("xClose", "icon icon-sm")}
        </button>
      </div>
      <form id="form-day" novalidate>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label" for="day-data">Data do Dia Cirúrgico <span class="required">*</span></label>
            <input type="date" id="day-data" name="data" class="form-input" required>
            <span class="form-error" id="err-day-data"></span>
          </div>

          <!-- Lista de Pacientes -->
          <div class="form-group">
            <div class="mb-2" style="display: flex; justify-content: space-between; align-items: center;">
              <label class="form-label">Pacientes <span class="required">*</span></label>
              <button type="button" class="btn btn-secondary btn-sm" id="btn-add-patient">
                ${icon("plus", "icon icon-sm")} Adicionar Paciente
              </button>
            </div>
            <div class="card">
              <div class="card-body p-0">
                <div class="table-responsive">
                  <table class="data-table" id="patients-list-table">
                    <thead>
                      <tr>
                        <th style="width: 40%;">Nome do Paciente</th>
                        <th style="width: 30%;">Prontuário</th>
                        <th style="width: 30%; text-align: right;">Ações</th>
                      </tr>
                    </thead>
                    <tbody id="patients-list-tbody">
                      <!-- Preenchido dinamicamente -->
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <span class="form-error" id="err-day-patients"></span>
            <span class="form-hint text-sm text-muted">💡 Adicione todos os pacientes que terão cirurgia neste dia</span>
          </div>

          <div class="form-group">
            <label class="form-label" for="day-obs">Observações</label>
            <textarea id="day-obs" name="observacoes" class="form-input form-textarea" rows="3" maxlength="500"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" id="cancel-modal-day">Cancelar</button>
          <button type="submit" class="btn btn-primary" id="btn-save-day">
            ${icon("check", "icon icon-sm")} Salvar
          </button>
        </div>
      </form>
    </div>
  </dialog>

  <!-- Painel lateral: Detalhes do Dia Cirúrgico -->
  <div id="day-detail-panel" class="side-panel side-panel-wide" role="complementary" aria-label="Detalhes do dia cirúrgico">
    <div class="side-panel-header">
      <h3 class="side-panel-title">📋 Detalhes do Dia Cirúrgico</h3>
      <div class="side-panel-actions">
        <button class="btn btn-primary btn-sm" id="btn-print-day-prontuario" title="Imprimir prontuário do dia">
          ${icon("print", "icon icon-sm")} Imprimir
        </button>
        <button class="btn btn-icon" id="close-day-panel" aria-label="Fechar">
          ${icon("xClose", "icon icon-sm")}
        </button>
      </div>
    </div>
    <div id="day-detail-content" class="side-panel-body"></div>
  </div>
  <div id="day-panel-overlay" class="side-panel-overlay hidden"></div>
  `;
}

// ============================================================
// CARREGAR E FILTRAR DIAS CIRÚRGICOS
// ============================================================

let daysCache = [];

export async function loadSurgicalDays(filters = {}) {
  const raw = await dbReadAll("surgical_days");
  const all = snapshotToArray(raw);
  daysCache = sortBy(all, "data", "desc");
  applyDayFilters(filters);
}

function applyDayFilters(filters = {}) {
  const search = (document.getElementById("day-search")?.value || "").trim();
  const dataInicio = document.getElementById("filter-day-inicio")?.value || "";
  const dataFim = document.getElementById("filter-day-fim")?.value || "";

  let filtered = daysCache.filter((d) => {
    if (search) {
      const searchLower = search.toLowerCase();
      const matchData = d.data?.includes(search);
      const matchPatient = d.pacientes?.some(
        (p) =>
          p.nome?.toLowerCase().includes(searchLower) ||
          p.prontuario?.includes(search),
      );
      if (!matchData && !matchPatient) return false;
    }
    if (dataInicio && d.data < dataInicio) return false;
    if (dataFim && d.data > dataFim) return false;
    return true;
  });

  renderDaysTable(filtered);
}

function renderDaysTable(days) {
  const tbody = document.getElementById("days-tbody");
  if (!tbody) return;

  if (!days.length) {
    tbody.innerHTML = `<tr><td colspan="5">
      <div class="empty-state">
        ${icon("calendar", "icon icon-xl")}
        <p class="empty-state-title">Nenhum dia cirúrgico cadastrado</p>
        <p class="empty-state-desc">Cadastre os pacientes agrupados por dia de cirurgia.</p>
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

  tbody.innerHTML = days
    .map((d) => {
      const qtdPacientes = d.pacientes?.length || 0;

      // Montar lista de nomes para o tooltip
      let todosNomes = "Sem pacientes";

      if (d.pacientes && Array.isArray(d.pacientes) && d.pacientes.length > 0) {
        todosNomes = d.pacientes
          .map((p, index) => {
            // Se p é uma string (dados antigos)
            if (typeof p === "string") {
              return `• ${escapeHtml(p)}`;
            }

            // Se p é um objeto (dados corretos)
            if (p && typeof p === "object") {
              const nome = p.nome || `Paciente ${index + 1}`;
              const prontuario = p.prontuario
                ? ` (${escapeHtml(p.prontuario)})`
                : "";
              return `• ${escapeHtml(nome)}${prontuario}`;
            }

            // Fallback para dados inválidos
            return `• Paciente ${index + 1}`;
          })
          .join("<br>");
      }

      return `
    <tr>
      <td><strong>${formatDate(d.data)}</strong></td>
      <td><span class="badge badge-info">${qtdPacientes} paciente${qtdPacientes !== 1 ? "s" : ""}</span></td>
      <td>
        <div class="patient-icon-container">
          <button type="button" class="btn btn-icon btn-ghost patient-icon-btn" style="cursor: help;">
            ${icon("users", "icon icon-sm")}
          </button>
          <div class="patient-tooltip">
            <div style="font-weight: 600; margin-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 4px;">
              ${qtdPacientes} paciente${qtdPacientes !== 1 ? "s" : ""}:
            </div>
            <div style="color: white;">${todosNomes}</div>
          </div>
        </div>
      </td>
      <td>${escapeHtml(d.observacoes || "—")}</td>
      <td class="text-right">
        <div class="action-group">
          <button class="btn btn-icon btn-ghost" data-action="view" data-id="${d.id}" title="Ver detalhes">
            ${icon("eye", "icon icon-sm")}
          </button>
          ${
            canEdit
              ? `<button class="btn btn-icon btn-ghost" data-action="edit" data-id="${d.id}" title="Editar">
            ${icon("edit", "icon icon-sm")}
          </button>`
              : ""
          }
          ${
            canDelete
              ? `<button class="btn btn-icon btn-ghost btn-danger-ghost" data-action="delete" data-id="${d.id}" title="Excluir">
            ${icon("trash2", "icon icon-sm")}
          </button>`
              : ""
          }
        </div>
      </td>
    </tr>
  `;
    })
    .join("");
}

// Configurar tooltips de pacientes - REMOVIDO (agora usa delegação de eventos)

// ============================================================
// LISTENERS
// ============================================================

function setupSurgicalDaysListeners() {
  // Botão novo dia
  document
    .getElementById("btn-new-day")
    ?.addEventListener("click", openNewDayModal);

  // Botão exportar
  document
    .getElementById("btn-export-days")
    ?.addEventListener("click", exportDaysCSV);

  // Fechar modais
  document.getElementById("close-modal-day")?.addEventListener("click", () => {
    document.getElementById("modal-day").close();
  });
  document.getElementById("cancel-modal-day")?.addEventListener("click", () => {
    document.getElementById("modal-day").close();
  });

  // Submit formulário
  document.getElementById("form-day")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const editId = e.target.getAttribute("data-edit-id");
    await saveDay(new FormData(e.target), editId);
  });

  // Adicionar paciente
  document
    .getElementById("btn-add-patient")
    ?.addEventListener("click", () => addPatientRow());

  // Ações da tabela
  document.getElementById("days-tbody")?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    if (action === "edit") openEditDayModal(id);
    if (action === "delete") deleteDay(id);
    if (action === "view") openDayDetailPanel(id);
  });

  // Tooltips de pacientes - mostrar ao passar mouse
  const tbody = document.getElementById("days-tbody");
  if (tbody) {
    tbody.addEventListener("mouseover", (e) => {
      const btn = e.target.closest(".patient-icon-btn");
      if (!btn) return;
      const container = btn.closest(".patient-icon-container");
      if (!container) return;
      const tooltip = container.querySelector(".patient-tooltip");
      if (tooltip) {
        tooltip.style.display = "block";
      }
    });

    tbody.addEventListener("mouseout", (e) => {
      const btn = e.target.closest(".patient-icon-btn");
      if (!btn) return;
      const container = btn.closest(".patient-icon-container");
      if (!container) return;
      const tooltip = container.querySelector(".patient-tooltip");
      if (tooltip) {
        tooltip.style.display = "none";
      }
    });
  } else {
    console.error("❌ tbody não encontrado!");
  }

  // Filtros
  document
    .getElementById("day-search")
    ?.addEventListener("input", debounce(applyDayFilters, 300));
  document
    .getElementById("filter-day-inicio")
    ?.addEventListener("change", applyDayFilters);
  document
    .getElementById("filter-day-fim")
    ?.addEventListener("change", applyDayFilters);
  document
    .getElementById("btn-clear-day-filters")
    ?.addEventListener("click", () => {
      document.getElementById("day-search").value = "";
      document.getElementById("filter-day-inicio").value = "";
      document.getElementById("filter-day-fim").value = "";
      applyDayFilters();
    });

  // Painel lateral
  document
    .getElementById("close-day-panel")
    ?.addEventListener("click", closeDayPanel);
  document
    .getElementById("day-panel-overlay")
    ?.addEventListener("click", closeDayPanel);
  document
    .getElementById("btn-print-day-prontuario")
    ?.addEventListener("click", printSurgicalDayProntuario);
}

// ============================================================
// MODAL DIA CIRÚRGICO
// ============================================================

function openNewDayModal() {
  const modal = document.getElementById("modal-day");
  if (!modal) return;
  document.getElementById("modal-day-title").textContent = "Novo Dia Cirúrgico";
  document.getElementById("form-day").reset();
  document.getElementById("form-day").removeAttribute("data-edit-id");

  // Data padrão = hoje
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("day-data").value = today;

  // Limpar lista de pacientes e adicionar primeira linha
  const tbody = document.getElementById("patients-list-tbody");
  tbody.innerHTML = "";
  addPatientRow();

  modal.showModal();
}

async function openEditDayModal(id) {
  const day = await dbRead("surgical_days", id);
  if (!day) {
    showToast("error", "Erro", "Dia cirúrgico não encontrado.");
    return;
  }

  document.getElementById("modal-day-title").textContent =
    "Editar Dia Cirúrgico";
  const form = document.getElementById("form-day");
  form.setAttribute("data-edit-id", id);

  document.getElementById("day-data").value = day.data || "";
  document.getElementById("day-obs").value = day.observacoes || "";

  // Preencher lista de pacientes
  const tbody = document.getElementById("patients-list-tbody");
  tbody.innerHTML = "";

  if (day.pacientes && day.pacientes.length > 0) {
    day.pacientes.forEach((p) => {
      addPatientRow(p.nome, p.prontuario);
    });
  } else {
    addPatientRow();
  }

  document.getElementById("modal-day").showModal();
}

function addPatientRow(nome = "", prontuario = "") {
  const tbody = document.getElementById("patients-list-tbody");
  const row = document.createElement("tr");
  const rowId = `patient-row-${Date.now()}-${Math.random()}`;
  row.id = rowId;
  row.innerHTML = `
    <td>
      <input type="text" class="form-input patient-name" value="${escapeHtml(nome)}" placeholder="Nome do paciente" required>
    </td>
    <td>
      <input type="text" class="form-input patient-prontuario" value="${escapeHtml(prontuario)}" placeholder="Prontuário (opcional)">
    </td>
    <td class="text-right">
      <button type="button" class="btn btn-icon btn-ghost btn-danger-ghost btn-remove-patient" title="Remover">
        ${icon("trash2", "icon icon-sm")}
      </button>
    </td>
  `;
  tbody.appendChild(row);

  // Listener para remover linha
  row.querySelector(".btn-remove-patient")?.addEventListener("click", () => {
    if (tbody.children.length > 1) {
      row.remove();
    } else {
      showToast("warning", "Atenção", "Deve haver pelo menos 1 paciente.");
    }
  });
}

function collectPatients() {
  const rows = document.querySelectorAll("#patients-list-tbody tr");
  const patients = [];

  rows.forEach((row, index) => {
    const nome = row.querySelector(".patient-name")?.value.trim();
    const prontuario = row.querySelector(".patient-prontuario")?.value.trim();

    if (nome) {
      patients.push({ nome, prontuario: prontuario || "" });
    }
  });
  return patients;
}

async function saveDay(formData, editId = null) {
  const profile = getSessionProfile();
  if (!profile) return;

  // Limpar erros
  document
    .querySelectorAll("#form-day .form-error")
    .forEach((el) => (el.textContent = ""));

  let valid = true;
  if (!formData.get("data")) {
    setErr("err-day-data", "Obrigatório.");
    valid = false;
  }

  const totalRows = document.querySelectorAll(
    "#patients-list-tbody tr",
  ).length;
  const patients = collectPatients();
  if (patients.length === 0) {
    setErr("err-day-patients", "Adicione pelo menos 1 paciente.");
    valid = false;
  }

  if (!valid) return;

  const linhasIgnoradas = totalRows - patients.length;
  if (linhasIgnoradas > 0) {
    showToast(
      "warning",
      `${linhasIgnoradas} linha(s) em branco ignorada(s)`,
      "Preencha o nome do paciente antes de salvar, ou remova a linha.",
    );
  }

  const btn = document.getElementById("btn-save-day");
  btn.disabled = true;

  try {
    const data = {
      data: formData.get("data"),
      pacientes: patients,
      observacoes: formData.get("observacoes")?.trim() || "",
      registradoPor: profile.uid || "",
    };

    if (editId) {
      await dbUpdate("surgical_days", editId, data);
      showToast("success", "Dia cirúrgico atualizado!");

      try {
        await auditLog({
          uid: profile.uid || "",
          userName: profile.nome,
          action: "UPDATE_SURGICAL_DAY",
          module: "surgical_days",
          recordId: editId,
          details: `Dia cirúrgico editado: ${data.data} (${patients.length} pacientes)`,
        });
      } catch (auditErr) {
        console.warn("Erro ao registrar auditoria:", auditErr);
      }
    } else {
      const newId = await dbCreate("surgical_days", data);
      showToast("success", "Dia cirúrgico cadastrado!");

      try {
        await auditLog({
          uid: profile.uid || "",
          userName: profile.nome,
          action: "CREATE_SURGICAL_DAY",
          module: "surgical_days",
          recordId: newId,
          details: `Dia cirúrgico criado: ${data.data} (${patients.length} pacientes)`,
        });
      } catch (auditErr) {
        console.warn("Erro ao registrar auditoria:", auditErr);
      }
    }

    document.getElementById("modal-day").close();
  } catch (err) {
    showToast("error", "Erro ao salvar", friendlyError(err));
    btn.disabled = false;
    return;
  } finally {
    btn.disabled = false;
  }

  // Recarregar fora do try/catch principal
  try {
    await loadSurgicalDays();
  } catch (err) {
    console.error("Erro ao recarregar dias cirúrgicos:", err);
  }
}

async function deleteDay(id) {
  const profile = getSessionProfile();
  if (!profile || !["ADMIN", "FARMACEUTICO_RT"].includes(profile.role)) {
    showToast(
      "error",
      "Sem permissão",
      "Apenas ADMIN e Farmacêutico RT podem excluir dias cirúrgicos.",
    );
    return;
  }
  const day = daysCache.find((d) => d.id === id);
  const confirmado = await confirmDialog({
    title: "Excluir dia cirúrgico",
    message:
      "As movimentações de medicamentos já registradas para este dia não serão apagadas, mas perderão o vínculo com a lista de pacientes.",
    details: day
      ? [
          { label: "Data", value: formatDate(day.data) },
          { label: "Pacientes", value: day.pacientes?.length || 0 },
        ]
      : null,
    confirmLabel: "Excluir definitivamente",
    danger: true,
  });
  if (!confirmado) return;

  try {
    await dbDelete("surgical_days", id);
    showToast("success", "Dia cirúrgico excluído.");

    try {
      await auditLog({
        uid: profile.uid || "",
        userName: profile.nome,
        action: "DELETE_SURGICAL_DAY",
        module: "surgical_days",
        recordId: id,
        details: "Dia cirúrgico excluído",
      });
    } catch (auditErr) {
      console.warn("Erro ao registrar auditoria:", auditErr);
    }
  } catch (err) {
    showToast("error", "Erro ao excluir", friendlyError(err));
    return;
  }

  try {
    await loadSurgicalDays();
  } catch (err) {
    console.error("Erro ao recarregar dias cirúrgicos:", err);
  }
}

// ============================================================
// PAINEL DE DETALHES
// ============================================================

/** Cache do dia/movimentações atualmente exibidos no painel — usado pela impressão. */
let currentDayDetail = null;

async function openDayDetailPanel(dayId) {
  const panel = document.getElementById("day-detail-panel");
  const overlay = document.getElementById("day-panel-overlay");
  const content = document.getElementById("day-detail-content");
  if (!panel) return;

  content.innerHTML = '<div class="skeleton skeleton-text mb-2"></div>';
  panel.classList.add("open");
  overlay?.classList.remove("hidden");
  currentDayDetail = null;

  try {
    const day = await dbRead("surgical_days", dayId);
    if (!day) {
      content.innerHTML =
        '<p class="text-danger">Dia cirúrgico não encontrado.</p>';
      return;
    }

    // Buscar movimentações relacionadas a este dia
    const raw = await dbReadAll("movements");
    const movs = snapshotToArray(raw)
      .filter((m) => m.diaCirurgicoId === dayId)
      .filter((m) => m.status !== "cancelado")
      .sort((a, b) => (b.dataHora || 0) - (a.dataHora || 0));

    currentDayDetail = { day, movs };

    content.innerHTML = `
      <div class="detail-section">
        <h4>📅 Data</h4>
        <p class="detail-value">${formatDate(day.data)}</p>
      </div>

      <div class="detail-section">
        <h4>👥 Pacientes (${day.pacientes?.length || 0})</h4>
        <div class="card mt-2">
          <div class="card-body p-0">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Prontuário</th>
                </tr>
              </thead>
              <tbody>
                ${
                  day.pacientes && day.pacientes.length > 0
                    ? day.pacientes
                        .map(
                          (p) => `
                      <tr>
                        <td>${escapeHtml(p.nome)}</td>
                        <td>${escapeHtml(p.prontuario || "—")}</td>
                      </tr>
                    `,
                        )
                        .join("")
                    : '<tr><td colspan="2">Nenhum paciente cadastrado</td></tr>'
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>

      ${
        day.observacoes
          ? `
      <div class="detail-section">
        <h4>📝 Observações</h4>
        <p class="detail-value">${escapeHtml(day.observacoes)}</p>
      </div>
      `
          : ""
      }

      <div class="detail-section">
        <h4>💊 Movimentações de Medicamentos (${movs.length})</h4>
        ${
          movs.length > 0
            ? `
        <div class="card mt-2">
          <div class="card-body p-0">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Data/Hora</th>
                  <th>Medicamento</th>
                  <th>Lote</th>
                  <th>Qtd.</th>
                </tr>
              </thead>
              <tbody>
                ${movs
                  .map(
                    (m) => `
                  <tr>
                    <td>${formatDateTime(m.dataHora)}</td>
                    <td>
                      <div class="cell-primary">${escapeHtml(m.medicamentoNome || "—")}</div>
                      ${m.medicamentoLista ? `<span class="badge badge-sm ${badgeClassLista(m.medicamentoLista)}">${m.medicamentoLista}</span>` : ""}
                    </td>
                    <td>
                      ${m.numeroLote ? `<div class="cell-primary"><code>📦 ${escapeHtml(m.numeroLote)}</code></div>` : ""}
                      ${m.protocolo ? `<div class="cell-secondary text-muted" style="font-size: 0.75rem;">Protocolo: ${escapeHtml(m.protocolo)}</div>` : ""}
                      ${!m.numeroLote && !m.protocolo ? "—" : ""}
                    </td>
                    <td class="text-right fw-600">${m.quantidade || 0}</td>
                  </tr>
                `,
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>
        `
            : '<p class="text-muted">Nenhuma movimentação registrada para este dia cirúrgico.</p>'
        }
      </div>
    `;
  } catch (err) {
    content.innerHTML = `<p class="text-danger">Erro ao carregar detalhes: ${escapeHtml(err.message)}</p>`;
  }
}

function closeDayPanel() {
  const panel = document.getElementById("day-detail-panel");
  const overlay = document.getElementById("day-panel-overlay");
  panel?.classList.remove("open");
  overlay?.classList.add("hidden");
}

// ============================================================
// PRONTUÁRIO IMPRIMÍVEL DO DIA CIRÚRGICO
// ============================================================

async function printSurgicalDayProntuario() {
  if (!currentDayDetail) {
    showToast(
      "warning",
      "Nada para imprimir",
      "Abra um dia cirúrgico primeiro.",
    );
    return;
  }
  const { day, movs } = currentDayDetail;
  const settings = (await dbRead("settings", "main").catch(() => null)) || {};

  const totalItens = movs.reduce((s, m) => s + (Number(m.quantidade) || 0), 0);
  const controlados = movs.filter(
    (m) => m.medicamentoLista && !["normal", ""].includes(m.medicamentoLista),
  );
  const medicos = [
    ...new Set(movs.map((m) => m.medicoResponsavel).filter(Boolean)),
  ];

  const pacientesRows = (day.pacientes || [])
    .map(
      (p, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${escapeHtml(p.nome)}</td>
        <td>${escapeHtml(p.prontuario || "—")}</td>
      </tr>`,
    )
    .join("");

  const medsRows = movs.length
    ? movs
        .map(
          (m) => `
      <tr ${m.medicamentoLista && !["normal", ""].includes(m.medicamentoLista) ? 'class="row-warning"' : ""}>
        <td>${formatDateTime(m.dataHora)}</td>
        <td>${escapeHtml(m.medicamentoNome || "—")}</td>
        <td>${m.medicamentoLista && !["normal", ""].includes(m.medicamentoLista) ? `<span class="badge badge-danger">${escapeHtml(m.medicamentoLista)}</span>` : "—"}</td>
        <td style="text-align:right">${formatNumber(m.quantidade)}</td>
        <td>${escapeHtml(m.sncr || "—")}</td>
        <td>${escapeHtml(m.registradoPorNome || "—")}</td>
      </tr>`,
        )
        .join("")
    : `<tr><td colspan="6" style="text-align:center;color:#666">Nenhum medicamento registrado para este dia.</td></tr>`;

  const printWindow = window.open("", "_blank");
  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Prontuário do Dia Cirúrgico — Impressão</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', sans-serif; font-size: 12px; line-height: 1.5; color: #333; padding: 20mm; }
        .prontuario-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 16px; border-bottom: 2px solid #2563eb; margin-bottom: 24px; }
        .prontuario-institution-name { font-size: 18px; font-weight: 700; color: #1e40af; margin-bottom: 4px; }
        .prontuario-institution-info { font-size: 10px; color: #666; }
        .prontuario-date { text-align: right; font-size: 10px; }
        .prontuario-title { text-align: center; margin-bottom: 24px; }
        .prontuario-title h3 { font-size: 16px; font-weight: 700; color: #1e40af; margin-bottom: 8px; }
        .prontuario-number { font-size: 12px; color: #666; font-weight: 600; }
        .prontuario-section { margin-bottom: 20px; break-inside: avoid; }
        .prontuario-section-header { background: #f1f5f9; padding: 8px 12px; border-left: 4px solid #2563eb; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
        .prontuario-section-header h4 { font-size: 13px; font-weight: 700; color: #1e40af; }
        .prontuario-section-meta { font-size: 10px; color: #666; }
        table.prontuario-table { width: 100%; border-collapse: collapse; font-size: 10px; }
        table.prontuario-table th { background: #f8fafc; padding: 8px; text-align: left; font-weight: 700; border: 1px solid #e2e8f0; }
        table.prontuario-table td { padding: 6px 8px; border: 1px solid #e2e8f0; }
        table.prontuario-table .row-warning { background: #fef3c7; }
        .prontuario-obs { padding: 12px; background: #f8fafc; border-left: 4px solid #94a3b8; font-size: 11px; }
        .prontuario-alert { display: flex; gap: 12px; padding: 12px; background: #fef3c7; border: 1px solid #fbbf24; border-radius: 4px; margin: 20px 0; font-size: 11px; }
        .prontuario-footer { display: flex; justify-content: space-around; gap: 20px; margin-top: 40px; break-inside: avoid; }
        .prontuario-footer-section { flex: 1; text-align: center; }
        .prontuario-signature-line { border-top: 1px solid #000; margin-top: 40px; }
        .prontuario-legal { text-align: center; font-size: 9px; color: #999; margin-top: 20px; padding-top: 12px; border-top: 1px solid #e2e8f0; }
        .badge { display: inline-block; padding: 2px 6px; font-size: 9px; font-weight: 600; border-radius: 3px; }
        .badge-danger { background: #fee2e2; color: #991b1b; }
        @media print { body { padding: 0; } .prontuario-section { page-break-inside: avoid; } }
      </style>
    </head>
    <body>
      <div class="prontuario-header">
        <div>
          <div class="prontuario-institution-name">${escapeHtml(settings.nomeInstituicao || settings.institutionName || "Centro Cirúrgico")}</div>
          <div class="prontuario-institution-info">
            ${settings.cnpj ? `CNPJ: ${escapeHtml(settings.cnpj)} • ` : ""}${settings.endereco ? escapeHtml(settings.endereco) : ""}
          </div>
        </div>
        <div class="prontuario-date">
          <div>Emissão</div>
          <div><strong>${formatDate(Date.now())} ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</strong></div>
        </div>
      </div>

      <div class="prontuario-title">
        <h3>PRONTUÁRIO DE MEDICAMENTOS — DIA CIRÚRGICO</h3>
        <div class="prontuario-number">${formatDate(day.data)}</div>
      </div>

      <div class="prontuario-section">
        <div class="prontuario-section-header"><h4>Pacientes (${day.pacientes?.length || 0})</h4></div>
        <table class="prontuario-table">
          <thead><tr><th>#</th><th>Nome</th><th>Prontuário</th></tr></thead>
          <tbody>${pacientesRows || '<tr><td colspan="3">Nenhum paciente cadastrado.</td></tr>'}</tbody>
        </table>
      </div>

      ${
        medicos.length
          ? `<div class="prontuario-section">
        <div class="prontuario-section-header"><h4>Médico(s) Responsável(is)</h4></div>
        <div class="prontuario-obs">${medicos.map((m) => escapeHtml(m)).join(", ")}</div>
      </div>`
          : ""
      }

      <div class="prontuario-section">
        <div class="prontuario-section-header">
          <h4>Medicamentos Utilizados</h4>
          <div class="prontuario-section-meta">${movs.length} registro(s) • ${formatNumber(totalItens)} itens${controlados.length ? ` • ${controlados.length} controlado(s)` : ""}</div>
        </div>
        <table class="prontuario-table">
          <thead><tr><th>Data/Hora</th><th>Medicamento</th><th>Lista</th><th>Qtd.</th><th>SNCR</th><th>Registrado por</th></tr></thead>
          <tbody>${medsRows}</tbody>
        </table>
      </div>

      ${
        day.observacoes
          ? `<div class="prontuario-section">
        <div class="prontuario-section-header"><h4>Observações</h4></div>
        <div class="prontuario-obs">${escapeHtml(day.observacoes)}</div>
      </div>`
          : ""
      }

      ${
        controlados.length > 0
          ? `<div class="prontuario-alert">
        <strong>⚠ Atenção:</strong>&nbsp; este dia cirúrgico utilizou ${controlados.length} medicamento(s) controlado(s) sujeito(s) à Portaria SVS/MS nº 344/98. O registro deve ser mantido por no mínimo 2 anos para fins de fiscalização e auditoria.
      </div>`
          : ""
      }

      <div class="prontuario-footer">
        <div class="prontuario-footer-section">
          <div class="prontuario-signature-line"></div>
          <div>Farmacêutico Responsável<br><span style="color:#666">CRF</span></div>
        </div>
        <div class="prontuario-footer-section">
          <div class="prontuario-signature-line"></div>
          <div>${escapeHtml(settings.responsavelTecnico || "Responsável Técnico")}</div>
        </div>
      </div>

      <div class="prontuario-legal">
        Documento gerado pelo FarmaCC Pro • ${formatDateTime(Date.now())} • Em conformidade com Port. 344/98, RDC 873/2024 e RDC 204/2017
      </div>

      <script>
        window.onload = function() { window.print(); };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

// ============================================================
// EXPORTAR CSV
// ============================================================

function exportDaysCSV() {
  const data = daysCache.map((d) => ({
    Data: formatDate(d.data),
    "Qtd. Pacientes": d.pacientes?.length || 0,
    Pacientes: d.pacientes?.map((p) => p.nome).join("; ") || "",
    Observações: d.observacoes || "",
  }));
  exportCSV(data, `dias-cirurgicos-${Date.now()}.csv`);
  showToast("success", "Exportado!", "Arquivo CSV baixado.");
}

// ============================================================
// HELPERS
// ============================================================

function setErr(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}

// ============================================================
// EXPORTAR FUNÇÃO PARA CARREGAR DIAS CIRÚRGICOS (usado em movements.js)
// ============================================================

export async function getSurgicalDaysForDatalist() {
  try {
    const raw = await dbReadAll("surgical_days");
    const days = snapshotToArray(raw);
    return sortBy(days, "data", "desc");
  } catch (err) {
    console.warn("Erro ao carregar dias cirúrgicos:", err);
    return [];
  }
}
