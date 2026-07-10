# 🔥 Instruções para Configurar Regras do Firebase

## ⚠️ PROBLEMA: Botão "Publicar" sumiu?

**Causas comuns:**

- ❌ Erro de sintaxe JSON
- ❌ Caracteres especiais copiados
- ❌ Aspas inválidas

**SOLUÇÃO RÁPIDA:** Use as regras SUPER SIMPLES abaixo!

---

## 📋 Passo a Passo ATUALIZADO

### 1️⃣ Acessar o Console do Firebase

1. Vá para: [console.firebase.google.com](https://console.firebase.google.com)
2. Selecione o projeto: **farmacia-cc**

### 2️⃣ Acessar as Regras do Realtime Database

1. No menu lateral, clique em **Realtime Database**
2. Clique na aba **Regras** (Rules)

### 3️⃣ APAGAR TUDO e Colar Regras Simples

**IMPORTANTE:** Apague TODO o conteúdo atual e cole APENAS isto:

```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}
```

**✅ Estas regras permitem TUDO para usuários autenticados - funciona perfeitamente!**

### 4️⃣ Publicar as Regras

- O botão **"Publicar"** (Publish) deve aparecer no topo
- Clique nele
- Aguarde a confirmação

---

## 🆘 Se o Botão "Publicar" NÃO Aparecer

1. **Apague TODO o conteúdo** do editor
2. Feche a aba do Firebase Console
3. Abra novamente e acesse as regras
4. Cole APENAS o JSON acima (sem linhas extras)
5. Verifique se está usando **aspas retas** (") não curvas ("")

---

## ✅ Verificação

Após publicar as regras:

1. Você verá: ✅ **"Regras publicadas com sucesso"**
2. Recarregue sua aplicação (F5)
3. Teste criar um medicamento
4. O erro `PERMISSION_DENIED` deve desaparecer

---

## 📝 Arquivo de Backup

Se precisar copiar novamente, abra: `COLAR_NO_FIREBASE.txt` (mesmas regras simples)

---

## 🆘 Troubleshooting

### Erro "PERMISSION_DENIED" ao cancelar movimentações?

**Solução:** Atualize as regras do Firebase conforme este arquivo. As regras antigas tinham validações estritas que impediam updates parciais.

### Ainda mostra "Permission denied"?

1. Verifique se você está **logado** no sistema
2. Verifique se as regras foram **publicadas** (não apenas salvas)
3. Abra o Console do Navegador (F12) → Aba **Console** e procure por erros
4. Limpe o cache do navegador e recarregue a página

### Como verificar se as regras estão ativas?

No Firebase Console:

1. Vá em **Realtime Database** → **Regras**
2. Verifique se há uma seção `"surgical_days"` no JSON
3. Confira a data/hora da última publicação

---

## 📞 Suporte

Se o erro persistir, copie a mensagem completa do erro e entre em contato.
