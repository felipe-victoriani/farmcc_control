# 🚀 Guia de Deploy - Firebase Security Rules

## 📋 Pré-requisitos

- [x] Node.js instalado (versão 14+)
- [x] Conta Firebase ativa
- [x] Firebase CLI instalado globalmente

---

## 🛠️ 1. Instalar Firebase CLI

Se ainda não tiver o Firebase CLI instalado:

```bash
npm install -g firebase-tools
```

Verifique a instalação:

```bash
firebase --version
```

---

## 🔑 2. Fazer Login no Firebase

```bash
firebase login
```

Este comando abrirá o navegador para autenticação. Faça login com a conta Google do seu projeto Firebase.

---

## 📁 3. Inicializar o Projeto (primeira vez apenas)

Se ainda não inicializou o Firebase no projeto:

```bash
firebase init
```

Selecione:

- **Realtime Database**: Configure as regras de segurança
- Use o arquivo `database.rules.json` existente
- NÃO sobrescreva o arquivo atual

**OU** crie manualmente o `firebase.json`:

```json
{
  "database": {
    "rules": "database.rules.json"
  },
  "hosting": {
    "public": ".",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"]
  }
}
```

---

## 🔒 4. Deploy das Security Rules

### Opção A: Deploy APENAS das regras (recomendado)

```bash
firebase deploy --only database
```

### Opção B: Deploy completo (rules + hosting)

```bash
firebase deploy
```

---

## ✅ 5. Verificar o Deploy

1. **Acesse o Console Firebase**:
   - https://console.firebase.google.com
   - Selecione seu projeto

2. **Vá em Realtime Database → Rules**:
   - Você deve ver as novas regras aplicadas
   - Verifique o timestamp da última publicação

3. **Teste as regras**:
   - Clique em **"Simulator"** (Simulador)
   - Teste diferentes cenários:
     ```
     Localização: /medications
     Tipo: Leitura
     Autenticado: Sim
     UID: (seu UID de teste)
     ```
   - Deve retornar **"Permitido"**

   ```
   Localização: /medications/med123
   Tipo: Escrita
   Autenticado: Sim (sem role)
   UID: test-user
   ```

   - Deve retornar **"Negado"**

---

## 🧪 6. Testar as Regras Localmente (Opcional)

### Usar o Emulador do Firebase:

1. **Instalar os emuladores**:

```bash
firebase init emulators
```

Selecione:

- Authentication
- Realtime Database

2. **Iniciar os emuladores**:

```bash
firebase emulators:start
```

3. **Descomentar o código no firebase-config.js**:

```javascript
const IS_EMULATOR = window.location.hostname === "localhost";
if (IS_EMULATOR) {
  connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
  connectDatabaseEmulator(db, "localhost", 9000);
  console.info("[Firebase] Conectado aos Emuladores locais");
}
```

4. **Acessar a UI dos emuladores**:
   - Abra: http://localhost:4000
   - Visualize dados, regras e autenticação

---

## 🔍 7. Validar as Regras em Produção

### Teste com usuário real:

1. **Crie um usuário de teste**:

```javascript
// No console do navegador (app.html aberto)
await firebase
  .auth()
  .createUserWithEmailAndPassword("teste@farmacia.com", "senha123");
```

2. **Atribua um role ao usuário**:

```javascript
// Via Firebase Console → Realtime Database
{
  "users": {
    "UID_DO_USUARIO_TESTE": {
      "email": "teste@farmacia.com",
      "nome": "Teste Farmaceutico",
      "role": "FARMACEUTICO"
    }
  }
}
```

3. **Teste operações**:
   - Login com o usuário de teste
   - Tente criar uma movimentação
   - Tente editar um medicamento
   - Verifique se as permissões estão corretas

---

## ⚠️ 8. Troubleshooting

### Problema: "Error deploying database rules"

**Solução**:

- Verifique a sintaxe JSON do `database.rules.json`
- Use um validador JSON online
- Certifique-se que não há vírgulas sobrando

### Problema: "Permission denied" mesmo com usuário autenticado

**Solução**:

1. Verifique se o usuário tem um `role` definido em `/users/{uid}/role`
2. Confirme que o role é um dos esperados (ADMIN, FARMACEUTICO_RT, etc.)
3. Use o Simulator no Console para debugar

### Problema: "Database URL is invalid"

**Solução**:

- Verifique se `databaseURL` no `firebase-config-local.js` está correto
- Formato esperado: `https://[PROJECT_ID]-default-rtdb.firebaseio.com`

### Problema: Regras não atualizando

**Solução**:

```bash
# Forçar re-deploy
firebase deploy --only database --force

# Limpar cache do Firebase CLI
firebase logout
firebase login
firebase deploy --only database
```

---

## 📊 9. Monitoramento Pós-Deploy

### Verificar uso e erros:

1. **Firebase Console → Realtime Database → Usage**:
   - Monitore conexões simultâneas
   - Verifique bandwidth
   - Analise operações/segundo

2. **Firebase Console → Realtime Database → Rules**:
   - Clique em "View requests" para ver requisições negadas
   - Identifique padrões de acesso negado

3. **Configurar alertas**:
   - Firebase Console → Alertas
   - Configure notificação para:
     - Alto uso de bandwidth
     - Pico de requisições negadas
     - Erros de autenticação

---

## 🔄 10. Fluxo de Atualização de Regras

Para futuras atualizações:

1. **Edite** `database.rules.json` localmente
2. **Teste** no emulador ou Simulator
3. **Commit** (regras podem ser versionadas)
4. **Deploy**:

```bash
firebase deploy --only database
```

5. **Verifique** no Console Firebase
6. **Monitore** por 24h para detectar problemas

---

## 📚 Recursos Adicionais

- [Documentação Firebase Security Rules](https://firebase.google.com/docs/database/security)
- [Guia de Validação de Dados](https://firebase.google.com/docs/database/security/core-syntax#data_validation)
- [Índices para Performance](https://firebase.google.com/docs/database/security/indexing-data)
- [Testes de Regras](https://firebase.google.com/docs/rules/unit-tests)

---

## ✅ Checklist Final

Antes de considerar o deploy concluído:

- [ ] Firebase CLI instalado e autenticado
- [ ] `firebase.json` configurado
- [ ] Rules deployadas com sucesso
- [ ] Simulator testado com diferentes cenários
- [ ] Usuário de teste criado e validado
- [ ] Permissões de leitura/escrita verificadas
- [ ] Monitoramento ativo no Console
- [ ] Equipe notificada sobre as mudanças
- [ ] Backup das regras antigas (se aplicável)
- [ ] Documentação atualizada

---

**🎉 Deploy completo! Seu Firebase agora está protegido com regras granulares baseadas em roles.**
