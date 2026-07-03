/**
 * @file db.js
 * @description Camada de abstração do Firebase Realtime Database.
 * Fornece CRUD genérico e listeners em tempo real para todos os módulos.
 */

import { db } from "./firebase-config.js";
import {
  ref,
  push,
  set,
  get,
  update,
  remove,
  query,
  orderByChild,
  equalTo,
  limitToLast,
  onValue,
  off,
  serverTimestamp,
  child,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// Verificar se o banco está disponível
const isDbAvailable = () => db !== null;

// ============================================================
// OPERAÇÕES GENÉRICAS CRUD
// ============================================================

/**
 * Cria um novo registro em um caminho do banco, gerando chave automática.
 * @param {string} path - Caminho no banco (ex: 'medications')
 * @param {Object} data - Dados a salvar
 * @returns {Promise<string>} - Chave gerada pelo Firebase
 */
export async function dbCreate(path, data) {
  if (!isDbAvailable()) return "dev-" + Math.random().toString(36).slice(2);
  const listRef = ref(db, path);
  const newRef = push(listRef);
  await set(newRef, { ...data, criadoEm: serverTimestamp() });
  return newRef.key;
}

/**
 * Lê todos os registros de um caminho.
 * @param {string} path
 * @param {number} [limit] - Máximo de registros (padrão: sem limite para coleções pequenas)
 * @returns {Promise<Object|null>}
 */
export async function dbReadAll(path, limit = null) {
  if (!isDbAvailable()) return null;
  const baseRef = ref(db, path);
  const q = limit ? query(baseRef, limitToLast(limit)) : baseRef;
  const snap = await get(q);
  return snap.exists() ? snap.val() : null;
}

/**
 * Lê um único registro pelo ID.
 * @param {string} path - Caminho base (ex: 'medications')
 * @param {string} id   - Chave do registro
 * @returns {Promise<Object|null>}
 */
export async function dbRead(path, id) {
  if (!isDbAvailable()) return null;
  const snap = await get(ref(db, `${path}/${id}`));
  return snap.exists() ? { id, ...snap.val() } : null;
}

/**
 * Atualiza campos de um registro existente.
 * @param {string} path - Caminho base
 * @param {string} id   - Chave do registro
 * @param {Object} data - Campos a atualizar
 */
export async function dbUpdate(path, id, data) {
  if (!isDbAvailable()) return;
  await update(ref(db, `${path}/${id}`), {
    ...data,
    atualizadoEm: serverTimestamp(),
  });
}

/**
 * Substitui completamente um registro (set).
 * @param {string} path - Caminho completo incluindo ID
 * @param {Object} data
 */
export async function dbSet(path, data) {
  if (!isDbAvailable()) return;
  await set(ref(db, path), data);
}

/**
 * Remove um registro.
 * @param {string} path - Caminho base
 * @param {string} id   - Chave do registro
 */
export async function dbDelete(path, id) {
  if (!isDbAvailable()) return;
  await remove(ref(db, `${path}/${id}`));
}

/**
 * Busca registros por valor de um campo específico.
 * @param {string} path       - Caminho base
 * @param {string} field      - Campo para filtrar
 * @param {*}      value      - Valor a buscar
 * @returns {Promise<Object|null>}
 */
export async function dbQueryByField(path, field, value) {
  if (!isDbAvailable()) return null;
  const q = query(ref(db, path), orderByChild(field), equalTo(value));
  const snap = await get(q);
  return snap.exists() ? snap.val() : null;
}

/**
 * Busca os últimos N registros ordenados por um campo.
 * @param {string} path
 * @param {string} field
 * @param {number} limit
 * @returns {Promise<Object|null>}
 */
export async function dbQueryLast(path, field, limit) {
  if (!isDbAvailable()) return null;
  const q = query(ref(db, path), orderByChild(field), limitToLast(limit));
  const snap = await get(q);
  return snap.exists() ? snap.val() : null;
}

// ============================================================
// LISTENERS EM TEMPO REAL
// ============================================================

/** @type {Map<string, Function>} Mapa de listeners ativos */
const activeListeners = new Map();

/**
 * Registra um listener em tempo real para um caminho.
 * Gerencia automaticamente a remoção de listeners anteriores no mesmo caminho.
 * @param {string} path
 * @param {Function} callback - Recebe o valor do snapshot (já parseado)
 * @returns {Function} Função para cancelar o listener
 */
export function dbListen(path, callback) {
  if (!isDbAvailable()) {
    // Sem banco: chamar callback com null imediatamente e retornar noop
    setTimeout(() => callback(null, null), 0);
    return () => {};
  }

  // Remover listener anterior no mesmo path (evitar duplicatas)
  if (activeListeners.has(path)) {
    const prevRef = activeListeners.get(path);
    off(prevRef);
    activeListeners.delete(path);
  }

  const dbRef = ref(db, path);
  const unsubscribe = onValue(
    dbRef,
    (snap) => {
      callback(snap.exists() ? snap.val() : null, snap.key);
    },
    (error) => {
      console.error(`[DB] Erro no listener em "${path}":`, error);
      callback(null, null, error);
    },
  );

  activeListeners.set(path, dbRef);

  return () => {
    off(dbRef);
    activeListeners.delete(path);
  };
}

/**
 * Remove um listener específico por caminho.
 * @param {string} path
 */
export function dbUnlisten(path) {
  if (activeListeners.has(path)) {
    off(activeListeners.get(path));
    activeListeners.delete(path);
  }
}

/**
 * Remove todos os listeners ativos (chamar ao trocar de módulo).
 */
export function dbUnlistenAll() {
  for (const [path, dbRef] of activeListeners.entries()) {
    off(dbRef);
  }
  activeListeners.clear();
}

// ============================================================
// OPERAÇÕES ESPECÍFICAS DE NEGÓCIO
// ============================================================

/**
 * Registra uma movimentação e atualiza o estoque atomicamente.
 * @param {Object} movimento - Dados da movimentação
 * @param {string} medId     - ID do medicamento
 * @param {number} novaQtd   - Nova quantidade calculada
 * @param {string} uid       - UID do usuário
 * @param {string} userName  - Nome do usuário
 * @returns {Promise<string>} ID da movimentação criada
 */
export async function registrarMovimentacao(
  movimento,
  medId,
  novaQtd,
  uid,
  userName,
) {
  if (!isDbAvailable()) return "dev-" + Math.random().toString(36).slice(2);
  // Criar movimentação
  const movRef = push(ref(db, "movements"));
  const movId = movRef.key;

  const updates = {};
  updates[`movements/${movId}`] = {
    ...movimento,
    dataHora: serverTimestamp(),
    registradoPor: uid,
    registradoPorNome: userName,
  };
  updates[`medications/${medId}/qtdAtual`] = novaQtd;
  updates[`medications/${medId}/atualizadoEm`] = serverTimestamp();
  updates[`medications/${medId}/atualizadoPor`] = uid;

  // Commit atômico
  const { update: fbUpdate } =
    await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
  await fbUpdate(ref(db), updates);
  return movId;
}

/**
 * Registra uma entrada no audit_log.
 * @param {Object} params
 * @param {string} params.uid
 * @param {string} params.userName
 * @param {string} params.action    - Ex: "CREATE_MEDICATION"
 * @param {string} params.module    - Ex: "medications"
 * @param {string} [params.recordId]
 * @param {string} params.details
 */
export async function auditLog({
  uid,
  userName,
  action,
  module: mod,
  recordId = null,
  details,
}) {
  if (!isDbAvailable()) return;
  const logRef = push(ref(db, "audit_log"));
  await set(logRef, {
    uid,
    userName,
    action,
    module: mod,
    recordId,
    details,
    ip: "client-side",
    userAgent: navigator.userAgent.substring(0, 200),
    timestamp: serverTimestamp(),
  });
}

/**
 * Atualiza o timestamp de último login do usuário.
 * @param {string} uid
 */
export async function updateLastLogin(uid) {
  if (!isDbAvailable()) return;
  await update(ref(db, `users/${uid}`), {
    ultimoLogin: serverTimestamp(),
  });
}

/**
 * Obtém as configurações da instituição.
 * @returns {Promise<Object|null>}
 */
export async function getSettings() {
  if (!isDbAvailable()) return null;
  const snap = await get(ref(db, "settings"));
  return snap.exists() ? snap.val() : null;
}

/**
 * Obtém o perfil completo de um usuário.
 * @param {string} uid
 * @returns {Promise<Object|null>}
 */
export async function getUserProfile(uid) {
  if (!isDbAvailable()) return null;
  const snap = await get(ref(db, `users/${uid}`));
  return snap.exists() ? { uid, ...snap.val() } : null;
}

/**
 * Incrementa o estoque de um medicamento.
 * Uso: entradas, devoluções.
 * @param {string} medId
 * @param {number} quantidade
 * @param {string} uid
 * @returns {Promise<number>} Nova quantidade
 */
export async function incrementarEstoque(medId, quantidade, uid) {
  if (!isDbAvailable()) return 0;
  const snap = await get(ref(db, `medications/${medId}/qtdAtual`));
  const qtdAtual = snap.exists() ? snap.val() || 0 : 0;
  const novaQtd = qtdAtual + quantidade;
  await update(ref(db, `medications/${medId}`), {
    qtdAtual: novaQtd,
    atualizadoEm: serverTimestamp(),
    atualizadoPor: uid,
  });
  return novaQtd;
}

/**
 * Decrementa o estoque de um medicamento.
 * Uso: saídas, descartes, perdas.
 * @param {string} medId
 * @param {number} quantidade
 * @param {string} uid
 * @returns {Promise<number>} Nova quantidade
 * @throws {Error} Se não houver estoque suficiente
 */
export async function decrementarEstoque(medId, quantidade, uid) {
  if (!isDbAvailable()) return 0;
  const snap = await get(ref(db, `medications/${medId}/qtdAtual`));
  const qtdAtual = snap.exists() ? snap.val() || 0 : 0;
  if (qtdAtual < quantidade) {
    throw new Error(`Estoque insuficiente. Disponível: ${qtdAtual}`);
  }
  const novaQtd = qtdAtual - quantidade;
  await update(ref(db, `medications/${medId}`), {
    qtdAtual: novaQtd,
    atualizadoEm: serverTimestamp(),
    atualizadoPor: uid,
  });
  return novaQtd;
}
