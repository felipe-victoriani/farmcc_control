# 🔧 Configuração do Firebase - Instruções Rápidas

## ⚠️ AÇÃO NECESSÁRIA

O aplicativo está configurado para funcionar em **produção**, mas você precisa atualizar as credenciais do Firebase.

## 📝 Passos para Configurar

### 1. Obter Credenciais do Firebase

1. Acesse: https://console.firebase.google.com
2. Selecione seu projeto **farmcc-control**
3. Vá em **⚙️ Configurações do Projeto** (ícone de engrenagem)
4. Role até **Seus apps** → **SDK do Firebase**
5. Copie o objeto `firebaseConfig`

### 2. Atualizar Arquivo de Produção

Abra o arquivo `js/core/firebase-config-prod.js` e substitua os valores placeholder pelas suas credenciais reais:

```javascript
export const firebaseConfig = {
  apiKey: "SUA_API_KEY_AQUI",
  authDomain: "farmcc-control.firebaseapp.com",
  databaseURL: "https://farmcc-control-default-rtdb.firebaseio.com",
  projectId: "farmcc-control",
  storageBucket: "farmcc-control.firebasestorage.app",
  messagingSenderId: "SEU_SENDER_ID",
  appId: "SEU_APP_ID",
};
```

### 3. (Opcional) Desenvolvimento Local

Para desenvolvimento local com credenciais diferentes:

```bash
# Copiar template
cp js/core/firebase-config-local.template.js js/core/firebase-config-local.js

# Editar e preencher com suas credenciais locais
# O arquivo firebase-config-local.js está no .gitignore
```

Depois, edite `js/core/firebase-config.js` e altere a linha 28 para:

```javascript
import { firebaseConfig } from "./firebase-config-local.js";
```

## 🔒 Segurança

As credenciais do Firebase **frontend são públicas** por design. A segurança real vem de:

1. ✅ **Firebase Security Rules** (configure no Console)
2. ✅ **Domínios autorizados** (somente farmcc-control.vercel.app)
3. ✅ **App Check** (verificação de domínio)
4. ✅ **Autenticação de usuários** (já implementada)

## 🚀 Deploy

Após atualizar as credenciais:

```bash
# Commitar mudanças
git add js/core/firebase-config-prod.js vercel.json
git commit -m "chore: atualizar credenciais Firebase para produção"
git push

# O Vercel irá fazer deploy automaticamente
```

## 🔍 Verificar Erros

Após o deploy, abra o Console do navegador (F12) e verifique:

- ✅ Sem erros 404 para `firebase-config-prod.js`
- ✅ Firebase inicializado corretamente
- ✅ Conexão com Realtime Database OK

## 📚 Arquivos Relacionados

- `js/core/firebase-config.js` - Inicialização principal
- `js/core/firebase-config-prod.js` - **Credenciais de produção (ATUALIZAR)**
- `js/core/firebase-config-local.js` - Credenciais locais (opcional, não commitado)
- `js/core/firebase-config-local.template.js` - Template para desenvolvimento
- `vercel.json` - Configuração de headers de segurança
