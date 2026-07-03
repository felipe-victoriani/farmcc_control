# FarmaCC Pro — Sistema de Gestão de Farmácia para Centro Cirúrgico

Sistema web completo para gestão farmacêutica hospitalar, com foco em centros
cirúrgicos. Integrado ao Firebase Realtime Database e Firebase Authentication.

---

## Pré-requisitos

- Conta Google e projeto Firebase (plano Spark ou Blaze)
- Node.js + `http-server` ou VS Code com extensão **Live Server**
- Navegador moderno: Chrome, Firefox ou Edge (últimas 2 versões)

> ⚠️ **Não abra os arquivos diretamente pelo sistema de arquivos (`file://`).**
> Os módulos ES6 requerem um servidor HTTP. Use Live Server ou http-server.

---

## 1. Configuração do Firebase

### 1.1 Criar Projeto Firebase

1. Acesse [console.firebase.google.com](https://console.firebase.google.com)
2. Clique em **"Adicionar projeto"**
3. Digite o nome do projeto (ex.: `farmacia-cc-prod`)
4. Desative Google Analytics (opcional) → **Criar projeto**

### 1.2 Ativar Firebase Authentication

1. No painel esquerdo: **Build → Authentication**
2. Clique em **"Primeiros passos"**
3. Na aba **"Sign-in method"**, ative **E-mail/senha**
4. Salve

### 1.3 Ativar Realtime Database

1. No painel esquerdo: **Build → Realtime Database**
2. Clique em **"Criar banco de dados"**
3. Selecione a região mais próxima (ex.: `southamerica-east1`)
4. Inicie no **modo bloqueado** (seguro)
5. Após criar, vá em **Regras** e cole as Security Rules abaixo

### 1.4 Security Rules (copiar e colar no console Firebase)

```json
{
  "rules": {
    ".read": false,
    ".write": false,

    "medications": {
      ".read": "auth != null",
      ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() !== 'MEDICO_ANESTESISTA' && root.child('users').child(auth.uid).child('ativo').val() === true",
      "$medId": {
        ".validate": "newData.hasChildren(['nome','lista','lote','validade','qtdAtual','qtdMinima','unidade','fornecedor','codigoAnvisa'])"
      }
    },

    "movements": {
      ".read": "auth != null && root.child('users').child(auth.uid).child('ativo').val() === true",
      ".write": "auth != null && root.child('users').child(auth.uid).child('ativo').val() === true",
      "$movId": {
        ".validate": "newData.hasChildren(['tipo','medId','quantidade','dataHora','registradoPor'])"
      }
    },

    "patients": {
      ".read": "auth != null",
      ".write": "auth != null && (root.child('users').child(auth.uid).child('role').val() === 'FARMACEUTICO_RT' || root.child('users').child(auth.uid).child('role').val() === 'FARMACEUTICO' || root.child('users').child(auth.uid).child('role').val() === 'TECNICO_FARMACIA')"
    },

    "residues": {
      ".read": "auth != null",
      ".write": "auth != null && (root.child('users').child(auth.uid).child('role').val() === 'FARMACEUTICO_RT' || root.child('users').child(auth.uid).child('role').val() === 'FARMACEUTICO')"
    },

    "users": {
      "$uid": {
        ".read": "auth != null && (auth.uid === $uid || root.child('users').child(auth.uid).child('role').val() === 'FARMACEUTICO_RT')",
        ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() === 'FARMACEUTICO_RT'"
      }
    },

    "audit_log": {
      ".read": "auth != null && (root.child('users').child(auth.uid).child('role').val() === 'FARMACEUTICO_RT' || root.child('users').child(auth.uid).child('role').val() === 'GESTOR')",
      ".write": "auth != null"
    },

    "settings": {
      ".read": "auth != null",
      ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() === 'FARMACEUTICO_RT'"
    },

    "surgeries": {
      ".read": "auth != null",
      ".write": "auth != null && root.child('users').child(auth.uid).child('ativo').val() === true"
    }
  }
}
```

### 1.5 Obter Credenciais do Projeto

1. No painel Firebase: ⚙️ **Configurações do Projeto**
2. Role para baixo até **"Seus apps"**
3. Clique em **"Adicionar app"** → escolha Web (`</>`)
4. Registre o app (ex.: `FarmaCC Pro Web`)
5. Copie o objeto `firebaseConfig`

### 1.6 Configurar Credenciais no Código

Abra `js/firebase-config.js` e substitua os placeholders:

```javascript
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "seu-projeto.firebaseapp.com",
  databaseURL: "https://seu-projeto-default-rtdb.firebaseio.com",
  projectId: "seu-projeto",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef",
};
```

---

## 2. Criar o Primeiro Usuário Farmacêutico RT

O primeiro usuário precisa ser criado manualmente no Firebase Console,
pois o cadastro de usuários está restrito ao perfil FARMACEUTICO_RT.

### 2.1 Criar usuário no Authentication

1. Firebase Console → **Authentication → Users → Adicionar usuário**
2. Preencha e-mail e senha
3. Anote o **UID** gerado

### 2.2 Criar registro no Realtime Database

1. Firebase Console → **Realtime Database**
2. Clique em ✚ ao lado da raiz
3. Adicione o nó: `/users/{UID_DO_USUARIO}/`
4. Cole o JSON abaixo, substituindo os valores:

```json
{
  "nome": "Dr. João Silva",
  "email": "joao@hospital.com",
  "role": "FARMACEUTICO_RT",
  "registro": "CRF-SP 12345",
  "ativo": true,
  "criadoEm": 1700000000000,
  "ultimoLogin": 0
}
```

---

## 3. Executar o Sistema

### Opção A — VS Code Live Server

1. Instale a extensão **Live Server** (Ritwick Dey)
2. Abra a pasta do projeto no VS Code
3. Clique com botão direito em `index.html` → **"Open with Live Server"**
4. O navegador abrirá em `http://127.0.0.1:5500`

### Opção B — http-server (Node.js)

```bash
npm install -g http-server
cd caminho/para/farmacia-cc
http-server -p 5500 --cors
```

Acesse: `http://localhost:5500`

---

## 4. Carregar Dados de Exemplo (Opcional)

Para popular o banco com dados de demonstração:

1. Abra o arquivo `js/seed.js` no navegador via console
2. Faça login no sistema primeiro
3. Abra o Console do navegador (F12)
4. Execute: `seedDatabase()`

> ⚠️ Execute `seedDatabase()` apenas **uma vez** em ambiente de desenvolvimento.
> Nunca em produção com dados reais.

---

## 5. Checklist Antes de Ir para Produção

- [ ] Credenciais Firebase configuradas em `js/firebase-config.js`
- [ ] Security Rules aplicadas no Firebase Console
- [ ] Primeiro usuário FARMACEUTICO_RT criado
- [ ] Dados da instituição preenchidos em Configurações
- [ ] Certificado SSL ativo no domínio (obrigatório para Firebase Auth)
- [ ] Domínio autorizado em Firebase Console → Authentication → Settings → Authorized domains
- [ ] Regras de backup configuradas no Firebase Console
- [ ] Plano Firebase Blaze ativo (necessário para backup automático)
- [ ] Testar login, logout e redirecionamento de rotas
- [ ] Testar controle de acesso por perfil
- [ ] Verificar funcionamento offline (banco de dados com persistência)
- [ ] Revisar dados da instituição no módulo Configurações
- [ ] Verificar formato de impressão dos relatórios
- [ ] Revisar política de retenção de dados

---

## 6. Estrutura de Arquivos

```
controle_farmacia_15/
├── index.html              # Tela de login
├── app.html                # Aplicação principal
├── README.md               # Este arquivo
├── css/
│   ├── base.css            # Reset, variáveis, tipografia, utilitários
│   ├── components.css      # Botões, cards, badges, tabelas, modais, forms
│   ├── layout.css          # Sidebar, header, main content
│   └── animations.css      # Transições, micro-interações, skeleton loaders
└── js/
    ├── firebase-config.js  # Configuração Firebase (preencher credenciais)
    ├── auth.js             # Login, logout, proteção de rotas, perfis
    ├── db.js               # CRUD genérico — abstração Realtime Database
    ├── svg-icons.js        # Todos os ícones SVG como strings
    ├── utils.js            # Formatadores, validações, utilitários
    ├── notifications.js    # Toasts, alertas automáticos, badges
    ├── medications.js      # Módulo Estoque/Medicamentos
    ├── movements.js        # Módulo Movimentações
    ├── patients.js         # Módulo Pacientes e Cirurgias
    ├── reports.js          # Módulo Relatórios Oficiais
    ├── residues.js         # Módulo Resíduos — RDC 222/2018
    ├── compliance.js       # Módulo Conformidade ANVISA
    ├── app.js              # Entry point, router, inicialização
    └── seed.js             # Dados de exemplo (usar apenas em dev)
```

---

## 7. Perfis de Usuário

| Perfil               | Descrição                                           |
| -------------------- | --------------------------------------------------- |
| `FARMACEUTICO_RT`    | Responsável Técnico — acesso total                  |
| `FARMACEUTICO`       | Acesso a todos os módulos exceto gestão de usuários |
| `TECNICO_FARMACIA`   | Movimentações, estoque (leitura), validades         |
| `MEDICO_ANESTESISTA` | Dashboard e estoque (somente leitura), suas saídas  |
| `GESTOR`             | Somente leitura em tudo + relatórios                |

---

## 8. Conformidade Regulatória

Este sistema foi desenvolvido em conformidade com:

- **Portaria SVS/MS 344/1998** — Controle de substâncias e medicamentos
- **RDC ANVISA 204/2017** — Boas Práticas de Dispensação
- **RDC ANVISA 471/2021** — Boas Práticas de Distribuição e Armazenagem
- **RDC ANVISA 222/2018** — Gerenciamento de Resíduos de Saúde
- **Lei 5.991/1973** — Controle Sanitário de Medicamentos
- **RDC ANVISA 67/2007** — Boas Práticas de Manipulação
- **Lei 13.709/2018 (LGPD)** — Proteção de Dados Pessoais
- **IN ANVISA 35/2019** — Lista de Substâncias Controladas

---

## 9. Suporte Técnico

Para dúvidas sobre configuração ou funcionamento, consulte a documentação
do Firebase: [firebase.google.com/docs](https://firebase.google.com/docs)

---

_FarmaCC Pro v2.0 — Sistema de Gestão de Farmácia para Centro Cirúrgico_
_Desenvolvido para conformidade com ANVISA, LGPD e regulamentações sanitárias brasileiras_
# farmcc_control
