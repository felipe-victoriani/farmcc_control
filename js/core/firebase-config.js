/**
 * @file firebase-config.js
 * @description Configuração e inicialização do Firebase SDK v10 (modular)
 *
 * INSTRUÇÕES DE CONFIGURAÇÃO:
 * 1. Acesse console.firebase.google.com
 * 2. Selecione seu projeto → Configurações → Seus apps → Web
 * 3. Copie o objeto firebaseConfig e cole abaixo, substituindo os placeholders
 * 4. Certifique-se de que o domínio está autorizado em Authentication → Settings
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
// PREENCHA COM AS CREDENCIAIS DO SEU PROJETO FIREBASE
// Console Firebase → Configurações do Projeto → Seus apps → Web
// ================================================================
const firebaseConfig = {
  apiKey: "AIzaSyARRlHgnSmqhagK-WO2Xk51WnrfTOamOsE",
  authDomain: "farmacia-cc.firebaseapp.com",
  databaseURL: "https://farmacia-cc-default-rtdb.firebaseio.com",
  projectId: "farmacia-cc",
  storageBucket: "farmacia-cc.firebasestorage.app",
  messagingSenderId: "703841961713",
  appId: "1:703841961713:web:6a8f273210c536af874b50",
};
// ================================================================

// Detectar se ainda está usando valores placeholder (sem Firebase configurado)
const IS_PLACEHOLDER_CONFIG = firebaseConfig.apiKey.startsWith("COLE_");

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
