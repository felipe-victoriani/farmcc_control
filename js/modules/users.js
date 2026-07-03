/**
 * @file users.js
 * @description Módulo de Gerenciamento de Usuários — perfis e controle de acesso.
 */

import { dbReadAll, dbCreate, dbUpdate, dbSet, auditLog } from "../core/db.js";
import { getSessionProfile } from "../core/auth.js";
import { showToast } from "../shared/notifications.js";
import { icon } from "../shared/icons.js";
import {
  snapshotToArray,
  sortBy,
  formatDateTime,
  generateId,
  escapeHtml,
} from "../shared/utils.js";

// ============================================================
// HELPERS LOCAIS
// ============================================================

function labelRole(role) {
  return (
    {
      ADMIN: "Administrador",
      FARMACEUTICO_RT: "Farmacêutico RT",
      FARMACEUTICO: "Farmacêutico",
      TECNICO_FARMACIA: "Técnico em Farmácia",
      MEDICO_ANESTESISTA: "Médico / Anestesista",
      ENFERMEIRO_RT: "Enfermeiro RT",
      GESTOR: "Gestor",
    }[role] ||
    role ||
    "—"
  );
}

// ============================================================
// RENDER
// ============================================================

export async function renderUsersModule() {
  const main = document.getElementById("app-main");
  const raw = await dbReadAll("users");
  const users = sortBy(snapshotToArray(raw), "nome");

  main.innerHTML = `
  <section class="module-section">
    <div class="section-header">
      <div>
        <h1 class="section-title">Usuários</h1>
        <p class="section-subtitle">Gerenciamento de acesso ao sistema</p>
      </div>
      <div class="section-actions">
        <button class="btn btn-primary btn-sm" id="btn-new-user">${icon("plus", "icon icon-sm")} Novo Usuário</button>
      </div>
    </div>

    <div class="card">
      <div class="card-body p-0">
        <table class="data-table">
          <thead>
            <tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>CRF</th><th>Status</th><th>Último Login</th><th class="text-right">Ações</th></tr>
          </thead>
          <tbody>
            ${
              users
                .map(
                  (u) => `<tr>
              <td>${escapeHtml(u.nome || "—")}</td>
              <td>${escapeHtml(u.email || "—")}</td>
              <td><span class="badge badge-neutral">${escapeHtml(labelRole(u.role))}</span></td>
              <td>${escapeHtml(u.crfNumero || "—")}</td>
              <td><span class="badge ${u.ativo ? "badge-success" : "badge-neutral"}">${u.ativo ? "Ativo" : "Inativo"}</span></td>
              <td>${u.ultimoLogin ? formatDateTime(u.ultimoLogin) : "—"}</td>
              <td class="text-right">
                <button class="btn btn-icon btn-ghost" data-action="edit-user" data-uid="${u.id}" title="Editar">${icon("edit", "icon icon-sm")}</button>
                <button class="btn btn-icon btn-ghost" data-action="toggle-user" data-uid="${u.id}" data-ativo="${u.ativo}" title="${u.ativo ? "Desativar" : "Ativar"}">
                  ${icon(u.ativo ? "lock" : "unlock", "icon icon-sm")}
                </button>
              </td>
            </tr>`,
                )
                .join("") ||
              '<tr><td colspan="7" class="text-muted text-center">Nenhum usuário.</td></tr>'
            }
          </tbody>
        </table>
      </div>
    </div>

    <div class="alert alert-info mt-3">
      ${icon("users", "icon icon-sm")} Para criar um novo usuário, clique em <strong>Novo Usuário</strong>, preencha os dados e defina uma senha inicial. O acesso é criado automaticamente.
    </div>
  </section>

  <!-- Modal usuário -->
  <dialog id="modal-user" class="modal" aria-modal="true">
    <div class="modal-content modal-md">
      <div class="modal-header">
        <h2 class="modal-title" id="modal-user-title">Editar Usuário</h2>
        <button class="btn btn-icon" id="close-modal-user">${icon("xClose", "icon icon-sm")}</button>
      </div>
      <form id="form-user" novalidate>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label" for="u-nome">Nome Completo <span class="required">*</span></label>
            <input type="text" id="u-nome" name="nome" class="form-input" required maxlength="100">
          </div>
          <div class="form-group">
            <label class="form-label" for="u-email">E-mail <span class="required">*</span></label>
            <input type="email" id="u-email" name="email" class="form-input" required maxlength="100" autocomplete="off">
          </div>
          <div class="form-group" id="senha-field-group">
            <label class="form-label" for="u-senha">Senha inicial <span class="required">*</span></label>
            <input type="password" id="u-senha" name="senha" class="form-input" minlength="6" maxlength="50" autocomplete="new-password" placeholder="Mínimo 6 caracteres">
            <span class="form-hint text-sm text-muted">O usuário poderá alterar a senha após o primeiro acesso.</span>
          </div>
          <div class="form-group">
            <label class="form-label" for="u-role">Perfil de Acesso <span class="required">*</span></label>
            <select id="u-role" name="role" class="form-select" required>
              <option value="ADMIN">Administrador</option>
              <option value="FARMACEUTICO_RT">Farmacêutico RT</option>
              <option value="FARMACEUTICO">Farmacêutico</option>
              <option value="TECNICO_FARMACIA">Técnico em Farmácia</option>
              <option value="MEDICO_ANESTESISTA">Médico / Anestesista</option>
              <option value="ENFERMEIRO_RT">Enfermeiro RT</option>
              <option value="GESTOR">Gestor (somente leitura)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="u-crf">CRF Nº</label>
            <input type="text" id="u-crf" name="crfNumero" class="form-input" maxlength="20">
          </div>
          <div class="form-group">
            <div class="form-checkbox-group">
              <input type="checkbox" id="u-ativo" name="ativo" class="form-checkbox" checked>
              <label class="form-label" for="u-ativo">Usuário ativo</label>
            </div>
          </div>
          <div class="form-group" id="uid-field-group" style="display:none">
            <input type="hidden" id="u-uid-input" name="uid_auth">
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" id="cancel-modal-user">Cancelar</button>
          <button type="submit" class="btn btn-primary">${icon("check", "icon icon-sm")} Salvar</button>
        </div>
      </form>
    </div>
  </dialog>
  `;

  document
    .querySelector(".data-table tbody")
    ?.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const { action, uid, ativo } = btn.dataset;
      if (action === "edit-user") openUserModal(uid, users);
      if (action === "toggle-user")
        await toggleUser(uid, ativo === "true", users);
    });

  document
    .getElementById("btn-new-user")
    ?.addEventListener("click", () => openUserModal(null, users));
  document
    .getElementById("close-modal-user")
    ?.addEventListener("click", () =>
      document.getElementById("modal-user")?.close(),
    );
  document
    .getElementById("cancel-modal-user")
    ?.addEventListener("click", () =>
      document.getElementById("modal-user")?.close(),
    );

  document
    .getElementById("form-user")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const editUid = fd.get("uid_auth")?.trim() || null;
      const isEdit = !!editUid;
      const email = fd.get("email")?.trim() || "";
      const senha = fd.get("senha")?.trim() || "";
      const data = {
        nome: fd.get("nome")?.trim(),
        email,
        role: fd.get("role"),
        crfNumero: fd.get("crfNumero")?.trim() || "",
        ativo: fd.get("ativo") === "on",
      };

      if (!data.nome || !data.role || !email) {
        showToast("warning", "Preencha os campos obrigatórios.");
        return;
      }

      const saveBtn = e.target.querySelector("[type=submit]");
      saveBtn.disabled = true;

      try {
        if (isEdit) {
          // Edição — apenas atualiza o perfil no banco
          await dbUpdate("users", editUid, data);
          showToast("success", "Usuário atualizado!");
        } else {
          // Novo usuário — cria conta no Firebase Auth via REST API
          if (!senha || senha.length < 6) {
            showToast("warning", "A senha deve ter no mínimo 6 caracteres.");
            saveBtn.disabled = false;
            return;
          }
          const uid = await createFirebaseAuthUser(email, senha);
          await dbSet(`users/${uid}`, { ...data, criadoEm: Date.now() });
          showToast(
            "success",
            "Usuário criado com acesso ao sistema!",
            data.nome,
          );
        }
        document.getElementById("modal-user")?.close();
        await renderUsersModule();
      } catch (err) {
        showToast("error", "Erro ao salvar", err.message);
      } finally {
        saveBtn.disabled = false;
      }
    });
}

/**
 * Cria uma conta no Firebase Authentication via REST API.
 * Não afeta a sessão do usuário atual.
 */
async function createFirebaseAuthUser(email, password) {
  const API_KEY = "AIzaSyARRlHgnSmqhagK-WO2Xk51WnrfTOamOsE";
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: false }),
    },
  );
  const json = await res.json();
  if (json.error) {
    const msg =
      {
        EMAIL_EXISTS: "Este e-mail já está em uso.",
        INVALID_EMAIL: "E-mail inválido.",
        "WEAK_PASSWORD : Password should be at least 6 characters":
          "A senha deve ter no mínimo 6 caracteres.",
      }[json.error.message] || json.error.message;
    throw new Error(msg);
  }
  return json.localId; // UID do Firebase Auth
}

function openUserModal(uid, users) {
  const modal = document.getElementById("modal-user");
  if (!modal) return;
  document.getElementById("form-user").reset();

  if (uid) {
    const u = users.find((u) => u.id === uid);
    if (!u) return;
    document.getElementById("modal-user-title").textContent = "Editar Usuário";
    // Em edição: campo UID vira hidden com o id do registro, sem label
    document.getElementById("uid-field-group").style.display = "none";
    document.getElementById("u-uid-input").value = uid;
    document.getElementById("senha-field-group").style.display = "none";
    document.getElementById("u-email").readOnly = true;
    document.getElementById("u-nome").value = u.nome || "";
    document.getElementById("u-email").value = u.email || "";
    document.getElementById("u-role").value = u.role || "FARMACEUTICO";
    document.getElementById("u-crf").value = u.crfNumero || "";
    document.getElementById("u-ativo").checked = u.ativo !== false;
  } else {
    document.getElementById("modal-user-title").textContent = "Novo Usuário";
    document.getElementById("uid-field-group").style.display = "none";
    document.getElementById("u-uid-input").value = "";
    document.getElementById("senha-field-group").style.display = "";
    document.getElementById("u-email").readOnly = false;
    document.getElementById("u-ativo").checked = true;
  }
  modal.showModal();
}

async function toggleUser(uid, currentAtivo, users) {
  const profile = getSessionProfile();
  try {
    await dbUpdate("users", uid, { ativo: !currentAtivo });
    await auditLog({
      uid: profile?.uid || "",
      userName: profile?.nome || "",
      action: currentAtivo ? "DEACTIVATE_USER" : "ACTIVATE_USER",
      module: "users",
      recordId: uid,
      details: "",
    });
    showToast(
      "success",
      currentAtivo ? "Usuário desativado." : "Usuário ativado.",
    );
    await renderUsersModule();
  } catch (err) {
    showToast("error", "Erro", err.message);
  }
}
