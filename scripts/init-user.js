/**
 * init-user.js
 * Cria o perfil do usuário master no Firebase Realtime Database.
 *
 * USO:
 *   node scripts/init-user.js
 */

import admin from "firebase-admin";
import { createRequire } from "module";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Carregar service account ──────────────────────────────────
const keyPath = join(__dirname, "..", "serviceAccountKey.json");
let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(keyPath, "utf8"));
} catch {
  console.error(
    "❌  Arquivo 'serviceAccountKey.json' não encontrado na raiz do projeto.",
  );
  console.error(
    "   Baixe em: Console Firebase → Configurações → Contas de serviço → Gerar nova chave privada",
  );
  process.exit(1);
}

// ── Inicializar Admin SDK ─────────────────────────────────────
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://farmacia-cc-default-rtdb.firebaseio.com",
});

const db = admin.database();

// ── Dados do usuário master ───────────────────────────────────
const UID = "F5YW6B0ZZ7eQXDWj8wbjUyArwvI3";
const PERFIL = {
  nome: "Felipe Victoriani", // ← ajuste se quiser
  email: "felipevictoriani@hotmail.com",
  role: "FARMACEUTICO_RT",
  crfNumero: "",
  ativo: true,
  criadoEm: Date.now(),
};

// ── Gravar no banco ───────────────────────────────────────────
try {
  await db.ref(`users/${UID}`).set(PERFIL);
  console.log("✅  Perfil criado com sucesso!");
  console.log(`   Path: users/${UID}`);
  console.log("   Dados:", PERFIL);
} catch (err) {
  console.error("❌  Erro ao gravar no banco:", err.message);
} finally {
  await admin.app().delete();
}
