/**
 * @file utils.js
 * @description Utilitários gerais: formatadores, validações, geradores de ID.
 * Todos os formatos seguem o padrão pt-BR (DD/MM/AAAA, separador decimal vírgula).
 */

import { VALIDADE_THRESHOLD, DEBOUNCE_DELAYS } from "./constants.js";

// ============================================================
// FORMATADORES DE DATA E HORA
// ============================================================

/**
 * Formata um timestamp ou string ISO em DD/MM/AAAA HH:mm
 * @param {number|string|Date} value
 * @returns {string}
 */
export function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(typeof value === "number" ? value : value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Formata um timestamp ou string ISO em DD/MM/AAAA
 * @param {number|string|Date} value
 * @returns {string}
 */
export function formatDate(value) {
  if (!value) return "—";
  const d = new Date(typeof value === "number" ? value : value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Retorna o timestamp atual em milissegundos (server time estimado)
 * @returns {number}
 */
export function now() {
  return Date.now();
}

/**
 * Calcula os dias restantes até uma data
 * @param {string|number} validade - Data de validade (ISO ou timestamp)
 * @returns {number} Dias (negativo se vencido)
 */
export function diasRestantes(validade) {
  if (!validade) return 9999;
  const d = new Date(validade);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Classifica a validade por urgência
 * @param {string|number} validade
 * @returns {'expired'|'urgent'|'warning'|'ok'}
 */
export function classificarValidade(validade) {
  const dias = diasRestantes(validade);
  if (dias < VALIDADE_THRESHOLD.VENCIDO) return "expired";
  if (dias <= VALIDADE_THRESHOLD.URGENTE) return "urgent";
  if (dias <= VALIDADE_THRESHOLD.ALERTA) return "warning";
  return "ok";
}

/**
 * Texto legível para dias restantes
 * @param {number} dias
 * @returns {string}
 */
export function textoDiasRestantes(dias) {
  if (dias < 0)
    return `Vencido há ${Math.abs(dias)} dia${Math.abs(dias) !== 1 ? "s" : ""}`;
  if (dias === 0) return "Vence hoje";
  if (dias === 1) return "Vence amanhã";
  return `${dias} dias`;
}

/**
 * Retorna "há X tempo" a partir de um timestamp
 * @param {number} timestamp
 * @returns {string}
 */
export function timeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "agora mesmo";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `há ${days} dia${days !== 1 ? "s" : ""}`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `há ${weeks} semana${weeks !== 1 ? "s" : ""}`;
  const months = Math.floor(days / 30);
  if (months < 12) return `há ${months} mês${months !== 1 ? "es" : ""}`;
  const years = Math.floor(days / 365);
  return `há ${years} ano${years !== 1 ? "s" : ""}`;
}

/**
 * Converte uma data YYYY-MM-DD (input[type=date]) para DD/MM/AAAA
 * @param {string} isoDate - formato YYYY-MM-DD
 * @returns {string}
 */
export function isoDateToBR(isoDate) {
  if (!isoDate) return "—";
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

/**
 * Converte DD/MM/AAAA para YYYY-MM-DD (para input[type=date])
 * @param {string} brDate
 * @returns {string}
 */
export function brDateToISO(brDate) {
  if (!brDate) return "";
  const [d, m, y] = brDate.split("/");
  return `${y}-${m}-${d}`;
}

/**
 * Retorna o mês/ano em formato legível: "Janeiro de 2024"
 * @param {number} month - 1 a 12
 * @param {number} year
 * @returns {string}
 */
export function formatMonthYear(month, year) {
  const meses = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];
  return `${meses[month - 1]} de ${year}`;
}

// ============================================================
// FORMATADORES DE NÚMEROS
// ============================================================

/**
 * Formata número com separadores pt-BR
 * @param {number} value
 * @param {number} [decimals=0]
 * @returns {string}
 */
export function formatNumber(value, decimals = 0) {
  if (value === null || value === undefined) return "—";
  return Number(value).toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Formata valor monetário em BRL
 * @param {number} value
 * @returns {string}
 */
export function formatCurrency(value) {
  if (value === null || value === undefined) return "—";
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

// ============================================================
// GERADORES DE ID
// ============================================================

/**
 * Gera um ID único baseado em timestamp + random
 * @param {string} [prefix=''] - Prefixo opcional (ex: 'MOV', 'MED')
 * @returns {string}
 */
export function generateId(prefix = "") {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return prefix ? `${prefix}-${ts}-${rand}` : `${ts}-${rand}`;
}

/**
 * Gera número de protocolo legível para movimentações
 * Ex: "MOV-2024-001234"
 * @returns {string}
 */
export function generateProtocol() {
  const year = new Date().getFullYear();
  const seq = Math.floor(Math.random() * 900000) + 100000;
  return `MOV-${year}-${seq}`;
}

// ============================================================
// VALIDADORES
// ============================================================

/**
 * Valida CNPJ brasileiro
 * @param {string} cnpj
 * @returns {boolean}
 */
export function validarCNPJ(cnpj) {
  cnpj = cnpj.replace(/[^\d]/g, "");
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  let soma = 0;
  let peso = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  for (let i = 0; i < 12; i++) soma += parseInt(cnpj[i]) * peso[i];
  let r = soma % 11;
  if (parseInt(cnpj[12]) !== (r < 2 ? 0 : 11 - r)) return false;

  soma = 0;
  peso = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  for (let i = 0; i < 13; i++) soma += parseInt(cnpj[i]) * peso[i];
  r = soma % 11;
  return parseInt(cnpj[13]) === (r < 2 ? 0 : 11 - r);
}

/**
 * Valida CPF brasileiro
 * @param {string} cpf
 * @returns {boolean}
 */
export function validarCPF(cpf) {
  cpf = cpf.replace(/[^\d]/g, "");
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(cpf[i]) * (10 - i);
  let r = 11 - (soma % 11);
  if (parseInt(cpf[9]) !== (r >= 10 ? 0 : r)) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(cpf[i]) * (11 - i);
  r = 11 - (soma % 11);
  return parseInt(cpf[10]) === (r >= 10 ? 0 : r);
}

/**
 * Valida e-mail
 * @param {string} email
 * @returns {boolean}
 */
export function validarEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Verifica se uma string é um número positivo
 * @param {string|number} value
 * @returns {boolean}
 */
export function isPositiveNumber(value) {
  const n = Number(value);
  return !isNaN(n) && n > 0;
}

/**
 * Verifica se quantidade não excede o máximo disponível
 * @param {number} qtd - Quantidade solicitada
 * @param {number} disponivel - Quantidade disponível
 * @returns {boolean}
 */
export function quantidadeValida(qtd, disponivel) {
  return qtd > 0 && qtd <= disponivel;
}

// ============================================================
// MÁSCARAS
// ============================================================

/**
 * Aplica máscara de CNPJ: XX.XXX.XXX/XXXX-XX
 * @param {string} value
 * @returns {string}
 */
export function maskCNPJ(value) {
  const d = value.replace(/\D/g, "").substring(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

/**
 * Aplica máscara de CPF: XXX.XXX.XXX-XX
 * @param {string} value
 * @returns {string}
 */
export function maskCPF(value) {
  const d = value.replace(/\D/g, "").substring(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

/**
 * Aplica máscara de telefone: (XX) XXXXX-XXXX
 * @param {string} value
 * @returns {string}
 */
export function maskPhone(value) {
  const d = value.replace(/\D/g, "").substring(0, 11);
  if (d.length <= 10) {
    return d.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }
  return d.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
}

// ============================================================
// FORMATADORES DE TEXTO
// ============================================================

/**
 * Capitaliza a primeira letra de cada palavra
 * @param {string} str
 * @returns {string}
 */
export function titleCase(str) {
  if (!str) return "";
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Trunca um texto no limite especificado
 * @param {string} text
 * @param {number} maxLength
 * @returns {string}
 */
export function truncate(text, maxLength = 50) {
  if (!text || text.length <= maxLength) return text || "";
  return text.substring(0, maxLength - 3) + "...";
}

/**
 * Remove acentos de uma string (para busca/comparação)
 * @param {string} str
 * @returns {string}
 */
export function removeAccents(str) {
  if (!str) return "";
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Normaliza string para busca (lowercase, sem acento)
 * @param {string} str
 * @returns {string}
 */
export function normalizeSearch(str) {
  return removeAccents(str || "")
    .toLowerCase()
    .trim();
}

/**
 * Verifica se uma string contém outra (busca normalizada)
 * @param {string} haystack
 * @param {string} needle
 * @returns {boolean}
 */
export function searchMatch(haystack, needle) {
  return normalizeSearch(haystack).includes(normalizeSearch(needle));
}

// ============================================================
// UTILITÁRIOS DE ARRAY/OBJETO
// ============================================================

/**
 * Agrupa um array de objetos por uma chave
 * @template T
 * @param {T[]} array
 * @param {keyof T} key
 * @returns {Object.<string, T[]>}
 */
export function groupBy(array, key) {
  return array.reduce((acc, item) => {
    const k = String(item[key] ?? "outros");
    (acc[k] = acc[k] || []).push(item);
    return acc;
  }, {});
}

/**
 * Ordena array de objetos por uma chave
 * @template T
 * @param {T[]} array
 * @param {keyof T} key
 * @param {'asc'|'desc'} [dir='asc']
 * @returns {T[]}
 */
export function sortBy(array, key, dir = "asc") {
  return [...array].sort((a, b) => {
    const va = a[key];
    const vb = b[key];
    if (va < vb) return dir === "asc" ? -1 : 1;
    if (va > vb) return dir === "asc" ? 1 : -1;
    return 0;
  });
}

/**
 * Converte um objeto do Firebase (chave → valor) para array com id
 * @template T
 * @param {Object.<string, T>|null} snapshot
 * @returns {Array<T & {id: string}>}
 */
export function snapshotToArray(snapshot) {
  if (!snapshot) return [];
  return Object.entries(snapshot).map(([id, data]) => ({ id, ...data }));
}

/**
 * Debounce — atrasa a execução de uma função
 * @param {Function} fn
 * @param {number} delay
 * @returns {Function}
 */
export function debounce(fn, delay = DEBOUNCE_DELAYS.SEARCH) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// ============================================================
// EXPORTAÇÃO CSV
// ============================================================

/**
 * Exporta um array de objetos como CSV e dispara download
 * @param {Object[]} data - Array de objetos
 * @param {string} filename - Nome do arquivo (sem .csv)
 * @param {string[]} [columns] - Colunas a incluir (padrão: todas)
 */
export function exportCSV(data, filename, columns = null) {
  if (!data?.length) return;

  const cols = columns || Object.keys(data[0]);
  const header = cols.join(";");
  const rows = data.map((row) =>
    cols
      .map((col) => {
        const val = row[col] ?? "";
        const str = String(val).replace(/"/g, '""');
        return str.includes(";") || str.includes("\n") ? `"${str}"` : str;
      })
      .join(";"),
  );

  const csv = "\uFEFF" + [header, ...rows].join("\n"); // BOM para Excel
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================
// CLASSIFICADORES DE MEDICAMENTO
// ============================================================

/**
 * Retorna a classe CSS do badge de lista (Portaria 344/98)
 * @param {string} lista - A1, A2, B1, B2, C1, C2, C3, normal
 * @returns {string}
 */
export function badgeClassLista(lista) {
  const map = {
    A1: "badge-lista-A1",
    A2: "badge-lista-A2",
    B1: "badge-lista-B1",
    B2: "badge-lista-B2",
    C1: "badge-lista-C1",
    C2: "badge-lista-C2",
    C3: "badge-lista-C3",
    normal: "badge-lista-normal",
  };
  return map[lista] || "badge-lista-normal";
}

/**
 * Verifica se um medicamento é controlado (Port. 344/98)
 * @param {string} lista
 * @returns {boolean}
 */
export function isControlado(lista) {
  return ["A1", "A2", "B1", "B2", "C1", "C2", "C3"].includes(lista);
}

/**
 * Classifica o nível de estoque
 * @param {number} qtdAtual
 * @param {number} qtdMinima
 * @returns {'ok'|'low'|'critical'}
 */
export function classificarEstoque(qtdAtual, qtdMinima) {
  if (qtdAtual <= 0) return "critical";
  if (qtdAtual <= qtdMinima) return "low";
  return "ok";
}

/**
 * Retorna texto descritivo do tipo de movimentação
 * @param {string} tipo
 * @returns {string}
 */
export function labelTipoMovimento(tipo) {
  const map = {
    entrada: "Entrada",
    saida: "Saída",
    devolucao: "Devolução",
    perda: "Perda/Quebra",
    descarte: "Descarte",
    transferencia: "Transferência",
  };
  return map[tipo] || tipo;
}

/**
 * Retorna texto descritivo do perfil de usuário
 * @param {string} role
 * @returns {string}
 */
export function labelRole(role) {
  const map = {
    FARMACEUTICO_RT: "Farmacêutico RT",
    FARMACEUTICO: "Farmacêutico",
    TECNICO_FARMACIA: "Técnico em Farmácia",
    MEDICO_ANESTESISTA: "Médico Anestesista",
    GESTOR: "Gestor",
  };
  return map[role] || role;
}

// ============================================================
// CÁLCULOS FARMACÊUTICOS
// ============================================================

/**
 * Calcula o percentual de estoque em relação ao máximo
 * @param {number} atual
 * @param {number} maximo
 * @returns {number} 0-100
 */
export function percentualEstoque(atual, maximo) {
  if (!maximo || maximo <= 0) return 0;
  return Math.min(100, Math.round((atual / maximo) * 100));
}

/**
 * Calcula o saldo de uma lista de movimentações
 * @param {Array<{tipo: string, quantidade: number}>} movimentos
 * @returns {number}
 */
export function calcularSaldo(movimentos) {
  return movimentos.reduce((saldo, mov) => {
    const q = Number(mov.quantidade) || 0;
    switch (mov.tipo) {
      case "entrada":
      case "devolucao":
        return saldo + q;
      case "saida":
      case "descarte":
      case "perda":
        return saldo - q;
      default:
        return saldo;
    }
  }, 0);
}

// ============================================================
// SANITIZAÇÃO HTML
// ============================================================

/**
 * Escapa caracteres especiais HTML para prevenir XSS.
 * @param {*} str
 * @returns {string}
 */
export function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
