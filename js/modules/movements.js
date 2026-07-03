/**
 * @file movements.js
 * @description Módulo de movimentações de medicamentos.
 * Registro de saídas, entradas, devoluções, perdas e descartes conforme Port. 344/98.
 * Geração automática de protocolo, validação de estoque, histórico com filtros.
 */

import { dbReadAll, dbRead, dbCreate, dbUpdate, auditLog } from "../core/db.js";
import { decrementarEstoque, incrementarEstoque } from "../core/db.js";
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
        <input type="search" id="mov-search" class="form-input" placeholder="Buscar por medicamento, paciente, protocolo...">
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
                <th>Protocolo</th>
                <th>Data/Hora</th>
                <th>Tipo</th>
                <th>Medicamento</th>
                <th>Qtd.</th>
                <th>Paciente / Cirurgia</th>
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
            <div class="form-group form-col-2">
              <label class="form-label" for="mov-medicamento-id">Medicamento <span class="required">*</span></label>
              <select id="mov-medicamento-id" name="medicamentoId" class="form-select" required>
                <option value="">Carregando...</option>
              </select>
              <span class="form-error" id="err-mov-med"></span>
              <div id="mov-stock-info" class="form-hint"></div>
            </div>

            <div class="form-group">
              <label class="form-label" for="mov-quantidade">Quantidade <span class="required">*</span></label>
              <input type="number" id="mov-quantidade" name="quantidade" class="form-input" required min="1" step="1">
              <span class="form-error" id="err-mov-qtd"></span>
            </div>

            <div class="form-group">
              <label class="form-label" for="mov-protocolo">Nº Protocolo</label>
              <div class="input-group">
                <input type="text" id="mov-protocolo" name="protocolo" class="form-input" readonly>
                <button type="button" class="btn btn-secondary" id="btn-gen-protocol" title="Gerar novo protocolo">
                  ${icon("refresh", "icon icon-sm")}
                </button>
              </div>
            </div>

            <!-- Campos de saída / uso cirúrgico -->
            <div id="mov-fields-saida" class="form-col-2 form-grid form-grid-2">
              <div class="form-group form-col-2">
                <label class="form-label" for="mov-paciente-nome">Paciente</label>
                <input type="text" id="mov-paciente-nome" name="pacienteNome" class="form-input" maxlength="200" placeholder="Nome completo do paciente">
              </div>
              <div class="form-group">
                <label class="form-label" for="mov-prontuario">Nº Prontuário</label>
                <input type="text" id="mov-prontuario" name="prontuario" class="form-input" maxlength="30">
              </div>
              <div class="form-group">
                <label class="form-label" for="mov-cirurgia">Tipo de Cirurgia</label>
                <input type="text" id="mov-cirurgia" name="tipoCirurgia" class="form-input" maxlength="200" placeholder="Ex: Apendicectomia">
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
              <div class="form-group form-col-2" id="mov-sncr-group" style="display:none">
                <label class="form-label" for="mov-sncr">
                  Nº Notificação / SNCR <span class="required">*</span>
                  <span class="badge badge-danger badge-sm ml-auto">Port. 344/98 • RDC 873/2024</span>
                </label>
                <input type="text" id="mov-sncr" name="sncr" class="form-input" maxlength="50"
                  placeholder="Número da Notificação de Receita ou código SNCR">
                <span class="form-error" id="err-mov-sncr"></span>
                <span class="form-hint text-sm text-muted">Obrigatório para medicamentos das Listas A1, A2, A3, B1 e B2 da Portaria 344/98.</span>
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
                <input type="text" id="mov-fornecedor" name="fornecedor" class="form-input" maxlength="100">
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

  // Gerar protocolo
  document.getElementById("mov-protocolo").value = generateProtocol();

  // Carregar medicamentos no select
  await populateMedSelect(medId);

  // Limpar form
  document.getElementById("form-movement").reset();
  document.getElementById("mov-tipo").value = type;
  document.getElementById("mov-protocolo").value = generateProtocol();

  // Info de alerta por tipo
  const alertMap = {
    saida:
      "Saída para procedimento cirúrgico. Deve ser registrada antes do uso.",
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

  if (medId) {
    document.getElementById("mov-medicamento-id").value = medId;
    await updateStockInfo(medId);
  }

  modal.showModal();
}

async function populateMedSelect(preselect = null) {
  const select = document.getElementById("mov-medicamento-id");
  if (!select) return;
  select.innerHTML = '<option value="">Carregando...</option>';

  try {
    const raw = await dbReadAll("medications");
    const meds = snapshotToArray(raw)
      .filter((m) => m.status === "ativo")
      .sort((a, b) => a.nome.localeCompare(b.nome));
    select.innerHTML =
      '<option value="">Selecione o medicamento...</option>' +
      meds
        .map(
          (m) =>
            `<option value="${m.id}" ${m.id === preselect ? "selected" : ""}>${escapeHtml(m.nome)} — ${m.lista} — Qtd: ${m.qtdAtual ?? 0} ${m.unidade || ""}</option>`,
        )
        .join("");
    if (preselect) await updateStockInfo(preselect);
  } catch {
    select.innerHTML = '<option value="">Erro ao carregar</option>';
  }
}

async function updateStockInfo(medId) {
  const info = document.getElementById("mov-stock-info");
  if (!info || !medId) return;
  const med = await dbRead("medications", medId);
  if (!med) return;

  const dias = diasRestantes(med.validade);
  const vencido = med.validade && dias < 0;
  const validadeText = med.validade
    ? `Validade: ${formatDate(med.validade)} (${textoDiasRestantes(dias)})`
    : "";

  info.innerHTML =
    `Estoque: <strong>${formatNumber(med.qtdAtual ?? 0)} ${med.unidade || ""}</strong>. ` +
    (vencido
      ? `<span class="text-danger fw-600">❌ MEDICAMENTO VENCIDO — saída bloqueada</span>`
      : validadeText
        ? `<span class="${dias <= 30 ? "text-warning" : ""}">${validadeText}</span>`
        : "");

  // Mostrar/ocultar campo SNCR com base na lista do medicamento
  const listasControladas = ["A1", "A2", "A3", "B1", "B2"];
  const sncrGroup = document.getElementById("mov-sncr-group");
  const tipo = document.getElementById("mov-tipo")?.value;
  if (sncrGroup) {
    const exibir = tipo === "saida" && listasControladas.includes(med.lista);
    sncrGroup.style.display = exibir ? "" : "none";
  }
}

// ============================================================
// SALVAR MOVIMENTAÇÃO
// ============================================================

async function saveMovement(formData) {
  const profile = getSessionProfile();
  if (!profile) return;

  // Limpar erros
  document
    .querySelectorAll("#form-movement .form-error")
    .forEach((el) => (el.textContent = ""));

  const tipo = formData.get("tipo");
  const medId = formData.get("medicamentoId");
  const quantidade = parseInt(formData.get("quantidade"), 10);
  const confirma = formData.get("confirma");

  // Validações
  let valid = true;
  if (!medId) {
    setErr("err-mov-med", "Selecione o medicamento.");
    valid = false;
  }
  if (!quantidade || quantidade < 1) {
    setErr("err-mov-qtd", "Informe a quantidade.");
    valid = false;
  }
  if (!confirma) {
    setErr("err-mov-confirma", "Confirmação obrigatória.");
    valid = false;
  }
  if (["perda", "descarte"].includes(tipo) && !formData.get("causa")) {
    setErr("err-mov-causa", "Informe a causa.");
    valid = false;
  }
  if (!valid) return;

  const btn = document.getElementById("btn-save-mov");
  btn.disabled = true;
  btn.innerHTML = `${icon("loading", "icon icon-sm")} Registrando...`;

  try {
    // Verificar estoque para saídas/perdas/descartes
    const med = await dbRead("medications", medId);
    if (!med) throw new Error("Medicamento não encontrado.");

    const decrementa = ["saida", "perda", "descarte"].includes(tipo);
    const incrementa = ["entrada", "devolucao"].includes(tipo);

    if (decrementa && (med.qtdAtual ?? 0) < quantidade) {
      setErr(
        "err-mov-qtd",
        `Estoque insuficiente. Disponível: ${med.qtdAtual ?? 0}.`,
      );
      return;
    }

    // ✔ Bloquear saída de medicamento VENCIDO (Port. 344/98 Art. 57)
    if (decrementa && med.validade) {
      const diasVal = diasRestantes(med.validade);
      if (diasVal < 0) {
        setErr(
          "err-mov-qtd",
          `❌ Medicamento VENCIDO há ${Math.abs(diasVal)} dia(s) (validade: ${formatDate(med.validade)}). Saída bloqueada conforme Port. 344/98 Art. 57.`,
        );
        return;
      }
    }

    // ✔ Exigir SNCR/Número de Notificação para controlados das Listas A e B (RDC 873/2024)
    const listasControladas = ["A1", "A2", "A3", "B1", "B2"];
    if (tipo === "saida" && listasControladas.includes(med.lista)) {
      const sncr = formData.get("sncr")?.trim();
      if (!sncr) {
        setErr(
          "err-mov-sncr",
          `Número de Notificação/SNCR obrigatório para ${med.lista} (Port. 344/98 + RDC 873/2024).`,
        );
        return;
      }
    }

    const movData = {
      tipo,
      medicamentoId: medId,
      medicamentoNome: med.nome,
      medicamentoLista: med.lista,
      quantidade,
      protocolo: formData.get("protocolo") || generateProtocol(),
      pacienteNome: formData.get("pacienteNome")?.trim() || null,
      prontuario: formData.get("prontuario")?.trim() || null,
      tipoCirurgia: formData.get("tipoCirurgia")?.trim() || null,
      sala: formData.get("sala")?.trim() || null,
      medicoResponsavel: formData.get("medicoResponsavel")?.trim() || null,
      crmResponsavel: formData.get("crmResponsavel")?.trim() || null,
      notaFiscal: formData.get("notaFiscal")?.trim() || null,
      fornecedor: formData.get("fornecedor")?.trim() || null,
      causa: formData.get("causa") || null,
      justificativa: formData.get("justificativa")?.trim() || null,
      sncr: formData.get("sncr")?.trim() || null,
      registradoPor: profile.uid || "",
      registradoPorNome: profile.nome,
      registradoPorRole: profile.role,
    };

    // Criar movimentação
    const movId = await dbCreate("movements", movData);

    // Atualizar estoque
    if (decrementa)
      await decrementarEstoque(medId, quantidade, profile.uid || "");
    if (incrementa)
      await incrementarEstoque(medId, quantidade, profile.uid || "");

    // Auditoria
    await auditLog({
      uid: profile.uid || "",
      userName: profile.nome,
      action: `MOVEMENT_${tipo.toUpperCase()}`,
      module: "movements",
      recordId: movId,
      details: `${labelTipoMovimento(tipo)}: ${quantidade}x ${med.nome}. Protocolo: ${movData.protocolo}`,
    });

    // ⚠️ ALERTA REGULATÓRIO: desvio/roubo exige notificação à VISA (Port. 344/98 Art. 56)
    const causa = formData.get("causa");
    if (causa === "desvio") {
      await auditLog({
        uid: profile.uid || "",
        userName: profile.nome,
        action: "ALERT_DESVIO_CONTROLADO",
        module: "movements",
        recordId: movId,
        details: `⚠️ DESVIO/ROUBO de controlado: ${med.nome} (${med.lista}) — ${quantidade} ${med.unidade || "un"}. NOTIFICAR VISA IMEDIATAMENTE conforme Port. 344/98 Art. 56.`,
      });
      // Alerta visual persistente
      setTimeout(() => {
        alert(
          `⚠️ ATENÇÃO — NOTIFICAÇÃO OBRIGATÓRIA\n\n` +
            `Foi registrado um DESVIO/ROUBO do medicamento controlado:\n` +
            `${med.nome} (Lista ${med.lista}) — ${quantidade} ${med.unidade || "un"}\n\n` +
            `Conforme Port. 344/98 Art. 56, este evento DEVE ser comunicado à\n` +
            `Vigilância Sanitária local (VISA) e ao CRF imediatamente.\n\n` +
            `Protocolo: ${movData.protocolo}\n` +
            `Este alerta foi registrado na trilha de auditoria.`,
        );
      }, 500);
    }

    document.getElementById("modal-movement").close();
    showToast(
      causa === "desvio" ? "warning" : "success",
      `${labelTipoMovimento(tipo)} registrada!`,
      `Protocolo: ${movData.protocolo}${causa === "desvio" ? " — NOTIFICAR VISA!" : ""}`,
    );
    await loadMovements();
  } catch (err) {
    showToast("error", "Erro ao registrar", err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = `${icon("check", "icon icon-sm")} Registrar`;
  }
}

// ============================================================
// CARREGAR E RENDERIZAR TABELA
// ============================================================

let movsCache = [];

export async function loadMovements(filters = {}) {
  const raw = await dbReadAll("movements");
  const all = snapshotToArray(raw);
  movsCache = sortBy(all, "dataHora", "desc");
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
      !searchMatch(mov.pacienteNome, search) &&
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
      </td>
      <td class="text-right fw-600">${formatNumber(mov.quantidade)}</td>
      <td>
        ${mov.pacienteNome ? `<div class="cell-primary">${escapeHtml(mov.pacienteNome)}</div>` : ""}
        ${mov.tipoCirurgia ? `<div class="cell-secondary">${escapeHtml(mov.tipoCirurgia)}</div>` : ""}
        ${mov.causa ? `<div class="cell-secondary text-warning">${escapeHtml(mov.causa)}</div>` : ""}
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
    Protocolo: m.protocolo || "",
    "Data/Hora": formatDateTime(m.dataHora),
    Tipo: labelTipoMovimento(m.tipo),
    Medicamento: m.medicamentoNome || "",
    Lista: m.medicamentoLista || "",
    Quantidade: m.quantidade,
    Paciente: m.pacienteNome || "",
    Prontuário: m.prontuario || "",
    Cirurgia: m.tipoCirurgia || "",
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

  // Gerar protocolo
  document.getElementById("btn-gen-protocol")?.addEventListener("click", () => {
    document.getElementById("mov-protocolo").value = generateProtocol();
  });

  // Atualizar info de estoque ao mudar medicamento
  document
    .getElementById("mov-medicamento-id")
    ?.addEventListener("change", async (e) => {
      if (e.target.value) await updateStockInfo(e.target.value);
      else document.getElementById("mov-stock-info").textContent = "";
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
        await dbUpdate("movements", movId, {
          status: "cancelado",
          canceladoPor: profile?.nome || "",
          canceladoEm: Date.now(),
          motivoCancelamento: motivo.trim(),
        });
        await auditLog({
          uid: profile?.uid || "",
          userName: profile?.nome || "",
          action: "CANCEL_MOVEMENT",
          module: "movements",
          recordId: movId,
          details: `Movimentação cancelada. Motivo: ${motivo.trim()}`,
        });
        showToast(
          "success",
          "Movimentação cancelada.",
          "Registro mantido na trilha de auditoria.",
        );
        await loadMovements();
      } catch (err) {
        showToast("error", "Erro ao cancelar", err.message);
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

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
