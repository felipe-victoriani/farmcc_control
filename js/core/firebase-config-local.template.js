/**
 * @file firebase-config-local.template.js
 * @description Template de configuração local do Firebase.
 *
 * INSTRUÇÕES DE USO:
 * 1. Copie este arquivo e renomeie para: firebase-config-local.js
 * 2. Preencha com suas credenciais REAIS do Firebase
 * 3. NUNCA commite o arquivo firebase-config-local.js no Git
 *
 * Para obter suas credenciais:
 * - Acesse: https://console.firebase.google.com
 * - Selecione seu projeto
 * - Vá em: Configurações do Projeto → Seus apps → SDK do Firebase
 * - Copie os valores do objeto firebaseConfig
 */

/**
 * SUAS CREDENCIAIS REAIS DO FIREBASE
 * Substitua todos os valores "your_*" pelas credenciais do seu projeto
 */
export const firebaseConfig = {
  apiKey: "your_api_key_here",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-default-rtdb.firebaseio.com",
  projectId: "your-project-id",
  storageBucket: "your-project.firebasestorage.app",
  messagingSenderId: "your_messaging_sender_id",
  appId: "your_app_id",
};

/**
 * ATENÇÃO: Este é apenas um template!
 * O arquivo real (firebase-config-local.js) deve ser criado por você
 * e NUNCA deve ser commitado no repositório.
 */
