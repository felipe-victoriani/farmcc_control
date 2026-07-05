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
  badgeClassLista,
  escapeHtml,
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

  <!-- Painel lateral: Prontuário da Cirurgia -->
  <div id="surg-detail-panel" class="side-panel side-panel-wide" role="complementary" aria-label="Prontuário da cirurgia">
    <div class="side-panel-header">
      <h3 class="side-panel-title">📋 Prontuário da Cirurgia</h3>
      <div class="side-panel-actions">
        <button class="btn btn-primary btn-sm" id="btn-print-prontuario" title="Imprimir prontuário">
          ${icon("print", "icon icon-sm")} Imprimir
        </button>
        <button class="btn btn-icon" id="close-surg-panel" aria-label="Fechar">
          ${icon("xClose", "icon icon-sm")}
        </button>
      </div>
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
  if (!profile || !["ADMIN", "FARMACEUTICO_RT"].includes(profile.role)) {
    showToast(
      "error",
      "Sem permissão",
      "Apenas ADMIN e Farmacêutico RT podem excluir cirurgias.",
    );
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
// PRONTUÁRIO COMPLETO DA CIRURGIA
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
    // Buscar dados da cirurgia
    const surgery = await dbRead("surgeries", surgId);
    if (!surgery) {
      content.innerHTML = '<p class="text-danger">Cirurgia não encontrada.</p>';
      return;
    }

    // Buscar movimentações (medicamentos utilizados)
    const raw = await dbReadAll("movements");
    const movs = snapshotToArray(raw)
      .filter((m) => m.prontuario === prontuario)
      .filter((m) => m.status !== "cancelado")
      .filter((m) => m.tipo === "saida") // Apenas saídas (uso cirúrgico)
      .sort((a, b) => (a.dataHora || 0) - (b.dataHora || 0));

    // Buscar configurações para cabeçalho
    const settings = (await dbRead("settings", "main").catch(() => null)) || {};

    const totalItens = movs.reduce(
      (s, m) => s + (Number(m.quantidade) || 0),
      0,
    );
    const controlados = movs.filter(
      (m) => m.medicamentoLista && !["normal", ""].includes(m.medicamentoLista),
    );

    // Renderizar prontuário completo
    content.innerHTML = `
      <div class="prontuario-document" id="prontuario-printable">
        <!-- Cabeçalho institucional -->
        <div class="prontuario-header">
          <div class="prontuario-logo">
            <div style="width: 48px; height: 48px; background: #2563eb; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 24px;">
              ⚕️
            </div>
          </div>
          <div class="prontuario-institution">
            <h2 class="prontuario-institution-name">${escapeHtml(settings.nomeInstituicao || "Centro Cirúrgico")}</h2>
            <p class="prontuario-institution-info">
              ${settings.cnpj ? `CNPJ: ${escapeHtml(settings.cnpj)} • ` : ""}
              ${settings.endereco ? escapeHtml(settings.endereco) : ""}
            </p>
          </div>
          <div class="prontuario-date">
            <div class="text-sm text-muted">Emissão</div>
            <div class="fw-600">${formatDate(Date.now())}</div>
            <div class="text-sm">${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
          </div>
        </div>

        <div class="prontuario-title">
          <h3>PRONTUÁRIO DE MEDICAMENTOS UTILIZADOS EM CIRURGIA</h3>
          <div class="prontuario-number">Prontuário Nº ${escapeHtml(prontuario)}</div>
        </div>

        <!-- Dados do Paciente -->
        <div class="prontuario-section">
          <div class="prontuario-section-header">
            <h4>👤 Dados do Paciente</h4>
          </div>
          <div class="prontuario-grid">
            <div class="prontuario-field">
              <label>Nome Completo</label>
              <div class="prontuario-value">${escapeHtml(surgery.pacienteNome || "—")}</div>
            </div>
            <div class="prontuario-field">
              <label>Nº Prontuário</label>
              <div class="prontuario-value">${escapeHtml(surgery.prontuario || "—")}</div>
            </div>
          </div>
        </div>

        <!-- Dados da Cirurgia -->
        <div class="prontuario-section">
          <div class="prontuario-section-header">
            <h4>🏥 Dados da Cirurgia</h4>
          </div>
          <div class="prontuario-grid">
            <div class="prontuario-field">
              <label>Tipo de Cirurgia</label>
              <div class="prontuario-value">${escapeHtml(surgery.tipoCirurgia || "—")}</div>
            </div>
            <div class="prontuario-field">
              <label>Data</label>
              <div class="prontuario-value">${formatDate(surgery.data)}</div>
            </div>
            <div class="prontuario-field">
              <label>Horário</label>
              <div class="prontuario-value">${escapeHtml(surgery.hora || "—")}</div>
            </div>
            <div class="prontuario-field">
              <label>Sala</label>
              <div class="prontuario-value">${escapeHtml(surgery.sala || "—")}</div>
            </div>
            <div class="prontuario-field">
              <label>Status</label>
              <div class="prontuario-value">
                <span class="badge ${surgery.status === "realizada" ? "badge-success" : surgery.status === "agendada" ? "badge-info" : "badge-neutral"}">
                  ${labelStatus(surgery.status)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Equipe Médica -->
        <div class="prontuario-section">
          <div class="prontuario-section-header">
            <h4>👥 Equipe Médica</h4>
          </div>
          <div class="prontuario-grid">
            <div class="prontuario-field">
              <label>Cirurgião</label>
              <div class="prontuario-value">${escapeHtml(surgery.cirurgiao || "—")}</div>
            </div>
            <div class="prontuario-field">
              <label>Anestesista</label>
              <div class="prontuario-value">${escapeHtml(surgery.anestesista || "—")}</div>
            </div>
            <div class="prontuario-field">
              <label>Tipo de Anestesia</label>
              <div class="prontuario-value">${escapeHtml(labelTipoAnestesia(surgery.tipoAnestesia) || "—")}</div>
            </div>
          </div>
        </div>

        <!-- Medicamentos Utilizados -->
        <div class="prontuario-section">
          <div class="prontuario-section-header">
            <h4>💊 Medicamentos Utilizados</h4>
            <div class="prontuario-section-meta">
              ${movs.length} medicamento(s) • ${formatNumber(totalItens)} itens no total
              ${controlados.length > 0 ? `• <span class="badge badge-danger badge-sm">${controlados.length} controlado(s)</span>` : ""}
            </div>
          </div>
          
          ${
            movs.length === 0
              ? '<p class="text-muted text-center py-3">Nenhum medicamento registrado para esta cirurgia.</p>'
              : `<div class="prontuario-table-wrapper">
              <table class="prontuario-table">
                <thead>
                  <tr>
                    <th>Data/Hora</th>
                    <th>Medicamento</th>
                    <th>Lista</th>
                    <th>Quantidade</th>
                    <th>SNCR/Notificação</th>
                    <th>Registrado Por</th>
                  </tr>
                </thead>
                <tbody>
                  ${movs
                    .map(
                      (m) => `
                    <tr ${m.medicamentoLista && !["normal", ""].includes(m.medicamentoLista) ? 'class="row-warning"' : ""}>
                      <td class="text-nowrap">${formatDateTime(m.dataHora)}</td>
                      <td class="fw-600">${escapeHtml(m.medicamentoNome || "—")}</td>
                      <td>
                        ${
                          m.medicamentoLista &&
                          !["normal", ""].includes(m.medicamentoLista)
                            ? `<span class="badge ${badgeClassLista(m.medicamentoLista)} badge-sm">${m.medicamentoLista}</span>`
                            : '<span class="text-muted">—</span>'
                        }
                      </td>
                      <td class="text-right fw-600">${formatNumber(m.quantidade)}</td>
                      <td class="text-sm">${escapeHtml(m.sncr || "—")}</td>
                      <td class="text-sm">${escapeHtml(m.registradoPorNome || "—")}</td>
                    </tr>
                  `,
                    )
                    .join("")}
                </tbody>
              </table>
            </div>`
          }
        </div>

        <!-- Observações -->
        ${
          surgery.observacoes
            ? `
          <div class="prontuario-section">
            <div class="prontuario-section-header">
              <h4>📝 Observações</h4>
            </div>
            <div class="prontuario-obs">
              ${escapeHtml(surgery.observacoes)}
            </div>
          </div>
        `
            : ""
        }

        <!-- Alertas Regulatórios -->
        ${
          controlados.length > 0
            ? `
          <div class="prontuario-alert">
            <div class="prontuario-alert-icon" style="font-size: 24px;">⚠️</div>
            <div>
              <div class="fw-600 mb-1">Medicamentos Controlados Utilizados</div>
              <p class="text-sm mb-0">
                Esta cirurgia utilizou <strong>${controlados.length} medicamento(s) controlado(s)</strong> 
                sujeito(s) à Portaria SVS/MS nº 344/98. O registro deve ser mantido por no mínimo 
                <strong>2 anos</strong> para fins de fiscalização e auditoria.
              </p>
            </div>
          </div>
        `
            : ""
        }

        <!-- Rodapé -->
        <div class="prontuario-footer">
          <div class="prontuario-footer-section">
            <div class="prontuario-signature-line"></div>
            <div class="text-center text-sm mt-2">
              <div class="fw-600">${escapeHtml(surgery.anestesista || "Anestesista Responsável")}</div>
              <div class="text-muted">Anestesista</div>
            </div>
          </div>
          <div class="prontuario-footer-section">
            <div class="prontuario-signature-line"></div>
            <div class="text-center text-sm mt-2">
              <div class="fw-600">${escapeHtml(surgery.cirurgiao || "Cirurgião Responsável")}</div>
              <div class="text-muted">Cirurgião</div>
            </div>
          </div>
          <div class="prontuario-footer-section">
            <div class="prontuario-signature-line"></div>
            <div class="text-center text-sm mt-2">
              <div class="fw-600">Farmacêutico Responsável</div>
              <div class="text-muted">CRF</div>
            </div>
          </div>
        </div>

        <div class="prontuario-legal text-xs text-muted text-center mt-4">
          Documento gerado pelo FarmaCC Pro • ${formatDateTime(Date.now())} • 
          Em conformidade com Port. 344/98, RDC 873/2024 e RDC 204/2017
        </div>
      </div>
    `;
  } catch (err) {
    content.innerHTML = `<p class="text-danger">Erro ao carregar prontuário: ${escapeHtml(err.message)}</p>`;
  }
}

function labelTipoAnestesia(tipo) {
  const map = {
    geral: "Anestesia Geral",
    regional: "Anestesia Regional",
    local: "Anestesia Local",
    sedacao: "Sedação",
    combinada: "Anestesia Combinada",
  };
  return map[tipo] || tipo || "—";
}

function printProntuario() {
  const prontuario = document.getElementById("prontuario-printable");
  if (!prontuario) {
    showToast("warning", "Nada para imprimir", "Abra um prontuário primeiro.");
    return;
  }

  const printWindow = window.open("", "_blank");
  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Prontuário - Impressão</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Arial', sans-serif; 
          font-size: 12px; 
          line-height: 1.5;
          color: #333;
          padding: 20mm;
        }
        .prontuario-document { max-width: 100%; }
        .prontuario-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 16px;
          border-bottom: 2px solid #2563eb;
          margin-bottom: 24px;
        }
        .prontuario-institution-name {
          font-size: 18px;
          font-weight: 700;
          color: #1e40af;
          margin-bottom: 4px;
        }
        .prontuario-institution-info {
          font-size: 10px;
          color: #666;
        }
        .prontuario-date {
          text-align: right;
          font-size: 10px;
        }
        .prontuario-title {
          text-align: center;
          margin-bottom: 24px;
        }
        .prontuario-title h3 {
          font-size: 16px;
          font-weight: 700;
          color: #1e40af;
          margin-bottom: 8px;
        }
        .prontuario-number {
          font-size: 12px;
          color: #666;
          font-weight: 600;
        }
        .prontuario-section {
          margin-bottom: 20px;
          break-inside: avoid;
        }
        .prontuario-section-header {
          background: #f1f5f9;
          padding: 8px 12px;
          border-left: 4px solid #2563eb;
          margin-bottom: 12px;
        }
        .prontuario-section-header h4 {
          font-size: 13px;
          font-weight: 700;
          color: #1e40af;
        }
        .prontuario-section-meta {
          font-size: 10px;
          color: #666;
          margin-top: 4px;
        }
        .prontuario-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        .prontuario-field label {
          font-size: 10px;
          color: #666;
          font-weight: 600;
          display: block;
          margin-bottom: 4px;
        }
        .prontuario-value {
          font-size: 12px;
          color: #000;
          padding: 6px;
          border-bottom: 1px solid #e2e8f0;
        }
        .prontuario-table-wrapper {
          overflow: hidden;
        }
        .prontuario-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10px;
        }
        .prontuario-table th {
          background: #f8fafc;
          padding: 8px;
          text-align: left;
          font-weight: 700;
          border: 1px solid #e2e8f0;
        }
        .prontuario-table td {
          padding: 6px 8px;
          border: 1px solid #e2e8f0;
        }
        .prontuario-table .row-warning {
          background: #fef3c7;
        }
        .prontuario-obs {
          padding: 12px;
          background: #f8fafc;
          border-left: 4px solid #94a3b8;
          font-size: 11px;
        }
        .prontuario-alert {
          display: flex;
          gap: 12px;
          padding: 12px;
          background: #fef3c7;
          border: 1px solid #fbbf24;
          border-radius: 4px;
          margin: 20px 0;
        }
        .prontuario-footer {
          display: flex;
          justify-content: space-around;
          gap: 20px;
          margin-top: 40px;
          break-inside: avoid;
        }
        .prontuario-footer-section {
          flex: 1;
        }
        .prontuario-signature-line {
          border-top: 1px solid #000;
          margin-top: 40px;
        }
        .prontuario-legal {
          text-align: center;
          font-size: 9px;
          color: #999;
          margin-top: 20px;
          padding-top: 12px;
          border-top: 1px solid #e2e8f0;
        }
        .badge {
          display: inline-block;
          padding: 2px 6px;
          font-size: 9px;
          font-weight: 600;
          border-radius: 3px;
        }
        .badge-success { background: #dcfce7; color: #166534; }
        .badge-info { background: #dbeafe; color: #1e40af; }
        .badge-danger { background: #fee2e2; color: #991b1b; }
        .fw-600 { font-weight: 600; }
        .text-muted { color: #666; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-nowrap { white-space: nowrap; }
        .text-sm { font-size: 10px; }
        .text-xs { font-size: 9px; }
        .mt-2 { margin-top: 8px; }
        .mb-0 { margin-bottom: 0; }
        .mb-1 { margin-bottom: 4px; }
        .prontuario-logo {
          width: 48px !important;
          height: 48px !important;
          flex-shrink: 0;
        }
        .prontuario-logo svg,
        .prontuario-logo .icon {
          width: 24px !important;
          height: 24px !important;
          max-width: 24px !important;
          max-height: 24px !important;
        }
        svg {
          max-width: 100%;
          max-height: 100%;
        }
        .icon {
          display: inline-block;
          width: 1em;
          height: 1em;
        }
        @media print {
          body { padding: 0; }
          .prontuario-section { page-break-inside: avoid; }
          .prontuario-logo {
            width: 48px !important;
            height: 48px !important;
          }
          .prontuario-logo svg,
          .prontuario-logo .icon {
            width: 20px !important;
            height: 20px !important;
            max-width: 20px !important;
            max-height: 20px !important;
          }
        }
      </style>
    </head>
    <body>
      ${prontuario.outerHTML}
      <script>
        window.onload = function() {
          window.print();
          // Opcional: fechar após imprimir
          // window.onafterprint = function() { window.close(); }
        };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
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
    .getElementById("btn-print-prontuario")
    ?.addEventListener("click", printProntuario);

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
