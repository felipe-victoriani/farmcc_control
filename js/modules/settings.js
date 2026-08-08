/**
 * @file settings.js
 * @description Módulo de Configurações institucionais do sistema.
 */

import { dbRead, dbSet, auditLog } from "../core/db.js";
import { getSessionProfile } from "../core/auth.js";
import { showToast } from "../shared/notifications.js";
import { maskCNPJ, escapeHtml, friendlyError } from "../shared/utils.js";
import { icon } from "../shared/icons.js";

export async function renderSettingsModule() {
  const main = document.getElementById("app-main");
  const settings = (await dbRead("settings", "main").catch(() => ({}))) || {};

  main.innerHTML = `
  <section class="module-section">
    <div class="section-header">
      <div>
        <h1 class="section-title">Configurações</h1>
        <p class="section-subtitle">Dados institucionais e configurações do sistema</p>
      </div>
    </div>
    <div class="card" style="max-width:700px">
      <div class="card-body">
        <form id="form-settings" novalidate>
          <div class="form-grid form-grid-2">
            <div class="form-group form-col-2">
              <label class="form-label" for="cfg-institution">Nome da Instituição <span class="required">*</span></label>
              <input type="text" id="cfg-institution" name="institutionName" class="form-input" required maxlength="200" value="${escapeHtml(settings.institutionName || "")}">
            </div>
            <div class="form-group form-col-2">
              <label class="form-label" for="cfg-address">Endereço</label>
              <input type="text" id="cfg-address" name="address" class="form-input" maxlength="300" value="${escapeHtml(settings.address || "")}">
            </div>
            <div class="form-group">
              <label class="form-label" for="cfg-cnpj">CNPJ</label>
              <input type="text" id="cfg-cnpj" name="cnpj" class="form-input" maxlength="18" value="${escapeHtml(settings.cnpj || "")}" placeholder="00.000.000/0000-00">
            </div>
            <div class="form-group">
              <label class="form-label" for="cfg-cnes">Nº CNES</label>
              <input type="text" id="cfg-cnes" name="cnes" class="form-input" maxlength="20" value="${escapeHtml(settings.cnes || "")}">
            </div>
            <div class="form-group">
              <label class="form-label" for="cfg-anvisa">Nº Autorização ANVISA</label>
              <input type="text" id="cfg-anvisa" name="anvisaNumber" class="form-input" maxlength="50" value="${escapeHtml(settings.anvisaNumber || "")}">
            </div>
            <div class="form-group">
              <label class="form-label" for="cfg-rt">Farmacêutico RT <span class="required">*</span></label>
              <input type="text" id="cfg-rt" name="responsavelTecnico" class="form-input" required maxlength="100" value="${escapeHtml(settings.responsavelTecnico || "")}">
            </div>
            <div class="form-group">
              <label class="form-label" for="cfg-crf">CRF Nº</label>
              <input type="text" id="cfg-crf" name="crfNumero" class="form-input" maxlength="20" value="${escapeHtml(settings.crfNumero || "")}">
            </div>
          </div>
          <div class="form-footer">
            <button type="submit" class="btn btn-primary">${icon("check", "icon icon-sm")} Salvar Configurações</button>
          </div>
        </form>
      </div>
    </div>
  </section>
  `;

  document.getElementById("cfg-cnpj")?.addEventListener("input", (e) => {
    e.target.value = maskCNPJ(e.target.value);
  });

  document
    .getElementById("form-settings")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const data = Object.fromEntries(fd.entries());
      try {
        await dbSet("settings/main", data);
        const profile = getSessionProfile();
        await auditLog({
          uid: profile?.uid || "",
          userName: profile?.nome || "",
          action: "UPDATE_SETTINGS",
          module: "settings",
          recordId: "main",
          details: "Configurações salvas.",
        });
        showToast("success", "Configurações salvas!");
        // Notifica o shell para atualizar o rodapé com o novo nome da instituição
        document.dispatchEvent(new CustomEvent("farmac:refreshFooter"));
      } catch (err) {
        showToast("error", "Erro ao salvar", friendlyError(err));
      }
    });
}
