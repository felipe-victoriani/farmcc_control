/**
 * @file auth.js
 * @description Autenticação Firebase + controle de sessão e permissões.
 * Gestão de roles, bloqueio por tentativas, audit log e atualização de último login.
 */

import { auth } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getUserProfile, updateLastLogin, auditLog } from "./db.js";

// ============================================================
// ESTADO GLOBAL DE SESSÃO
// ============================================================

/** @type {{user: import('firebase/auth').User|null, profile: Object|null}} */
const session = { user: null, profile: null };

// Contador de tentativas de login (em memória – limpo ao recarregar)
const loginAttempts = { count: 0, lockedUntil: 0 };
const MAX_ATTEMPTS = 5;
const LOCK_DURATION = 15 * 60 * 1000; // 15 minutos

// ============================================================
// PERMISSÕES POR ROLE
// ============================================================

/**
 * Mapa de permissões por role.
 * Cada chave é uma ação; o valor é array de roles autorizados.
 */
const PERMISSIONS = {
  // Medicamentos
  "medications:read": [
    "ADMIN",
    "FARMACEUTICO_RT",
    "FARMACEUTICO",
    "TECNICO_FARMACIA",
    "MEDICO_ANESTESISTA",
    "GESTOR",
  ],
  "medications:create": [
    "ADMIN",
    "FARMACEUTICO_RT",
    "FARMACEUTICO",
    "TECNICO_FARMACIA",
    "ENFERMEIRO_RT",
  ],
  "medications:update": ["ADMIN", "FARMACEUTICO_RT", "FARMACEUTICO"],
  "medications:delete": ["ADMIN", "FARMACEUTICO_RT"],

  // Movimentações
  "movements:read": [
    "ADMIN",
    "FARMACEUTICO_RT",
    "FARMACEUTICO",
    "TECNICO_FARMACIA",
    "MEDICO_ANESTESISTA",
    "ENFERMEIRO_RT",
    "GESTOR",
  ],
  "movements:create": [
    "ADMIN",
    "FARMACEUTICO_RT",
    "FARMACEUTICO",
    "TECNICO_FARMACIA",
    "MEDICO_ANESTESISTA",
    "ENFERMEIRO_RT",
  ],
  "movements:delete": ["ADMIN", "FARMACEUTICO_RT"],

  // Pacientes / Cirurgias
  "patients:read": [
    "ADMIN",
    "FARMACEUTICO_RT",
    "FARMACEUTICO",
    "TECNICO_FARMACIA",
    "MEDICO_ANESTESISTA",
    "ENFERMEIRO_RT",
    "GESTOR",
  ],
  "patients:create": [
    "ADMIN",
    "FARMACEUTICO_RT",
    "FARMACEUTICO",
    "TECNICO_FARMACIA",
    "MEDICO_ANESTESISTA",
    "ENFERMEIRO_RT",
  ],
  "patients:update": [
    "ADMIN",
    "FARMACEUTICO_RT",
    "FARMACEUTICO",
    "MEDICO_ANESTESISTA",
    "ENFERMEIRO_RT",
  ],
  "patients:delete": ["ADMIN", "FARMACEUTICO_RT"],

  // Resíduos
  "residues:read": [
    "ADMIN",
    "FARMACEUTICO_RT",
    "FARMACEUTICO",
    "TECNICO_FARMACIA",
    "ENFERMEIRO_RT",
    "GESTOR",
  ],
  "residues:create": [
    "ADMIN",
    "FARMACEUTICO_RT",
    "FARMACEUTICO",
    "TECNICO_FARMACIA",
    "ENFERMEIRO_RT",
  ],
  "residues:update": ["ADMIN", "FARMACEUTICO_RT", "FARMACEUTICO"],
  "residues:delete": ["ADMIN", "FARMACEUTICO_RT"],

  // Relatórios
  "reports:read": ["ADMIN", "FARMACEUTICO_RT", "FARMACEUTICO", "GESTOR"],
  "reports:export": ["ADMIN", "FARMACEUTICO_RT", "FARMACEUTICO", "GESTOR"],

  // Conformidade
  "compliance:read": ["ADMIN", "FARMACEUTICO_RT", "FARMACEUTICO", "GESTOR"],

  // Auditoria
  "audit:read": ["ADMIN", "FARMACEUTICO_RT", "GESTOR"],

  // Configurações
  "settings:read": [
    "ADMIN",
    "FARMACEUTICO_RT",
    "FARMACEUTICO",
    "TECNICO_FARMACIA",
    "MEDICO_ANESTESISTA",
    "ENFERMEIRO_RT",
    "GESTOR",
  ],
  "settings:update": ["ADMIN", "FARMACEUTICO_RT"],

  // Usuários
  "users:read": ["ADMIN", "FARMACEUTICO_RT"],
  "users:create": ["ADMIN", "FARMACEUTICO_RT"],
  "users:update": ["ADMIN", "FARMACEUTICO_RT"],
  "users:delete": ["ADMIN", "FARMACEUTICO_RT"],

  // Aliases usados no menu lateral e no roteador
  manage_users: ["ADMIN"],
  view_reports: ["ADMIN", "FARMACEUTICO_RT", "FARMACEUTICO", "GESTOR"],
  view_audit: ["ADMIN", "FARMACEUTICO_RT", "GESTOR"],
  edit_settings: ["ADMIN", "FARMACEUTICO_RT"],
};

/**
 * Verifica se um role tem permissão para uma ação.
 * @param {string} role   - Role do usuário (ex: 'FARMACEUTICO_RT')
 * @param {string} action - Ação no formato 'modulo:operacao'
 * @returns {boolean}
 */
export function hasPermission(role, action) {
  const allowed = PERMISSIONS[action];
  if (!allowed) return false;
  return allowed.includes(role);
}

/**
 * Verifica se o usuário atual tem permissão para uma ação.
 * @param {string} action
 * @returns {boolean}
 */
export function currentUserCan(action) {
  if (!session.profile) return false;
  return hasPermission(session.profile.role, action);
}

// ============================================================
// AUTENTICAÇÃO
// ============================================================

/**
 * Efetua login com email e senha.
 * Controla tentativas e bloqueia após MAX_ATTEMPTS falhas.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{user: Object, profile: Object}>}
 * @throws {Error} Com mensagem traduzida para pt-BR
 */
export async function loginUser(email, password) {
  // Verificar bloqueio temporário
  if (Date.now() < loginAttempts.lockedUntil) {
    const rem = Math.ceil((loginAttempts.lockedUntil - Date.now()) / 60000);
    throw new Error(
      `Conta bloqueada por tentativas excessivas. Aguarde ${rem} minuto(s).`,
    );
  }

  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const user = credential.user;

    // Resetar contador de tentativas
    loginAttempts.count = 0;
    loginAttempts.lockedUntil = 0;

    // Carregar perfil do banco
    const profile = await getUserProfile(user.uid);
    if (!profile) {
      await signOut(auth);
      throw new Error(
        "Perfil de usuário não encontrado. Contate o administrador.",
      );
    }
    if (!profile.ativo) {
      await signOut(auth);
      throw new Error(
        "Usuário inativo. Contate o Farmacêutico Responsável Técnico.",
      );
    }

    session.user = user;
    session.profile = profile;

    // Atualizar último login e gravar auditoria
    await updateLastLogin(user.uid);
    await auditLog({
      uid: user.uid,
      userName: profile.nome || email,
      action: "LOGIN",
      module: "auth",
      details: `Login realizado por ${profile.nome || email} (${profile.role})`,
    });

    return { user, profile };
  } catch (err) {
    // Incrementar contador apenas para erros de credencial
    const credentialErrors = [
      "auth/invalid-credential",
      "auth/wrong-password",
      "auth/user-not-found",
      "auth/invalid-email",
      "auth/invalid-login-credentials",
    ];
    if (
      credentialErrors.some((c) => err.code?.includes(c.replace("auth/", "")))
    ) {
      loginAttempts.count++;
      if (loginAttempts.count >= MAX_ATTEMPTS) {
        loginAttempts.lockedUntil = Date.now() + LOCK_DURATION;
        throw new Error(
          `Número máximo de tentativas atingido. Acesso bloqueado por 15 minutos.`,
        );
      }
      const remaining = MAX_ATTEMPTS - loginAttempts.count;
      throw new Error(
        `Credenciais inválidas. ${remaining} tentativa(s) restante(s).`,
      );
    }

    throw new Error(translateAuthError(err.code) || err.message);
  }
}

/**
 * Efetua logout do usuário atual.
 */
export async function logoutUser() {
  try {
    if (session.user && session.profile) {
      await auditLog({
        uid: session.user.uid,
        userName: session.profile.nome || session.user.email,
        action: "LOGOUT",
        module: "auth",
        details: "Logout realizado pelo usuário.",
      });
    }
  } catch (_) {
    // Não bloquear logout por erro de auditoria
  } finally {
    session.user = null;
    session.profile = null;
    await signOut(auth);
    window.location.href = "index.html";
  }
}

/**
 * Envia e-mail de redefinição de senha.
 * @param {string} email
 */
export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email);
}

// ============================================================
// SESSÃO ATUAL
// ============================================================

/**
 * Retorna o usuário Firebase atual.
 * @returns {import('firebase/auth').User|null}
 */
export function getCurrentUser() {
  return auth.currentUser;
}

/**
 * Retorna o perfil completo do usuário da sessão.
 * @returns {Object|null}
 */
export function getSessionProfile() {
  return session.profile;
}

/**
 * Carrega (ou recarrega) o perfil da sessão do banco.
 * @returns {Promise<Object|null>}
 */
export async function loadSessionProfile() {
  const user = auth.currentUser;
  if (!user) return null;
  const profile = await getUserProfile(user.uid);
  session.user = user;
  session.profile = profile;
  return profile;
}

/**
 * Registra callback chamado em mudanças de estado de autenticação.
 * @param {Function} callback - Recebe (user, profile)
 * @returns {Function} unsubscribe
 */
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        const profile = await getUserProfile(user.uid);
        session.user = user;
        session.profile = profile;
        callback(user, profile);
      } catch {
        session.user = null;
        session.profile = null;
        callback(null, null);
      }
    } else {
      session.user = null;
      session.profile = null;
      callback(null, null);
    }
  });
}

/**
 * Verifica se há sessão ativa; redireciona para index.html se não houver.
 * Deve ser chamada no topo de app.js.
 * @returns {Promise<{user: Object, profile: Object}>}
 */
export async function requireAuth() {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();
      if (!user) {
        window.location.href = "index.html";
        reject(new Error("Não autenticado"));
        return;
      }
      try {
        const profile = await getUserProfile(user.uid);
        if (!profile || !profile.ativo) {
          await signOut(auth);
          window.location.href = "index.html";
          reject(new Error("Perfil inativo ou inexistente"));
          return;
        }
        session.user = user;
        session.profile = profile;
        resolve({ user, profile });
      } catch (err) {
        window.location.href = "index.html";
        reject(err);
      }
    });
  });
}

/**
 * Em index.html: se já estiver logado, redireciona para app.html.
 */
export function redirectIfAuthenticated() {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      window.location.href = "app.html";
    }
  });
}

// ============================================================
// TRADUTOR DE ERROS FIREBASE AUTH
// ============================================================

/**
 * @param {string} code - Código de erro Firebase
 * @returns {string}
 */
function translateAuthError(code) {
  const map = {
    "auth/email-already-in-use": "Este e-mail já está em uso.",
    "auth/invalid-email": "E-mail inválido.",
    "auth/user-disabled": "Usuário desabilitado.",
    "auth/user-not-found": "Usuário não encontrado.",
    "auth/wrong-password": "Senha incorreta.",
    "auth/weak-password": "A senha deve ter no mínimo 6 caracteres.",
    "auth/too-many-requests": "Muitas tentativas. Aguarde alguns minutos.",
    "auth/network-request-failed": "Erro de rede. Verifique sua conexão.",
    "auth/operation-not-allowed": "Operação não permitida.",
    "auth/invalid-credential": "Credenciais inválidas.",
    "auth/invalid-login-credentials": "E-mail ou senha incorretos.",
    "auth/missing-password": "Informe a senha.",
    "auth/missing-email": "Informe o e-mail.",
  };
  return map[code] || null;
}
