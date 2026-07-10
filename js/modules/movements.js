/**
 * @file movements.js
 * @description Módulo de movimentações de medicamentos.
 * Registro de saídas, entradas, devoluções, perdas e descartes conforme Port. 344/98.
 * Geração automática de lote, validação de estoque, histórico com filtros.
 */

import { dbReadAll, dbRead, dbCreate, dbUpdate, auditLog } from "../core/db.js";
import {
  decrementarEstoque,
  incrementarEstoque,
  ajustarEstoque,
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
  labelTipoMovimento,
  badgeClassLista,
  exportCSV,
  debounce,
  generateProtocol,
  formatNumber,
  textoDiasRestantes,
  diasRestantes,
  escapeHtml,
} from "../shared/utils.js";

// ============================================================
// RENDER PRINCIPAL DO MÓDULO
// ============================================================

export async function renderMovementsModule(initType = "") {
  const main = document.getElementById("app-main");
  if (!main) return;

  main.innerHTML = buildMovementsHTML();
  await loadMovements();
  setupMovementsListeners();

  if (initType) {
    openMovementModal(initType);
  }
}

function buildMovementsHTML() {
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

  return `
  <section class="module-section" id="section-movements">
    <div class="section-header">
      <div>
        <h1 class="section-title">Movimentações</h1>
        <p class="section-subtitle">Registro de entradas, saídas e eventos conforme Port. 344/98 Art. 58</p>
      </div>
      <div class="section-actions">
        <button class="btn btn-secondary btn-sm" id="btn-export-movs">
          ${icon("download", "icon icon-sm")} Exportar CSV
        </button>
        ${
          canCreate
            ? `
        <div class="btn-group">
          <button class="btn btn-primary btn-sm" data-open-mov="saida">
            ${icon("minus", "icon icon-sm")} Saída
          </button>
          <button class="btn btn-success btn-sm" data-open-mov="entrada">
            ${icon("plus", "icon icon-sm")} Entrada
          </button>
          <button class="btn btn-secondary btn-sm" data-open-mov="devolucao">
            ${icon("arrowLeft", "icon icon-sm")} Devolução
          </button>
          <button class="btn btn-warning btn-sm" data-open-mov="perda">
            ${icon("alertTriangle", "icon icon-sm")} Perda
          </button>
          <button class="btn btn-danger btn-sm" data-open-mov="descarte">
            ${icon("trash2", "icon icon-sm")} Descarte
          </button>
        </div>`
            : ""
        }
      </div>
    </div>

    <!-- KPIs do dia -->
    <div class="kpi-grid" id="movs-kpi-grid">
      <div class="kpi-card skeleton-card"><div class="skeleton skeleton-text"></div></div>
      <div class="kpi-card skeleton-card"><div class="skeleton skeleton-text"></div></div>
      <div class="kpi-card skeleton-card"><div class="skeleton skeleton-text"></div></div>
      <div class="kpi-card skeleton-card"><div class="skeleton skeleton-text"></div></div>
    </div>

    <!-- Filtros -->
    <div class="filter-bar" id="movs-filter-bar">
      <div class="filter-search">
        ${icon("search", "icon icon-sm filter-search-icon")}
        <input type="search" id="mov-search" class="form-input" placeholder="Buscar por medicamento, paciente, lote...">
      </div>
      <div class="filter-group">
        <select id="filter-mov-tipo" class="form-select">
          <option value="">Todos os Tipos</option>
          <option value="saida">Saída</option>
          <option value="entrada">Entrada</option>
          <option value="devolucao">Devolução</option>
          <option value="perda">Perda/Quebra</option>
          <option value="descarte">Descarte</option>
        </select>
        <input type="date" id="filter-mov-data-inicio" class="form-input" title="Data inicial">
        <input type="date" id="filter-mov-data-fim"    class="form-input" title="Data final">
        <button class="btn btn-ghost btn-sm" id="btn-clear-mov-filters">
          ${icon("xClose", "icon icon-sm")} Limpar
        </button>
      </div>
    </div>

    <!-- Tabela -->
    <div class="card">
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="data-table" id="movs-table">
            <thead>
              <tr>
                <th>Lote</th>
                <th>Data/Hora</th>
                <th>Tipo</th>
                <th>Medicamento</th>
                <th>Qtd.</th>
                <th>Dia Cirúrgico / Pacientes</th>
                <th>Responsável</th>
                <th>Observação</th>
              </tr>
            </thead>
            <tbody id="movs-tbody">
              <tr><td colspan="8"><div class="skeleton skeleton-text"></div></td></tr>
            </tbody>
          </table>
        </div>
        <div id="movs-pagination" class="pagination-wrapper"></div>
      </div>
    </div>
  </section>

  <!-- Modal de Movimentação -->
  <dialog id="modal-movement" class="modal" aria-modal="true" aria-labelledby="modal-mov-title">
    <div class="modal-content modal-lg">
      <div class="modal-header" id="modal-mov-header">
        <h2 class="modal-title" id="modal-mov-title">Registrar Movimentação</h2>
        <button class="btn btn-icon" id="close-modal-mov" aria-label="Fechar">
          ${icon("xClose", "icon icon-sm")}
        </button>
      </div>
      <form id="form-movement" novalidate>
        <div class="modal-body">
          <input type="hidden" id="mov-tipo" name="tipo" value="saida">

          <div class="alert alert-info mb-3" id="mov-alert-info"></div>

          <div class="form-grid form-grid-2">
            <div class="form-group">
              <label class="form-label" for="mov-data-hora">Data e Hora da Movimentação <span class="required">*</span></label>
              <input type="datetime-local" id="mov-data-hora" name="dataHora" class="form-input" required>
              <span class="form-error" id="err-mov-data"></span>
              <span class="form-hint text-sm text-muted">Informe quando a movimentação realmente ocorreu.</span>
            </div>

            <div class="form-group">
              <label class="form-label" for="mov-protocolo">Lote</label>
              <div class="input-group">
                <input type="text" id="mov-protocolo" name="protocolo" class="form-input" placeholder="Digite o número do lote">
                <button type="button" class="btn btn-secondary" id="btn-gen-protocol" title="Gerar número automático">
                  ${icon("refresh", "icon icon-sm")}
                </button>
              </div>
            </div>

            <!-- LISTA DE MEDICAÇÕES (múltiplas) -->
            <div class="form-group form-col-2">
              <div class="mb-2" style="display: flex; justify-content: space-between; align-items: center;">
                <label class="form-label">Medicações <span class="required">*</span></label>
                <button type="button" class="btn btn-primary btn-sm" id="btn-add-medication-row">
                  ${icon("plus", "icon icon-sm")} Adicionar Medicação
                </button>
              </div>
              <div class="table-wrapper" style="max-height: 300px; overflow-y: auto; border: 1px solid var(--color-border); border-radius: 4px;">
                <table class="table table-sm">
                  <thead>
                    <tr>
                      <th style="width: 50%;">Medicamento</th>
                      <th style="width: 20%;">Quantidade</th>
                      <th style="width: 20%;">Estoque</th>
                      <th style="width: 10%;"></th>
                    </tr>
                  </thead>
                  <tbody id="medications-list-tbody">
                    <!-- Linhas adicionadas dinamicamente -->
                  </tbody>
                </table>
              </div>
              <span class="form-error" id="err-mov-medications"></span>
              <span class="form-hint text-sm text-muted">Adicione todas as medicações utilizadas nesta movimentação.</span>
            </div>

            <!-- Campos de saída / uso cirúrgico -->
            <div id="mov-fields-saida" class="form-col-2 form-grid form-grid-2">
              <div class="form-group form-col-2">
                <label class="form-label" for="mov-dia-cirurgico">
                  Dia Cirúrgico <span class="required">*</span>
                  <span class="badge badge-info badge-sm ml-1" title="Selecione o dia cirúrgico cadastrado">📋</span>
                </label>
                <select id="mov-dia-cirurgico" name="diaCirurgicoId" class="form-select" required>
                  <option value="">Selecione o dia cirúrgico...</option>
                  <!-- Preenchido dinamicamente com dias cirúrgicos cadastrados -->
                </select>
                <span class="form-error" id="err-mov-dia-cirurgico"></span>
                <div id="mov-pacientes-info" class="mt-2 hidden">
                  <span class="form-hint text-sm fw-600">👥 Pacientes neste dia cirúrgico:</span>
                  <div id="mov-pacientes-list" class="mt-1 p-2" style="background: #f8f9fa; border-radius: 4px; font-size: 0.875rem;"></div>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label" for="mov-sala">Sala / Centro Cirúrgico</label>
                <input type="text" id="mov-sala" name="sala" class="form-input" maxlength="50" placeholder="Ex: CC-01">
              </div>
              <div class="form-group">
                <label class="form-label" for="mov-medico">Médico Responsável</label>
                <input type="text" id="mov-medico" name="medicoResponsavel" class="form-input" maxlength="100">
              </div>
              <div class="form-group">
                <label class="form-label" for="mov-crm">CRM/CRF Responsável</label>
                <input type="text" id="mov-crm" name="crmResponsavel" class="form-input" maxlength="20">
              </div>
              <!-- SNCR / Número de Notificação — obrigatório para listas A e B (Port. 344/98 + RDC 873/2024) -->
              <div class="form-group form-col-2" id="mov-sncr-group">
                <label class="form-label" for="mov-sncr">
                  Nº Notificação / SNCR <span class="required">*</span>
                  <span class="badge badge-danger badge-sm ml-auto">Port. 344/98 • RDC 873/2024</span>
                </label>
                <input type="text" id="mov-sncr" name="sncr" class="form-input" maxlength="50"
                  placeholder="Número da Notificação de Receita ou código SNCR">
                <span class="form-error" id="err-mov-sncr"></span>
                <span class="form-hint text-sm text-muted">⚠️ Obrigatório para medicamentos das Listas A1, A2, A3, B1 e B2 da Portaria 344/98.</span>
              </div>
            </div>

            <!-- Campos de entrada -->
            <div id="mov-fields-entrada" class="form-col-2 form-grid form-grid-2 hidden">
              <div class="form-group">
                <label class="form-label" for="mov-nota-fiscal">Nota Fiscal / Pedido</label>
                <input type="text" id="mov-nota-fiscal" name="notaFiscal" class="form-input" maxlength="50">
              </div>
              <div class="form-group">
                <label class="form-label" for="mov-fornecedor">Fornecedor</label>
                <input type="text" id="mov-fornecedor" name="fornecedor" class="form-input" maxlength="100" readonly>
                <span class="form-hint text-sm text-muted">Preenchido automaticamente do cadastro do medicamento</span>
              </div>
              <div class="form-group">
                <label class="form-label" for="mov-validade">Validade deste Lote <span class="required">*</span></label>
                <input type="date" id="mov-validade" name="validade" class="form-input">
                <span class="form-error" id="err-mov-validade"></span>
              </div>
            </div>

            <!-- Campos de perda/descarte -->
            <div id="mov-fields-perda" class="form-col-2 hidden">
              <div class="form-group form-col-2">
                <label class="form-label" for="mov-causa">Causa / Motivo <span class="required">*</span></label>
                <select id="mov-causa" name="causa" class="form-select">
                  <option value="">Selecione...</option>
                  <option value="quebra">Quebra de ampola</option>
                  <option value="vencimento">Vencimento</option>
                  <option value="contaminacao">Contaminação</option>
                  <option value="desvio">Desvio/Roubo (notificar VISA)</option>
                  <option value="sobra_cirurgia">Sobra cirúrgica</option>
                  <option value="outro">Outro</option>
                </select>
                <span class="form-error" id="err-mov-causa"></span>
              </div>
            </div>

            <!-- Justificativa (comum) -->
            <div class="form-group form-col-2">
              <label class="form-label" for="mov-justificativa">Justificativa / Observação</label>
              <textarea id="mov-justificativa" name="justificativa" class="form-input form-textarea" rows="3" maxlength="500"></textarea>
            </div>

            <!-- Assinatura / confirmação -->
            <div class="form-group form-col-2">
              <div class="form-checkbox-group">
                <input type="checkbox" id="mov-confirma" name="confirma" class="form-checkbox" required>
                <label class="form-label" for="mov-confirma">
                  Confirmo que as informações acima são corretas e assumo responsabilidade legal pelo registro.
                </label>
              </div>
              <span class="form-error" id="err-mov-confirma"></span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" id="cancel-modal-mov">Cancelar</button>
          <button type="submit" class="btn btn-primary" id="btn-save-mov">
            ${icon("check", "icon icon-sm")} Registrar
          </button>
        </div>
      </form>
    </div>
  </dialog>
  `;
}

// ============================================================
// ABRIR MODAL DE MOVIMENTAÇÃO
// ============================================================

/**
 * Abre o modal configurado para o tipo de movimentação.
 * @param {'saida'|'entrada'|'devolucao'|'perda'|'descarte'} type
 * @param {string} [medId] - Pré-selecionar medicamento
 */
export async function openMovementModal(type = "saida", medId = null) {
  const modal = document.getElementById("modal-movement");
  if (!modal) return;

  const title = document.getElementById("modal-mov-title");
  const header = document.getElementById("modal-mov-header");
  const tipoInput = document.getElementById("mov-tipo");

  // Configurar aparência por tipo
  const config = {
    saida: { label: "Registrar Saída", color: "var(--color-danger)" },
    entrada: { label: "Registrar Entrada", color: "var(--color-success)" },
    devolucao: { label: "Registrar Devolução", color: "var(--color-info)" },
    perda: { label: "Registrar Perda/Quebra", color: "var(--color-warning)" },
    descarte: { label: "Registrar Descarte", color: "var(--color-danger)" },
  };
  const cfg = config[type] || config.saida;

  title.textContent = cfg.label;
  header.style.borderBottom = `3px solid ${cfg.color}`;
  tipoInput.value = type;

  // Mostrar/ocultar campos condicionais
  document
    .getElementById("mov-fields-saida")
    ?.classList.toggle("hidden", !["saida", "devolucao"].includes(type));
  document
    .getElementById("mov-fields-entrada")
    ?.classList.toggle("hidden", type !== "entrada");
  document
    .getElementById("mov-fields-perda")
    ?.classList.toggle("hidden", !["perda", "descarte"].includes(type));

  // Gerar lote automático
  document.getElementById("mov-protocolo").value = generateProtocol();

  // Definir data/hora atual como padrão
  const now = new Date();
  const localDateTime = new Date(
    now.getTime() - now.getTimezoneOffset() * 60000,
  )
    .toISOString()
    .slice(0, 16);
  document.getElementById("mov-data-hora").value = localDateTime;

  // Carregar cache de medicações e adicionar primeira linha
  await loadMedicationsCache();
  await loadSurgicalDaysSelect(); // Carregar dias cirúrgicos cadastrados para select

  // Limpar form
  document.getElementById("form-movement").reset();
  document.getElementById("mov-tipo").value = type;
  document.getElementById("mov-protocolo").value = generateProtocol();
  document.getElementById("mov-data-hora").value = localDateTime;

  // Limpar tabela de medicações e adicionar primeira linha
  const tbody = document.getElementById("medications-list-tbody");
  if (tbody) {
    tbody.innerHTML = "";
    addMedicationRow(medId);
  }

  // Info de alerta por tipo
  const alertMap = {
    saida:
      "Saída para procedimento cirúrgico. Deve ser registrada antes do uso.",
    entrada:
      "Entrada de medicamento no estoque. Verifique nota fiscal e validade.",
    devolucao:
      "Medicamento devolvido ao estoque. Verifique integridade e prazo.",
    perda:
      "Perda deve ser comunicada ao CRF e registrada em livro de ocorrências.",
    descarte: "Descarte deve seguir RDC 222/2018 — utilize manifesto MTR.",
  };
  const alertEl = document.getElementById("mov-alert-info");
  if (alertEl) {
    alertEl.textContent = alertMap[type] || "";
    alertEl.style.display = alertMap[type] ? "" : "none";
  }

  modal.showModal();
}

// ============================================================
// LISTA DE MEDICAÇÕES (múltiplas por movimentação)
// ============================================================

let medicationsCache = []; // Cache de medicações para o select
let patientsCache = []; // Cache de pacientes cadastrados
let surgeriesCache = []; // Cache de cirurgias para autocomplete completo

async function loadMedicationsCache() {
  const raw = await dbReadAll("medications");
  medicationsCache = snapshotToArray(raw)
    .filter((m) => m.status === "ativo")
    .sort((a, b) => a.nome.localeCompare(b.nome));
}

// Cache de dias cirúrgicos
let surgicalDaysCache = [];

async function loadSurgicalDaysSelect() {
  try {
    const raw = await dbReadAll("surgical_days");
    const days = snapshotToArray(raw);

    surgicalDaysCache = days.sort((a, b) => {
      const dateA = a.data ? new Date(a.data).getTime() : 0;
      const dateB = b.data ? new Date(b.data).getTime() : 0;
      return dateB - dateA; // Mais recentes primeiro
    });

    // Preencher select de dias cirúrgicos
    const select = document.getElementById("mov-dia-cirurgico");
    if (select) {
      select.innerHTML =
        '<option value="">Selecione o dia cirúrgico...</option>' +
        surgicalDaysCache
          .map((day) => {
            const qtdPacientes = day.pacientes?.length || 0;
            const dataFormatada = formatDate(day.data);
            return `<option value="${day.id}">${dataFormatada} (${qtdPacientes} paciente${qtdPacientes !== 1 ? "s" : ""})</option>`;
          })
          .join("");
    }
  } catch (err) {
    console.warn("Erro ao carregar dias cirúrgicos:", err);
  }
}

// Função para mostrar pacientes do dia cirúrgico selecionado
function showSurgicalDayPatients(dayId) {
  const day = surgicalDaysCache.find((d) => d.id === dayId);
  const infoDiv = document.getElementById("mov-pacientes-info");
  const listDiv = document.getElementById("mov-pacientes-list");

  if (!day || !infoDiv || !listDiv) {
    infoDiv?.classList.add("hidden");
    return;
  }

  if (!day.pacientes || day.pacientes.length === 0) {
    infoDiv.classList.add("hidden");
    return;
  }

  listDiv.innerHTML = day.pacientes
    .map((p, idx) => {
      const prontuarioText = p.prontuario
        ? ` - <strong>Prontuário:</strong> ${escapeHtml(p.prontuario)}`
        : "";
      return `<div style="padding: 4px 0;">
        ${idx + 1}. <strong>${escapeHtml(p.nome)}</strong>${prontuarioText}
      </div>`;
    })
    .join("");

  infoDiv.classList.remove("hidden");
}

function addMedicationRow(preselectedMedId = null) {
  const tbody = document.getElementById("medications-list-tbody");
  if (!tbody) return;

  const rowId = `med-row-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const row = document.createElement("tr");
  row.id = rowId;
  row.innerHTML = `
    <td>
      <select class="form-select form-select-sm medication-select" data-row-id="${rowId}" required>
        <option value="">Selecione...</option>
        ${medicationsCache
          .map(
            (m) =>
              `<option value="${m.id}" data-qtd="${m.qtdAtual ?? 0}" data-unidade="${m.unidade || ""}" data-lista="${m.lista || ""}" data-fabricante="${escapeHtml(m.fabricante || "")}" ${m.id === preselectedMedId ? "selected" : ""}>
            ${escapeHtml(m.nome)} — ${m.lista}
          </option>`,
          )
          .join("")}
      </select>
    </td>
    <td>
      <input type="number" class="form-input form-input-sm medication-quantity" min="1" step="1" placeholder="Qtd" required data-row-id="${rowId}">
    </td>
    <td class="medication-stock-info" data-row-id="${rowId}">
      <span class="text-muted text-sm">—</span>
    </td>
    <td class="text-center">
      <button type="button" class="btn btn-icon btn-sm btn-danger-ghost" onclick="removeMedicationRow('${rowId}')" title="Remover">
        ${icon("trash", "icon icon-sm")}
      </button>
    </td>
  `;

  tbody.appendChild(row);

  // Event listener para atualizar info de estoque e fornecedor
  const select = row.querySelector(".medication-select");
  select.addEventListener("change", () => {
    updateRowStockInfo(rowId);
    updateSupplierForEntry();
  });

  if (preselectedMedId) {
    updateRowStockInfo(rowId);
    updateSupplierForEntry();
  }
}

function updateRowStockInfo(rowId) {
  const row = document.getElementById(rowId);
  if (!row) return;

  const select = row.querySelector(".medication-select");
  const stockInfo = row.querySelector(".medication-stock-info");

  const selectedOption = select.options[select.selectedIndex];
  if (!selectedOption || !selectedOption.value) {
    stockInfo.innerHTML = '<span class="text-muted text-sm">—</span>';
    return;
  }

  const qtd = selectedOption.dataset.qtd || 0;
  const unidade = selectedOption.dataset.unidade || "";
  const lista = selectedOption.dataset.lista || "";

  const listasControladas = ["A1", "A2", "A3", "B1", "B2"];
  const isControlled = listasControladas.includes(lista);

  stockInfo.innerHTML = `
    <span class="text-sm ${qtd <= 0 ? "text-danger" : qtd <= 5 ? "text-warning" : ""}">
      ${formatNumber(qtd)} ${unidade}
    </span>
    ${isControlled ? `<span class="badge badge-danger badge-sm ml-1">${lista}</span>` : ""}
  `;
}

/**
 * Atualiza o campo de fornecedor quando tipo=entrada e seleciona medicamento
 */
function updateSupplierForEntry() {
  const tipo = document.getElementById("mov-tipo")?.value;
  if (tipo !== "entrada") return;

  const fornecedorInput = document.getElementById("mov-fornecedor");
  if (!fornecedorInput) return;

  // Pegar o primeiro medicamento selecionado (se houver)
  const tbody = document.getElementById("medications-list-tbody");
  if (!tbody) return;

  const firstSelect = tbody.querySelector(".medication-select");
  if (!firstSelect || !firstSelect.value) {
    fornecedorInput.value = "";
    return;
  }

  const selectedOption = firstSelect.options[firstSelect.selectedIndex];
  const fabricante = selectedOption.dataset.fabricante || "";

  fornecedorInput.value = fabricante;
}

window.removeMedicationRow = function (rowId) {
  const row = document.getElementById(rowId);
  if (row) row.remove();

  // Se não houver mais linhas, adicionar uma vazia
  const tbody = document.getElementById("medications-list-tbody");
  if (tbody && tbody.children.length === 0) {
    addMedicationRow();
  }
};

function getMedicationsFromRows() {
  const tbody = document.getElementById("medications-list-tbody");
  if (!tbody) return [];

  const medications = [];
  const rows = tbody.querySelectorAll("tr");

  rows.forEach((row) => {
    const select = row.querySelector(".medication-select");
    const quantityInput = row.querySelector(".medication-quantity");

    if (select && select.value && quantityInput && quantityInput.value) {
      const selectedOption = select.options[select.selectedIndex];
      medications.push({
        id: select.value,
        nome: selectedOption.text.split(" — ")[0],
        lista: selectedOption.dataset.lista || "",
        qtdAtual: parseInt(selectedOption.dataset.qtd) || 0,
        unidade: selectedOption.dataset.unidade || "",
        quantidade: parseInt(quantityInput.value) || 0,
      });
    }
  });

  return medications;
}

// ============================================================
// SALVAR MOVIMENTAÇÃO (MÚLTIPLAS MEDICAÇÕES)
// ============================================================

async function saveMovement(formData) {
  const profile = getSessionProfile();
  if (!profile) return;

  // Limpar erros
  document
    .querySelectorAll("#form-movement .form-error")
    .forEach((el) => (el.textContent = ""));

  const tipo = formData.get("tipo");
  const confirma = formData.get("confirma");
  const dataHoraStr = formData.get("dataHora");

  // Obter lista de medicações
  const medications = getMedicationsFromRows();

  // Validações
  let valid = true;

  if (medications.length === 0) {
    setErr("err-mov-medications", "Adicione pelo menos uma medicação.");
    valid = false;
  }

  // Validar data/hora
  if (!dataHoraStr) {
    setErr("err-mov-data", "Informe a data e hora.");
    valid = false;
  } else {
    const dataHora = new Date(dataHoraStr);
    const agora = new Date();
    const diasAtras30 = new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000);

    if (dataHora > agora) {
      setErr("err-mov-data", "Data/hora não pode ser futura.");
      valid = false;
    } else if (dataHora < diasAtras30) {
      setErr("err-mov-data", "Data/hora não pode ser anterior a 30 dias.");
      valid = false;
    }
  }

  if (!confirma) {
    setErr("err-mov-confirma", "Confirmação obrigatória.");
    valid = false;
  }

  // Validar dia cirúrgico para saídas
  if (tipo === "saida" && !formData.get("diaCirurgicoId")) {
    setErr("err-mov-dia-cirurgico", "Selecione o dia cirúrgico.");
    valid = false;
  }

  // Validar validade para entradas
  if (tipo === "entrada" && !formData.get("validade")) {
    setErr("err-mov-validade", "Informe a validade deste lote.");
    valid = false;
  }

  if (["perda", "descarte"].includes(tipo) && !formData.get("causa")) {
    setErr("err-mov-causa", "Informe a causa.");
    valid = false;
  }

  if (!valid) return;

  const btn = document.getElementById("btn-save-mov");
  btn.disabled = true;
  btn.innerHTML = `${icon("loading", "icon icon-sm")} Registrando ${medications.length} medicação(ões)...`;

  try {
    const decrementa = ["saida", "perda", "descarte"].includes(tipo);
    const incrementa = ["entrada", "devolucao"].includes(tipo);
    const listasControladas = ["A1", "A2", "A3", "B1", "B2"];

    // Validar cada medicação
    for (const med of medications) {
      if (decrementa && med.qtdAtual < med.quantidade) {
        setErr(
          "err-mov-medications",
          `${med.nome}: Estoque insuficiente. Disponível: ${med.qtdAtual}.`,
        );
        btn.disabled = false;
        btn.innerHTML = `${icon("check", "icon icon-sm")} Registrar`;
        return;
      }

      // Verificar SNCR para controlados
      if (tipo === "saida" && listasControladas.includes(med.lista)) {
        const sncr = formData.get("sncr")?.trim();
        if (!sncr) {
          setErr(
            "err-mov-medications",
            `${med.nome} (${med.lista}): Número de Notificação/SNCR obrigatório (Port. 344/98).`,
          );
          btn.disabled = false;
          btn.innerHTML = `${icon("check", "icon icon-sm")} Registrar`;
          return;
        }
      }
    }

    // Dados comuns a todas as movimentações
    const baseProtocol = formData.get("protocolo") || generateProtocol();

    // Para saídas, obter informações do dia cirúrgico
    let diaCirurgico = null;
    let pacientesNomes = null;
    if (tipo === "saida") {
      const diaCirurgicoId = formData.get("diaCirurgicoId");
      if (diaCirurgicoId) {
        diaCirurgico = surgicalDaysCache.find((d) => d.id === diaCirurgicoId);
        if (diaCirurgico && diaCirurgico.pacientes) {
          pacientesNomes = diaCirurgico.pacientes.map((p) => p.nome).join(", ");
        }
      }
    }

    const commonData = {
      tipo,
      dataHora: new Date(dataHoraStr).toISOString(),
      diaCirurgicoId: formData.get("diaCirurgicoId") || null,
      diaCirurgicoData: diaCirurgico?.data || null,
      pacientesNomes: pacientesNomes || null,
      sala: formData.get("sala")?.trim() || null,
      medicoResponsavel: formData.get("medicoResponsavel")?.trim() || null,
      crmResponsavel: formData.get("crmResponsavel")?.trim() || null,
      notaFiscal: formData.get("notaFiscal")?.trim() || null,
      fornecedor: formData.get("fornecedor")?.trim() || null,
      validade: formData.get("validade") || null,
      causa: formData.get("causa") || null,
      justificativa: formData.get("justificativa")?.trim() || null,
      sncr: formData.get("sncr")?.trim() || null,
      registradoPor: profile.uid || "",
      registradoPorNome: profile.nome,
      registradoPorRole: profile.role,
    };

    // Criar uma movimentação para cada medicação
    const createdMovements = [];
    for (let i = 0; i < medications.length; i++) {
      const med = medications[i];
      const movData = {
        ...commonData,
        medicamentoId: med.id,
        medicamentoNome: med.nome,
        medicamentoLista: med.lista,
        quantidade: med.quantidade,
        protocolo:
          medications.length > 1 ? `${baseProtocol}-${i + 1}` : baseProtocol,
      };

      // Criar movimentação
      const movId = await dbCreate("movements", movData);

      // Atualizar estoque
      if (decrementa)
        await decrementarEstoque(med.id, med.quantidade, profile.uid || "");
      if (incrementa)
        await incrementarEstoque(med.id, med.quantidade, profile.uid || "");

      // Auditoria em try/catch separado
      try {
        await auditLog({
          uid: profile.uid || "",
          userName: profile.nome,
          action: `MOVEMENT_${tipo.toUpperCase()}`,
          module: "movements",
          recordId: movId,
          details: `${labelTipoMovimento(tipo)}: ${med.quantidade}x ${med.nome}. Lote: ${movData.protocolo}`,
        });
      } catch (auditErr) {
        console.warn("Erro ao registrar auditoria:", auditErr);
      }

      createdMovements.push({ movId, med, movData });
    }

    // ⚠️ ALERTA REGULATÓRIO: desvio/roubo exige notificação à VISA (Port. 344/98 Art. 56)
    const causa = formData.get("causa");
    if (causa === "desvio") {
      for (const { movId, med, movData } of createdMovements) {
        try {
          await auditLog({
            uid: profile.uid || "",
            userName: profile.nome,
            action: "ALERT_DESVIO_CONTROLADO",
            module: "movements",
            recordId: movId,
            details: `⚠️ DESVIO/ROUBO de controlado: ${med.nome} (${med.lista}) — ${med.quantidade} ${med.unidade || "un"}. NOTIFICAR VISA IMEDIATAMENTE conforme Port. 344/98 Art. 56.`,
          });
        } catch (auditErr) {
          console.warn("Erro ao registrar auditoria de desvio:", auditErr);
        }
      }

      // Alerta visual persistente
      setTimeout(() => {
        alert(
          `⚠️ ATENÇÃO — NOTIFICAÇÃO OBRIGATÓRIA\n\n` +
            `Foram registrados DESVIO/ROUBO de ${medications.length} medicamento(s) controlado(s).\n\n` +
            `Conforme Port. 344/98 Art. 56, estes eventos DEVEM ser comunicados à\n` +
            `Vigilância Sanitária local (VISA) e ao CRF imediatamente.\n\n` +
            `Este alerta foi registrado na trilha de auditoria.`,
        );
      }, 500);
    }

    document.getElementById("modal-movement").close();
    showToast(
      causa === "desvio" ? "warning" : "success",
      `${medications.length} ${labelTipoMovimento(tipo)}(s) registrada(s)!`,
      `Lote: ${baseProtocol}${causa === "desvio" ? " — NOTIFICAR VISA!" : ""}`,
    );
  } catch (err) {
    showToast("error", "Erro ao registrar", err.message);
    btn.disabled = false;
    btn.innerHTML = `${icon("check", "icon icon-sm")} Registrar`;
    return;
  } finally {
    btn.disabled = false;
    btn.innerHTML = `${icon("check", "icon icon-sm")} Registrar`;
  }

  // Recarregar movimentações fora do try/catch principal
  try {
    await loadMovements();
  } catch (err) {
    console.error("Erro ao recarregar movimentações:", err);
  }
}

// ============================================================
// CARREGAR E RENDERIZAR TABELA
// ============================================================

let movsCache = [];

export async function loadMovements(filters = {}) {
  const raw = await dbReadAll("movements");
  const all = snapshotToArray(raw);
  // Filtrar movimentações canceladas para não aparecerem nos KPIs e listagens
  const ativas = all.filter((m) => m.status !== "cancelado");
  movsCache = sortBy(ativas, "dataHora", "desc");
  renderKPIsMovements(movsCache);
  applyMovFilters(filters);
}

function applyMovFilters(filters = {}) {
  const search = (document.getElementById("mov-search")?.value || "").trim();
  const tipo = document.getElementById("filter-mov-tipo")?.value || "";
  const dataInicio =
    document.getElementById("filter-mov-data-inicio")?.value || "";
  const dataFim = document.getElementById("filter-mov-data-fim")?.value || "";

  let filtered = movsCache.filter((mov) => {
    if (
      search &&
      !searchMatch(mov.medicamentoNome, search) &&
      !searchMatch(mov.pacientesNomes, search) &&
      !searchMatch(mov.protocolo, search)
    )
      return false;
    if (tipo && mov.tipo !== tipo) return false;
    if (dataInicio) {
      const d = new Date(mov.dataHora);
      if (d < new Date(dataInicio)) return false;
    }
    if (dataFim) {
      const d = new Date(mov.dataHora);
      const df = new Date(dataFim);
      df.setHours(23, 59, 59, 999);
      if (d > df) return false;
    }
    return true;
  });

  renderMovsTable(filtered);
}

function renderMovsTable(movs) {
  const tbody = document.getElementById("movs-tbody");
  if (!tbody) return;

  if (!movs.length) {
    tbody.innerHTML = `<tr><td colspan="8">
      <div class="empty-state">
        ${icon("inbox", "icon icon-xl")}
        <p class="empty-state-title">Nenhuma movimentação encontrada</p>
        <p class="empty-state-desc">Ajuste os filtros ou registre uma movimentação.</p>
      </div>
    </td></tr>`;
    return;
  }

  const tipoClass = {
    saida: "badge-danger",
    entrada: "badge-success",
    devolucao: "badge-info",
    perda: "badge-warning",
    descarte: "badge-neutral",
  };

  const profile = getSessionProfile();
  const canCancel =
    profile && ["ADMIN", "FARMACEUTICO_RT"].includes(profile.role);

  tbody.innerHTML = movs
    .slice(0, 100)
    .map((mov) => {
      const cancelado = mov.status === "cancelado";
      return `
    <tr class="${cancelado ? "row-warning" : ""}">
      <td>
        <code class="text-sm">${escapeHtml(mov.protocolo || "—")}</code>
        ${cancelado ? `<span class="badge badge-warning badge-sm ml-auto">Cancelado</span>` : ""}
      </td>
      <td>
        <div class="cell-primary">${formatDateTime(mov.dataHora)}</div>
      </td>
      <td><span class="badge ${tipoClass[mov.tipo] || "badge-neutral"}">${labelTipoMovimento(mov.tipo)}</span></td>
      <td>
        <div class="cell-primary">${escapeHtml(mov.medicamentoNome || "—")}</div>
        ${mov.medicamentoLista ? `<span class="badge badge-sm ${badgeClassLista(mov.medicamentoLista)}">${mov.medicamentoLista}</span>` : ""}
        ${mov.sncr ? `<div class="cell-secondary text-muted">SNCR: ${escapeHtml(mov.sncr)}</div>` : ""}
        ${mov.validade && mov.tipo === "entrada" ? `<div class="cell-secondary text-muted">Validade: ${formatDate(mov.validade)}</div>` : ""}
        ${mov.fornecedor && mov.tipo === "entrada" ? `<div class="cell-secondary text-muted">Fornecedor: ${escapeHtml(mov.fornecedor)}</div>` : ""}
      </td>
      <td class="text-right fw-600">${formatNumber(mov.quantidade)}</td>
      <td>
        ${mov.diaCirurgicoData ? `<div class="cell-primary">📅 ${formatDate(mov.diaCirurgicoData)}</div>` : ""}
        ${mov.pacientesNomes ? `<div class="cell-secondary">${escapeHtml(mov.pacientesNomes)}</div>` : ""}
        ${mov.causa ? `<div class="cell-secondary text-warning">${escapeHtml(mov.causa)}</div>` : ""}
        ${!mov.diaCirurgicoData && !mov.pacientesNomes && !mov.causa ? "—" : ""}
      </td>
      <td>
        <div class="cell-primary">${escapeHtml(mov.registradoPorNome || "—")}</div>
        ${mov.registradoPorRole ? `<div class="cell-secondary">${escapeHtml(mov.registradoPorRole)}</div>` : ""}
      </td>
      <td>
        <div class="action-group">
          <div class="cell-secondary truncate" title="${escapeHtml(mov.justificativa || "")}" style="max-width:120px">${escapeHtml(mov.justificativa ? mov.justificativa.substring(0, 40) : "—")}</div>
          ${
            canCancel && !cancelado
              ? `<button class="btn btn-icon btn-ghost btn-danger-ghost" data-action="cancel-mov" data-id="${mov.id}" title="Cancelar movimentação (auditado)">
            ${icon("xCircle", "icon icon-sm")}
          </button>`
              : ""
          }
        </div>
      </td>
    </tr>`;
    })
    .join("");
}

function renderKPIsMovements(movs) {
  const grid = document.getElementById("movs-kpi-grid");
  if (!grid) return;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const doHoje = movs.filter((m) => m.dataHora && new Date(m.dataHora) >= hoje);
  const saidas = doHoje.filter((m) => m.tipo === "saida").length;
  const entradas = doHoje.filter((m) => m.tipo === "entrada").length;
  const perdas = movs.filter((m) =>
    ["perda", "descarte"].includes(m.tipo),
  ).length;
  const total30 = movs.filter((m) => {
    const d = new Date(m.dataHora);
    return d >= new Date(Date.now() - 30 * 24 * 3600 * 1000);
  }).length;

  grid.innerHTML = `
    <div class="kpi-card">
      <div class="kpi-icon kpi-icon-blue">${icon("activity", "icon icon-md")}</div>
      <div class="kpi-body">
        <p class="kpi-label">Movimentações Hoje</p>
        <p class="kpi-value">${doHoje.length}</p>
        <p class="kpi-sub">${saidas} saídas / ${entradas} entradas</p>
      </div>
    </div>
    <div class="kpi-card">
      <div class="kpi-icon kpi-icon-red">${icon("minus", "icon icon-md")}</div>
      <div class="kpi-body">
        <p class="kpi-label">Saídas Hoje</p>
        <p class="kpi-value">${saidas}</p>
        <p class="kpi-sub">registros hoje</p>
      </div>
    </div>
    <div class="kpi-card">
      <div class="kpi-icon kpi-icon-green">${icon("plus", "icon icon-md")}</div>
      <div class="kpi-body">
        <p class="kpi-label">Entradas Hoje</p>
        <p class="kpi-value">${entradas}</p>
        <p class="kpi-sub">registros hoje</p>
      </div>
    </div>
    <div class="kpi-card ${perdas > 0 ? "kpi-card-warning" : ""}">
      <div class="kpi-icon kpi-icon-yellow">${icon("alertTriangle", "icon icon-md")}</div>
      <div class="kpi-body">
        <p class="kpi-label">Perdas/Descartes (total)</p>
        <p class="kpi-value">${perdas}</p>
        <p class="kpi-sub">${total30} movimentos em 30 dias</p>
      </div>
    </div>
  `;
}

// ============================================================
// EXPORTAR CSV
// ============================================================

function exportMovementsCSV() {
  const data = movsCache.map((m) => ({
    Lote: m.protocolo || "",
    "Data/Hora": formatDateTime(m.dataHora),
    Tipo: labelTipoMovimento(m.tipo),
    Medicamento: m.medicamentoNome || "",
    Lista: m.medicamentoLista || "",
    Quantidade: m.quantidade,
    Validade: m.validade ? formatDate(m.validade) : "",
    "Dia Cirúrgico": m.diaCirurgicoData ? formatDate(m.diaCirurgicoData) : "",
    Pacientes: m.pacientesNomes || "",
    Sala: m.sala || "",
    Médico: m.medicoResponsavel || "",
    "CRM/CRF": m.crmResponsavel || "",
    "SNCR/Nº Notificação": m.sncr || "",
    "NF/Pedido": m.notaFiscal || "",
    Fornecedor: m.fornecedor || "",
    Causa: m.causa || "",
    Justificativa: m.justificativa || "",
    "Registrado por": m.registradoPorNome || "",
    Role: m.registradoPorRole || "",
  }));
  exportCSV(data, "movimentacoes");
  showToast("success", "CSV exportado!", `${data.length} movimentações.`);
}

// ============================================================
// EVENT LISTENERS
// ============================================================

function setupMovementsListeners() {
  // Botões de abrir modal por tipo
  document.querySelectorAll("[data-open-mov]").forEach((btn) => {
    btn.addEventListener("click", () => openMovementModal(btn.dataset.openMov));
  });

  // Fechar modal
  document
    .getElementById("close-modal-mov")
    ?.addEventListener("click", () =>
      document.getElementById("modal-movement")?.close(),
    );
  document
    .getElementById("cancel-modal-mov")
    ?.addEventListener("click", () =>
      document.getElementById("modal-movement")?.close(),
    );

  // Submit
  document
    .getElementById("form-movement")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      await saveMovement(new FormData(e.target));
    });

  // Gerar lote automático
  document.getElementById("btn-gen-protocol")?.addEventListener("click", () => {
    document.getElementById("mov-protocolo").value = generateProtocol();
  });

  // Adicionar linha de medicação
  document
    .getElementById("btn-add-medication-row")
    ?.addEventListener("click", () => {
      addMedicationRow();
    });

  // Listener para seleção de dia cirúrgico
  document
    .getElementById("mov-dia-cirurgico")
    ?.addEventListener("change", (e) => {
      const dayId = e.target.value;
      if (dayId) {
        showSurgicalDayPatients(dayId);
      } else {
        document.getElementById("mov-pacientes-info")?.classList.add("hidden");
      }
    });

  // Cancelamento lógico de movimentação (imutabilidade — RDC 204/2017)
  document
    .getElementById("movs-tbody")
    ?.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-action='cancel-mov']");
      if (!btn) return;
      const movId = btn.dataset.id;
      const profile = getSessionProfile();
      const motivo = prompt(
        "CANCELAMENTO DE MOVIMENTAÇÃO\n\nInforme o motivo do cancelamento (obrigatório para auditoria):",
      );
      if (!motivo?.trim()) {
        showToast("warning", "Cancelamento abortado.", "Motivo não informado.");
        return;
      }
      try {
        // Buscar a movimentação para reverter o estoque
        const mov = await dbRead("movements", movId);
        if (!mov) {
          throw new Error("Movimentação não encontrada.");
        }

        // Reverter o estoque conforme o tipo de movimentação
        const tiposDecremento = ["saida", "perda", "descarte"];
        const tiposIncremento = ["entrada", "devolucao"];

        if (tiposDecremento.includes(mov.tipo)) {
          // Se foi saída/perda/descarte, devolver ao estoque (incrementar)
          await incrementarEstoque(
            mov.medicamentoId,
            mov.quantidade,
            profile?.uid || "",
          );
        } else if (tiposIncremento.includes(mov.tipo)) {
          // Se foi entrada/devolução, remover do estoque (sem validação de estoque mínimo)
          await ajustarEstoque(
            mov.medicamentoId,
            -mov.quantidade,
            profile?.uid || "",
          );
        }

        // Marcar como cancelado
        await dbUpdate("movements", movId, {
          status: "cancelado",
          canceladoPor: profile?.nome || "",
          canceladoEm: Date.now(),
          motivoCancelamento: motivo.trim(),
        });

        showToast(
          "success",
          "Movimentação cancelada.",
          "Estoque revertido. Registro mantido na trilha de auditoria.",
        );

        // Auditoria em try/catch separado
        try {
          await auditLog({
            uid: profile?.uid || "",
            userName: profile?.nome || "",
            action: "CANCEL_MOVEMENT",
            module: "movements",
            recordId: movId,
            details: `Movimentação ${mov.tipo} cancelada e estoque revertido (${mov.quantidade}x ${mov.medicamentoNome}). Motivo: ${motivo.trim()}`,
          });
        } catch (auditErr) {
          console.warn(
            "Erro ao registrar auditoria de cancelamento:",
            auditErr,
          );
        }
      } catch (err) {
        showToast("error", "Erro ao cancelar", err.message);
        return;
      }

      // Recarregar movimentações fora do try/catch para evitar erro falso-positivo
      try {
        await loadMovements();
      } catch (err) {
        console.error("Erro ao recarregar movimentações:", err);
      }
    });

  // Filtros
  const debouncedFilter = debounce(() => applyMovFilters(), 300);
  document
    .getElementById("mov-search")
    ?.addEventListener("input", debouncedFilter);
  document
    .getElementById("filter-mov-tipo")
    ?.addEventListener("change", () => applyMovFilters());
  document
    .getElementById("filter-mov-data-inicio")
    ?.addEventListener("change", () => applyMovFilters());
  document
    .getElementById("filter-mov-data-fim")
    ?.addEventListener("change", () => applyMovFilters());

  // Limpar filtros
  document
    .getElementById("btn-clear-mov-filters")
    ?.addEventListener("click", () => {
      document.getElementById("mov-search").value = "";
      document.getElementById("filter-mov-tipo").value = "";
      document.getElementById("filter-mov-data-inicio").value = "";
      document.getElementById("filter-mov-data-fim").value = "";
      applyMovFilters();
    });

  // Exportar
  document
    .getElementById("btn-export-movs")
    ?.addEventListener("click", exportMovementsCSV);
}

// ============================================================
// HELPERS
// ============================================================

function setErr(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}
