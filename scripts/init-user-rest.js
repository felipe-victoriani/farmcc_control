/**
 * init-user-rest.js
 * Cria o perfil do usuário master via REST API do Firebase.
 * NÃO precisa do serviceAccountKey.json — usa email/senha.
 *
 * USO: node scripts/init-user-rest.js
 */

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const https = require("https");

// ── CONFIGURAÇÃO ─────────────────────────────────────────────
const API_KEY = "AIzaSyARRlHgnSmqhagK-WO2Xk51WnrfTOamOsE";
const DATABASE_URL = "https://farmacia-cc-default-rtdb.firebaseio.com";
const UID = "F5YW6B0ZZ7eQXDWj8wbjUyArwvI3";

// Altere para seu e-mail e senha reais
const EMAIL = process.argv[2];
const SENHA = process.argv[3];

if (!EMAIL || !SENHA) {
  console.error("USO: node scripts/init-user-rest.js <email> <senha>");
  process.exit(1);
}

// ── HELPERS ──────────────────────────────────────────────────
function post(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const u = new URL(url);
    const options = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
      },
    };
    const req = https.request(options, (res) => {
      let raw = "";
      res.on("data", (c) => (raw += c));
      res.on("end", () => {
        try {
          resolve(JSON.parse(raw));
        } catch {
          resolve(raw);
        }
      });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

function put(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const u = new URL(url);
    const options = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
      },
    };
    const req = https.request(options, (res) => {
      let raw = "";
      res.on("data", (c) => (raw += c));
      res.on("end", () => {
        try {
          resolve(JSON.parse(raw));
        } catch {
          resolve(raw);
        }
      });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

// ── MAIN ─────────────────────────────────────────────────────
console.log("🔐 Autenticando no Firebase...");

const authRes = await post(
  `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
  { email: EMAIL, password: SENHA, returnSecureToken: true },
);

if (authRes.error) {
  console.error("❌ Erro de autenticação:", authRes.error.message);
  process.exit(1);
}

const idToken = authRes.idToken;
console.log("✅ Autenticado como:", authRes.email);

// Perfil do usuário master
const perfil = {
  nome: "Felipe Victoriani",
  email: EMAIL,
  role: "ADMIN",
  crfNumero: "",
  ativo: true,
  criadoEm: Date.now(),
};

console.log(`📝 Gravando perfil em users/${UID}...`);

const dbRes = await put(
  `${DATABASE_URL}/users/${UID}.json?auth=${idToken}`,
  perfil,
);

if (dbRes?.nome) {
  console.log("✅ Perfil criado com sucesso!");
  console.log("   Dados:", dbRes);
} else {
  console.error("❌ Resposta inesperada:", dbRes);
  console.error(
    "   Verifique se o Realtime Database foi criado no Console Firebase.",
  );
}
