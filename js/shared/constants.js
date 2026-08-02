/**
 * @file constants.js
 * @description Constantes globais da aplicação.
 * Centraliza valores importantes para facilitar manutenção e evitar "magic numbers".
 */

// ============================================================
// VALIDAÇÃO DE MEDICAMENTOS
// ============================================================

/**
 * Limites de dias para classificação de validade
 */
export const VALIDADE_THRESHOLD = {
  VENCIDO: 0,
  URGENTE: 30, // Menos de 30 dias = urgente
  ALERTA: 90, // Entre 30-90 dias = alerta
  OK: 91, // Mais de 90 dias = ok
};

/**
 * Classificações de estoque
 */
export const ESTOQUE_STATUS = {
  ZERADO: "zerado",
  CRITICO: "critico",
  BAIXO: "baixo",
  OK: "ok",
};

// ============================================================
// AUTENTICAÇÃO
// ============================================================

/**
 * Configurações de segurança para login
 */
export const AUTH_CONFIG = {
  MAX_LOGIN_ATTEMPTS: 5, // Máximo de tentativas de login
  LOCK_DURATION_MS: 15 * 60 * 1000, // 15 minutos de bloqueio
  SESSION_TIMEOUT_MS: 8 * 60 * 60 * 1000, // 8 horas de sessão
};

// ============================================================
// DATABASE
// ============================================================

/**
 * Limites de queries para performance
 */
export const DB_LIMITS = {
  DEFAULT_QUERY_LIMIT: 1000, // Limite padrão para queries
  MAX_QUERY_LIMIT: 5000, // Limite máximo permitido
  PAGINATION_SIZE: 50, // Tamanho padrão de paginação
  RECENT_ITEMS: 20, // Quantidade de itens recentes no dashboard
};

// ============================================================
// PORTARIA 344/98
// ============================================================

/**
 * Listas de substâncias controladas (Port. 344/98)
 */
export const LISTAS_CONTROLADAS = {
  A1: "A1", // Entorpecentes
  A2: "A2", // Entorpecentes de uso permitido somente em concentrações especiais
  A3: "A3", // Psicotrópicos
  B1: "B1", // Psicotrópicos
  B2: "B2", // Psicotrópicos anorexígenos
  C1: "C1", // Outras substâncias sujeitas a controle especial
  C2: "C2", // Retinóicas
  C3: "C3", // Imunossupressores
  C4: "C4", // Anti-retrovirais
  C5: "C5", // Anabolizantes
  D1: "D1", // Precursores
  D2: "D2", // Insumos químicos
  E: "E", // Plantas que podem originar substâncias entorpecentes e/ou psicotrópicas
  F: "F", // Substâncias de uso proscrito no Brasil
};

/**
 * Listas que exigem SNCR (Sistema Nacional de Controle de Receituário)
 */
export const LISTAS_EXIGEM_SNCR = ["A1", "A2", "A3", "B1", "B2"];

// ============================================================
// RESÍDUOS
// ============================================================

/**
 * Grupos de resíduos conforme ABNT NBR 12808 e RDC 222/2018
 */
export const GRUPOS_RESIDUOS = {
  A: "A", // Infectantes
  B: "B", // Químicos
  C: "C", // Radioativos
  D: "D", // Comuns
  E: "E", // Perfurocortantes
};

// ============================================================
// VALIDAÇÃO E FORMATAÇÃO
// ============================================================

/**
 * Padrões regex para validação
 */
export const VALIDATION_PATTERNS = {
  CPF: /^\d{3}\.\d{3}\.\d{3}-\d{2}$/,
  CNPJ: /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/,
  CRM: /^\d{4,6}$/,
  COREN: /^\d{6,7}$/,
  CRF: /^\d{5}$/,
  TELEFONE: /^\(\d{2}\)\s?\d{4,5}-\d{4}$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
};

/**
 * Tamanhos máximos de campos
 */
export const FIELD_MAX_LENGTH = {
  NOME: 200,
  DESCRICAO: 500,
  OBSERVACAO: 1000,
  JUSTIFICATIVA: 500,
  PROTOCOLO: 50,
  LOTE: 50,
  REGISTRO_ANVISA: 20,
};

// ============================================================
// UI/UX
// ============================================================

/**
 * Tempos de debounce para filtros
 */
export const DEBOUNCE_DELAYS = {
  SEARCH: 300, // ms - Busca em tempo real
  FILTER: 200, // ms - Filtros de seleção
  RESIZE: 150, // ms - Eventos de resize
};

/**
 * Duração de toasts/notificações
 */
export const TOAST_DURATION = {
  SUCCESS: 3000, // ms
  INFO: 4000, // ms
  WARNING: 5000, // ms
  ERROR: 6000, // ms
};

// ============================================================
// EXPORTAÇÃO
// ============================================================

/**
 * Configurações para exportação de dados
 */
export const EXPORT_CONFIG = {
  CSV_DELIMITER: ",",
  CSV_ENCODING: "utf-8",
  MAX_EXPORT_ROWS: 10000,
  FILENAME_DATE_FORMAT: "YYYY-MM-DD",
};
