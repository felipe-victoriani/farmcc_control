/**
 * @file firebase-config-prod.js
 * @description Configuração do Firebase para PRODUÇÃO (Vercel)
 *
 * Este arquivo pode ser commitado com credenciais públicas do Firebase.
 * As credenciais públicas são seguras quando combinadas com:
 * - Firebase Security Rules (regras de segurança no console)
 * - App Check (verificação de domínio autorizado)
 * - Authorized domains (domínios autorizados)
 *
 * IMPORTANTE: Configure as Security Rules no Firebase Console!
 */

export const firebaseConfig = {
  apiKey: "AIzaSyARRlHgnSmqhagK-WO2Xk51WnrfTOamOsE",
  authDomain: "farmacia-cc.firebaseapp.com",
  databaseURL: "https://farmacia-cc-default-rtdb.firebaseio.com",
  projectId: "farmacia-cc",
  storageBucket: "farmacia-cc.firebasestorage.app",
  messagingSenderId: "703841961713",
  appId: "1:703841961713:web:6a8f273210c536af874b50",
};

/**
 * NOTA: Estas credenciais são públicas e seguras APENAS se você:
 * 1. Configurou Firebase Security Rules adequadas
 * 2. Limitou domínios autorizados no Firebase Console
 * 3. Implementou autenticação adequada no app
 *
 * Nunca confie apenas nas credenciais do cliente para segurança!
 */
