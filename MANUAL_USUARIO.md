# FarmaCC Pro — Manual de Uso

### Sistema de Gestão de Farmácia para Centro Cirúrgico

---

## Sumário

1. [Acesso ao Sistema](#1-acesso-ao-sistema)
2. [Dashboard — Visão Geral](#2-dashboard--visão-geral)
3. [Cadastro de Medicamentos (Estoque)](#3-cadastro-de-medicamentos-estoque)
4. [Registro de Entrada de Medicamentos](#4-registro-de-entrada-de-medicamentos)
5. [Registro de Paciente e Cirurgia](#5-registro-de-paciente-e-cirurgia)
6. [Dispensação — Registro de Saída](#6-dispensação--registro-de-saída)
7. [Devolução, Perda e Descarte](#7-devolução-perda-e-descarte)
8. [Gestão de Resíduos (RDC 222/2018)](#8-gestão-de-resíduos-rdc-2222018)
9. [Relatórios Obrigatórios (Port. 344/98)](#9-relatórios-obrigatórios-port-34498)
10. [Conformidade Regulatória](#10-conformidade-regulatória)
11. [Auditoria](#11-auditoria)
12. [Configurações do Sistema](#12-configurações-do-sistema)
13. [Gestão de Usuários (Admin)](#13-gestão-de-usuários-admin)
14. [Fluxo Completo do Dia a Dia](#14-fluxo-completo-do-dia-a-dia)

---

## 1. Acesso ao Sistema

**URL:** `http://[endereço-do-sistema]/index.html`

| Campo  | Descrição                            |
| ------ | ------------------------------------ |
| E-mail | E-mail cadastrado pelo administrador |
| Senha  | Senha definida no cadastro           |

Após login, o sistema carrega o **Dashboard** automaticamente.  
Cada usuário vê apenas as funcionalidades permitidas pelo seu perfil:

| Perfil                   | Acesso                                                     |
| ------------------------ | ---------------------------------------------------------- |
| **Farmacêutico RT**      | Acesso completo a tudo                                     |
| **Farmacêutico**         | Estoque, movimentações, pacientes, resíduos, relatórios    |
| **Técnico em Farmácia**  | Estoque (sem excluir), movimentações, pacientes            |
| **Médico / Anestesista** | Consulta de estoque + registro de saída no intraoperatório |
| **Gestor**               | Somente leitura: dashboard, relatórios, conformidade       |

---

## 2. Dashboard — Visão Geral

O dashboard exibe em tempo real:

- **Total de medicamentos ativos** no estoque
- **Movimentações do dia** (entradas e saídas)
- **Medicamentos vencidos** ou vencendo em 30 dias
- **Alertas críticos** (estoque abaixo do mínimo, validades)
- **Movimentações recentes** (últimas 8)
- **Ações rápidas** para os fluxos mais comuns

> 💡 O sino (🔔) no cabeçalho exibe todos os alertas ativos ao clicar.

---

## 3. Cadastro de Medicamentos (Estoque)

**Menu → Estoque**

### Quando usar

Ao receber um novo medicamento pela primeira vez no sistema, ou ao cadastrar itens ainda não registrados.

### Passo a passo

1. Clique em **"Novo Medicamento"**
2. Preencha os campos obrigatórios:
   - **Nome do Medicamento** — nome comercial ou DCI (ex: Fentanila Citrato)
   - **DCB/DCI** — Denominação Comum Brasileira (ex: FENTANILA)
   - **Lista (Portaria 344/98)** — A1, A2, B1, B2, C1, C2, C3 ou Não Controlado
   - **Categoria** — Analgésico, Anestésico, Sedativo etc.
   - **Unidade** — Ampola, Frasco, Comprimido etc.
   - **Qtd. Atual** — quantidade física no estoque no momento do cadastro
   - **Qtd. Mínima** — a partir de qual quantidade o sistema alerta (ex: 20)
3. Preencha os campos complementares:
   - Concentração, Apresentação, Lote, Fabricante
   - Validade (data de vencimento do lote atual)
   - Registro ANVISA
   - Observações de armazenamento
4. Clique em **"Salvar Medicamento"**

### Resultado

O medicamento aparece na tabela de estoque com barra visual de quantidade e badge da lista ANVISA.

---

## 4. Registro de Entrada de Medicamentos

**Menu → Movimentações → Entrada**  
_ou_  
**Dashboard → Ação Rápida "Registrar Entrada"**

### Quando usar

- Recebimento de novo lote do fornecedor
- Devolução de medicamento de outra unidade
- Ajuste de inventário

### Passo a passo

1. Clique em **"Entrada"** (botão verde)
2. Preencha o modal:
   - **Medicamento** — selecione da lista suspensa
   - **Quantidade** — unidades recebidas
   - **Lote** — número do lote do fornecedor
   - **Validade** — data de vencimento do lote
   - **Nota Fiscal / Documento** — número da NF (opcional)
   - **Justificativa** — observações sobre a entrada
3. O sistema gera automaticamente o **número de protocolo**
4. Clique em **"Registrar"**

### Resultado

- Estoque é atualizado automaticamente (+quantidade)
- Movimentação registrada com data/hora, usuário e protocolo
- Trilha de auditoria criada

---

## 5. Registro de Paciente e Cirurgia

**Menu → Pacientes**

### Quando usar

Antes de qualquer dispensação de medicamento para um procedimento cirúrgico. O prontuário do paciente vincula todas as saídas ao procedimento.

### Passo a passo

1. Clique em **"Nova Cirurgia"**
2. Preencha:
   - **Nº do Prontuário** — número único do paciente no hospital
   - **Nome do Paciente** — nome completo
   - **Data do Procedimento** — data da cirurgia
   - **Tipo de Cirurgia** — ex: Colecistectomia, Artroplastia, Cesariana
   - **Cirurgião Responsável** — nome do médico
   - **Anestesista** — nome do anestesiologista
   - **Sala Cirúrgica** — identificação da sala (ex: Sala 3)
   - **Status** — Agendada / Em andamento / Realizada / Cancelada
3. Clique em **"Salvar"**

> 💡 Um prontuário pode ter múltiplas cirurgias e múltiplas saídas de medicamentos associadas.

---

## 6. Dispensação — Registro de Saída

**Menu → Movimentações → Saída**  
_ou_  
**Dashboard → Ação Rápida "Registrar Saída"**

### Quando usar

Toda vez que um medicamento sai do estoque da farmácia para uso no centro cirúrgico.

### Passo a passo

1. Clique em **"Saída"** (botão vermelho)
2. Preencha:
   - **Medicamento** — selecione (exibe estoque atual)
   - **Quantidade** — unidades dispensadas
   - **Nº do Prontuário** — vincula ao paciente
   - **Nome do Paciente** — preenchimento automático se prontuário cadastrado
   - **Tipo de Cirurgia** — ex: Colecistectomia
   - **Médico Solicitante** — quem solicitou o medicamento
   - **Via de Administração** — IV, IM, Inalatória etc. (opcional)
   - **Justificativa** — indicação clínica obrigatória para controlados
3. O sistema **verifica automaticamente** se há estoque suficiente
4. Clique em **"Registrar"**

### Resultado

- Estoque decrementado automaticamente
- Movimentação vinculada ao prontuário para rastreabilidade
- Protocolo único gerado (ex: `SAI-20240702-0001`)
- Auditoria registrada com usuário, data/hora e justificativa

> ⚠️ Para medicamentos das **Listas A e B (Port. 344/98)**, a justificativa clínica é obrigatória por lei.

---

## 7. Devolução, Perda e Descarte

**Menu → Movimentações**

### Devolução

Medicamento retorna do centro cirúrgico para a farmácia (não utilizado ou parcialmente utilizado).

1. Clique em **"Devolução"**
2. Informe medicamento, quantidade, prontuário e motivo
3. O estoque é incrementado automaticamente

### Perda / Desvio

Medicamento quebrado, contaminado, vencido descoberto no uso ou desvio.

1. Clique em **"Perda"**
2. Informe medicamento, quantidade e **causa obrigatória**:
   - Quebra acidental
   - Contaminação
   - Vencimento identificado no ato
   - Desvio (perda não justificada — obrigatório registrar para SNGPC)
3. O sistema cria um registro especial de perda com auditoria reforçada

### Descarte

Medicamentos vencidos removidos do estoque de forma programada.

1. Clique em **"Descarte"**
2. Informe medicamento, quantidade e número do MTR (se resíduo do Grupo B)
3. Registre também em **Resíduos** para gerar o comprovante RDC 222/2018

---

## 8. Gestão de Resíduos (RDC 222/2018)

**Menu → Resíduos**

### Quando usar

Após cada coleta de resíduos farmacêuticos pela empresa coletora licenciada.

### Grupos de Resíduos

| Grupo | Descrição                                  | Exemplos                                   |
| ----- | ------------------------------------------ | ------------------------------------------ |
| **B** | Resíduos químicos (mais comum na farmácia) | Medicamentos vencidos, frascos com resíduo |
| **D** | Resíduos comuns não contaminados           | Embalagens vazias sem resíduo              |
| **E** | Perfurocortantes                           | Agulhas, ampolas quebradas                 |

### Passo a passo

1. Clique em **"Novo Descarte"**
2. Preencha:
   - **Data do Descarte**
   - **Grupo do Resíduo** — B, D ou E
   - **Descrição** — ex: "Fentanila vencida — 12 ampolas"
   - **Quantidade e Unidade** — ex: 12 ampolas / 0,5 kg
   - **Empresa Coletora** — razão social da empresa licenciada
   - **CNPJ da Empresa** — validação automática
   - **Número do MTR** — Manifesto de Transporte de Resíduos (obrigatório para Grupo B)
   - **Licença IBAMA** — número da licença ambiental da coletora
3. Clique em **"Registrar"**

> ⚠️ Sem MTR o sistema alerta como não conforme na página de Conformidade.

---

## 9. Relatórios Obrigatórios (Port. 344/98)

**Menu → Relatórios**

### Balanço Mensal (Art. 58)

**Obrigatório por lei para controlados A e B — deve ser mantido por 5 anos.**

1. Selecione o **mês** e o **ano**
2. Clique em **"Gerar Relatório"**
3. O sistema calcula automaticamente:
   - Saldo inicial (baseado nas movimentações do período)
   - Entradas do mês
   - Saídas do mês
   - Perdas/Desvios
   - **Saldo final**
4. Clique em **"Imprimir"** — documento formatado para assinatura do RT

### Mapa de Consumo por Cirurgia

Rastreabilidade completa: quais medicamentos foram usados em qual cirurgia, por qual paciente.

### Relatório de Validades

Lista todos os medicamentos ativos por data de vencimento, com classificação:

- 🔴 **Vencido** — deve ser retirado imediatamente
- 🟡 **Vencendo em 30 dias** — ação imediata necessária
- 🟢 **OK**

### Relatório de Perdas/Desvios

Histórico de todas as perdas registradas no período. Essencial para fiscalização da ANVISA.

### Trilha de Auditoria

Log completo de todas as ações no sistema: quem fez o quê, quando e em qual registro.

---

## 10. Conformidade Regulatória

**Menu → Conformidade**

O sistema verifica automaticamente **13 itens de conformidade** baseados em:

- **Port. 344/98** — Substâncias Controladas
- **RDC 222/2018** — Resíduos de Serviços de Saúde
- **Port. 2.814/98** — Assistência Farmacêutica Hospitalar
- **RDC 204/17** — Boas Práticas de Farmácia Hospitalar

### O que é verificado automaticamente

| Item                       | Verificação                            |
| -------------------------- | -------------------------------------- |
| Medicamentos cadastrados   | Pelo menos 1 medicamento no sistema    |
| Listas ANVISA definidas    | Todos os controlados com lista A/B/C   |
| Estoque atualizado         | Todos com qtdAtual definida            |
| Movimentações recentes     | Pelo menos 1 nos últimos 30 dias       |
| Trilha de auditoria        | Registros de auditoria presentes       |
| Usuários com perfil        | Pelo menos 1 usuário ativo             |
| Farmacêutico RT cadastrado | Usuário com role FARMACEUTICO_RT ativo |
| Dados institucionais       | Nome da instituição e RT preenchidos   |
| Sem vencidos em estoque    | Nenhum medicamento ativo vencido       |
| Descartes registrados      | Pelo menos 1 descarte na RDC 222       |
| MTR nos descartes          | Todos os descartes Grupo B com MTR     |
| Cirurgias registradas      | Rastreabilidade ativa                  |
| Estoque mínimo respeitado  | Nenhum item abaixo do mínimo           |

**Score de conformidade** é exibido em % com anel visual colorido.

---

## 11. Auditoria

**Menu → Auditoria** _(visível apenas para Farmacêutico RT e Gestor)_

Log imutável de todas as ações realizadas no sistema:

- Login / Logout
- Criação, edição e exclusão de medicamentos
- Registro de movimentações
- Cadastro de pacientes/cirurgias
- Registro de resíduos
- Alterações de configurações
- Criação/ativação/desativação de usuários

Cada registro contém: **data/hora · usuário · ação · módulo · detalhes**

> Os registros de auditoria **nunca podem ser excluídos** — regra do banco de dados.

---

## 12. Configurações do Sistema

**Menu → Configurações** _(apenas Farmacêutico RT e Administrador)_

Preencha os dados institucionais que aparecem nos relatórios oficiais:

| Campo               | Descrição                                           |
| ------------------- | --------------------------------------------------- |
| Nome da Instituição | Razão social do hospital/clínica                    |
| CNES                | Cadastro Nacional de Estabelecimentos de Saúde      |
| Responsável Técnico | Nome do Farmacêutico RT                             |
| CRF Nº              | Número do registro no Conselho Regional de Farmácia |
| Endereço            | Endereço completo da unidade                        |
| CNPJ                | CNPJ da instituição                                 |

---

## 13. Gestão de Usuários (Admin)

**Menu → Usuários** _(visível apenas para Administrador)_

### Criar novo usuário

1. Clique em **"Novo Usuário"**
2. Preencha: nome, e-mail, senha inicial, perfil de acesso, CRF (se farmacêutico)
3. Clique em **"Salvar"**
4. A conta é criada automaticamente — o usuário já pode fazer login

### Editar usuário

- Altere nome, perfil, CRF
- Ative ou desative o acesso (botão de cadeado na tabela)

### Desativar acesso

Usuários inativos não conseguem logar mas permanecem no histórico de auditoria.

---

## 14. Fluxo Completo do Dia a Dia

### Início do turno (Farmacêutico)

```
1. Login no sistema
2. Verificar Dashboard → alertas de estoque e validade
3. Checar "Conformidade" → identificar pendências
4. Atualizar estoque se houver entrada de novos lotes
   → Movimentações → Entrada
```

### Durante o período cirúrgico

```
5. Ao receber solicitação de medicamento:
   a. Verificar se paciente/cirurgia está cadastrado em "Pacientes"
      → Se não: cadastrar prontuário + dados da cirurgia
   b. Registrar saída:
      → Movimentações → Saída
      → Selecionar medicamento, quantidade, prontuário
      → Preencher justificativa (obrigatória para controlados)
      → Confirmar — estoque é atualizado automaticamente

6. Medicamento devolvido após cirurgia:
   → Movimentações → Devolução
   → Informar quantidade e prontuário
```

### Controle de estoque

```
7. Medicamento com validade próxima identificado:
   → Menu "Validades" para visão completa
   → Planejar substituição do lote

8. Medicamento vencido:
   → Retirar fisicamente do estoque
   → Registrar em Movimentações → Descarte
   → Registrar em Resíduos → Novo Descarte (com MTR)
```

### Fim do mês (Farmacêutico RT)

```
9. Gerar Balanço Mensal:
   → Relatórios → Balanço Mensal
   → Selecionar mês/ano → Gerar → Imprimir
   → Assinar e arquivar (obrigação legal — 5 anos)

10. Verificar conformidade geral:
    → Conformidade → Reverificar
    → Corrigir itens com falha

11. Verificar trilha de auditoria:
    → Auditoria → revisar eventos do mês
```

---

## Legislação de Referência

| Norma                    | Descrição                                                 |
| ------------------------ | --------------------------------------------------------- |
| **Port. SVS/MS 344/98**  | Substâncias sujeitas a controle especial (listas A, B, C) |
| **Port. 344/98 Art. 58** | Balanço mensal obrigatório — conservar por 5 anos         |
| **RDC ANVISA 222/2018**  | Gerenciamento de resíduos de serviços de saúde            |
| **RDC ANVISA 204/17**    | Boas Práticas de Farmácia em serviços de saúde            |
| **Port. MS 2.814/98**    | Assistência farmacêutica hospitalar — RT obrigatório      |
| **Lei 5.991/73**         | Lei da Farmácia — responsabilidade técnica                |
| **LGPD**                 | Lei Geral de Proteção de Dados — auditoria e acesso       |

---

_FarmaCC Pro — Sistema de Gestão de Farmácia para Centro Cirúrgico_  
_Versão 1.0 · Documentação gerada em 02/07/2026_
