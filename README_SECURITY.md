# 🔒 Guia de Segurança - FarmaCC Pro

## ⚠️ IMPORTANTE - ANTES DE FAZER DEPLOY

Este documento lista as configurações de segurança críticas que devem ser verificadas antes de colocar a aplicação em produção.

---

## 🔐 1. FIREBASE - CREDENCIAIS

### ❌ NUNCA faça isso:

- Commitar credenciais no código-fonte
- Compartilhar API Keys em repositórios públicos
- Usar as mesmas credenciais em dev/prod

### ✅ Configuração correta:

1. **Copie o arquivo de exemplo**:

```bash
cp .env.example .env
```

2. **Preencha com suas credenciais reais**:

- Acesse: https://console.firebase.google.com
- Configurações → Seus apps → Web
- Copie os valores para o `.env`

3. **Verifique o .gitignore**:

```bash
# Certifique-se que .env está ignorado
git check-ignore .env
# Deve retornar: .env
```

---

## 🛡️ 2. FIREBASE SECURITY RULES

### ✅ Regras implementadas:

- Controle de acesso baseado em roles (RBAC)
- Validação de schema nos dados
- Índices para otimização de queries
- Separação de permissões por módulo

### 📝 Para aplicar as regras:

1. **Via Console Firebase**:
   - Realtime Database → Rules
   - Cole o conteúdo de `database.rules.json`
   - Publicar

2. **Via Firebase CLI**:

```bash
firebase deploy --only database
```

3. **Verificar regras**:
   - Vá em Realtime Database → Rules
   - Clique em "Simulator" para testar

---

## 🔑 3. AUTENTICAÇÃO

### Configurações aplicadas:

- ✅ Limite de tentativas de login (5 tentativas)
- ✅ Bloqueio temporário (15 minutos)
- ✅ Audit log de acessos
- ⚠️ Rate limiting no cliente (resetado ao recarregar)

### 📌 Melhorias recomendadas:

- [ ] Implementar 2FA para ADMIN e FARMACEUTICO_RT
- [ ] Rate limiting via Firebase Security Rules
- [ ] Session timeout configurável
- [ ] Notificação de login em novo dispositivo

---

## 🔍 4. VALIDAÇÃO DE DADOS

### ⚠️ Estado atual:

- Validação apenas no cliente (pode ser bypassed)
- Sem validação server-side completa

### 📌 Próximos passos (recomendado):

```javascript
// Implementar Cloud Functions para validação
// functions/index.js
exports.validateMovement = functions.database
  .ref("/movements/{movId}")
  .onCreate((snapshot, context) => {
    const data = snapshot.val();

    // Validar campos obrigatórios
    if (!data.tipo || !data.medicamentoId || !data.quantidade) {
      return snapshot.ref.remove();
    }

    // Validar quantidade positiva
    if (data.quantidade <= 0) {
      return snapshot.ref.remove();
    }

    return null;
  });
```

---

## 📊 5. LGPD - PROTEÇÃO DE DADOS

### ⚠️ Pontos de atenção:

- Dados de pacientes armazenados em texto plano
- Sem criptografia campo a campo
- Falta termo de consentimento explícito

### 📌 Implementações necessárias:

1. **Criptografia de dados sensíveis**:

```javascript
// Exemplo de implementação
import CryptoJS from "crypto-js";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

function encryptField(value) {
  return CryptoJS.AES.encrypt(value, ENCRYPTION_KEY).toString();
}

function decryptField(encrypted) {
  const bytes = CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}
```

2. **Termo de consentimento**:

- Adicionar checkbox no cadastro de pacientes
- Armazenar consentimento com timestamp
- Permitir revogação

3. **Direito ao esquecimento**:

- Implementar função de anonimização
- Manter apenas dados essenciais para auditoria
- Remover dados pessoais após período de retenção

---

## 🌐 6. HTTPS E CSP

### ✅ Configurado:

- Content Security Policy (CSP) nos HTMLs
- Restrições de scripts e estilos

### 📌 Melhorias:

```html
<!-- Adicionar em todos os HTMLs -->
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'self'; 
           script-src 'self' https://www.gstatic.com; 
           style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
           connect-src 'self' https://*.firebaseio.com wss://*.firebaseio.com;
           img-src 'self' data: https:;
           font-src 'self' https://fonts.gstatic.com;
           upgrade-insecure-requests;"
/>
```

---

## 📈 7. PERFORMANCE E ESCALABILIDADE

### ✅ Implementado:

- Limite padrão de 1000 registros por query
- Debounce em filtros de busca
- Índices no Firebase

### 📌 Próximos passos:

- Implementar paginação real (load more)
- Cache com IndexedDB para offline-first
- Lazy loading de módulos

---

## 🧪 8. TESTES

### ⚠️ Estado atual:

- 0% de cobertura de testes

### 📌 Testes essenciais antes de produção:

```javascript
// Exemplo de teste unitário (Jest)
describe("Movement validation", () => {
  test("should reject negative quantities", () => {
    const movement = { quantidade: -10 };
    expect(validateMovement(movement)).toBe(false);
  });

  test("should require medication ID", () => {
    const movement = { quantidade: 10 };
    expect(validateMovement(movement)).toBe(false);
  });
});
```

### Ferramentas recomendadas:

- Jest - Testes unitários
- Cypress - Testes E2E
- Firebase Emulator - Testes de regras

---

## ✅ CHECKLIST PRÉ-DEPLOY

Marque cada item antes de fazer deploy em produção:

### Segurança

- [ ] Credenciais em variáveis de ambiente (não no código)
- [ ] Firebase Security Rules aplicadas
- [ ] .env no .gitignore
- [ ] API Keys restritas por domínio (Firebase Console)
- [ ] HTTPS habilitado (Firebase Hosting)

### Dados

- [ ] Backup configurado
- [ ] Retenção de dados definida
- [ ] Política de privacidade publicada
- [ ] Termo de consentimento implementado

### Performance

- [ ] Limite de queries configurado
- [ ] Índices Firebase criados
- [ ] Bundle size verificado (<500KB)

### Código

- [ ] Console.log removido
- [ ] Código morto removido
- [ ] Testes principais passando
- [ ] ESLint sem erros críticos

### Compliance

- [ ] Portaria 344/98 validada
- [ ] LGPD verificada
- [ ] Audit log funcionando
- [ ] Controle de acesso testado

---

## 🆘 EM CASO DE INCIDENTE DE SEGURANÇA

1. **Isolar imediatamente**:
   - Desabilite o app no Firebase Hosting
   - Revogue credenciais comprometidas

2. **Investigar**:
   - Verifique audit_log para atividades suspeitas
   - Identifique escopo do incidente

3. **Notificar**:
   - ANPD (se envolver dados pessoais)
   - Usuários afetados (se aplicável)
   - Responsável técnico

4. **Remediar**:
   - Aplicar correções
   - Atualizar regras de segurança
   - Documentar lições aprendidas

---

## 📚 RECURSOS

- [Firebase Security Rules](https://firebase.google.com/docs/database/security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [LGPD - Lei 13.709/2018](http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
- [Portaria SVS/MS 344/98](https://bvsms.saude.gov.br/bvs/saudelegis/svs/1998/prt0344_12_05_1998_rep.html)

---

**Última atualização**: 2026-08-01
**Responsável**: Equipe de Desenvolvimento FarmaCC Pro
