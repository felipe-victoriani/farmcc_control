/**
 * @file firebase-config.js
 * @description Configuração e inicialização do Firebase SDK v10 (modular)
 *
 * 🔒 CONFIGURAÇÃO SEGURA:
 * - As credenciais agora estão em firebase-config-local.js (não commitado)
 * - Se o arquivo local não existir, copie firebase-config-local.template.js
 * - NUNCA commite credenciais reais no repositório
 *
 * SETUP INICIAL:
 * 1. Copie: firebase-config-local.template.js → firebase-config-local.js
 * 2. Preencha firebase-config-local.js com credenciais do console.firebase.google.com
 * 3. O arquivo local está protegido no .gitignore
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  connectAuthEmulator,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getDatabase,
  connectDatabaseEmulator,
  enableLogging as enableDbLogging,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// ================================================================
// IMPORTAR CREDENCIAIS DO ARQUIVO LOCAL (NÃO COMMITADO)
// ================================================================
import { firebaseConfig } from "./firebase-config-local.js";

// Detectar se ainda está usando valores placeholder
const IS_PLACEHOLDER_CONFIG =
  !firebaseConfig.apiKey ||
  firebaseConfig.apiKey.startsWith("your_") ||
  firebaseConfig.apiKey.startsWith("COLE_");

// Inicializar Firebase
const firebaseApp = initializeApp(firebaseConfig);

// Serviços exportados
export const auth = getAuth(firebaseApp);
// ⚠️ getDatabase() lança erro se databaseURL for inválida — proteger com try/catch
export let db = null;
if (!IS_PLACEHOLDER_CONFIG) {
  try {
    db = getDatabase(firebaseApp);
  } catch (e) {
    console.warn(
      "[Firebase] Não foi possível inicializar o Realtime Database:",
      e.message,
    );
  }
} else {
  console.warn(
    "[Firebase] Configuração placeholder detectada. Banco de dados desabilitado. Configure firebase-config.js com suas credenciais reais.",
  );
}

// Configurar localidade pt-BR para mensagens de erro do Auth
auth.languageCode = "pt-BR";

// ================================================================
// CONFIGURAÇÃO PARA DESENVOLVIMENTO LOCAL COM EMULADORES
// Descomente as linhas abaixo se estiver usando Firebase Emulators:
// firebase emulators:start
// ================================================================
// const IS_EMULATOR = window.location.hostname === 'localhost';
// if (IS_EMULATOR) {
//   connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
//   connectDatabaseEmulator(db, 'localhost', 9000);
//   console.info('[Firebase] Conectado aos Emuladores locais');
// }

// ================================================================
// ATIVAR PERSISTÊNCIA OFFLINE (dados em cache para uso offline)
// O Firebase Realtime Database suporta offline por padrão,
// mas precisamos habilitar a persistência do cache local.
// Nota: funciona apenas com uma aba do app por vez no mesmo browser.
// ================================================================
// import { enableIndexedDbPersistence } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
// Para Realtime Database, a persistência offline é automática via goOffline/goOnline

export default firebaseApp;
