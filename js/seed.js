/**
 * @file seed.js
 * @description Populador de dados de amostra para demonstração do FarmaCC Pro.
 * Verifica se dados já existem antes de inserir.
 *
 * USO: Abra o console do navegador na página app.html e execute:
 *   import('/js/seed.js').then(m => m.seedDatabase())
 */

import { dbReadAll, dbCreate, dbSet } from "./db.js";
import { snapshotToArray } from "./utils.js";

// ============================================================
// SEED PRINCIPAL
// ============================================================

export async function seedDatabase() {
  console.log("[seed] Verificando se dados já existem...");

  const rawMeds = await dbReadAll("medications");
  const existing = snapshotToArray(rawMeds);

  if (existing.length >= 5) {
    console.log("[seed] Dados já existem. Pulando seed de medicamentos.");
  } else {
    console.log("[seed] Inserindo medicamentos de amostra...");
    await seedMedications();
  }

  const rawMovs = await dbReadAll("movements");
  if (snapshotToArray(rawMovs).length < 5) {
    console.log("[seed] Inserindo movimentações de amostra...");
    await seedMovements();
  }

  const rawSurgs = await dbReadAll("surgeries");
  if (snapshotToArray(rawSurgs).length < 2) {
    console.log("[seed] Inserindo cirurgias de amostra...");
    await seedSurgeries();
  }

  const rawRes = await dbReadAll("residues");
  if (snapshotToArray(rawRes).length < 1) {
    console.log("[seed] Inserindo resíduos de amostra...");
    await seedResidues();
  }

  console.log("[seed] Inserindo configurações padrão...");
  await seedSettings();

  console.log("[seed] ✅ Seed concluído!");
  alert("Dados de amostra inseridos com sucesso! Recarregue a página.");
}

// ============================================================
// MEDICAMENTOS
// ============================================================

async function seedMedications() {
  const meds = [
    {
      nome: "Fentanila",
      dcb: "FENTANILA",
      lista: "A1",
      categoria: "analgésico",
      concentracao: "50 mcg/mL",
      apresentacao: "Ampola 10 mL",
      lote: "FNT-2024-001",
      fabricante: "Cristália",
      validade: "2026-06-30",
      unidade: "ampola",
      qtdAtual: 120,
      qtdMinima: 20,
      qtdMaxima: 200,
      registroAnvisa: "1.0123.0456.001-7",
      observacoes: "Manter em temperatura 15–25°C. Fotossensível.",
      status: "ativo",
    },
    {
      nome: "Midazolam",
      dcb: "MIDAZOLAM",
      lista: "B1",
      categoria: "sedativo",
      concentracao: "5 mg/mL",
      apresentacao: "Ampola 10 mL",
      lote: "MDZ-2024-002",
      fabricante: "Roche",
      validade: "2025-12-31",
      unidade: "ampola",
      qtdAtual: 80,
      qtdMinima: 15,
      qtdMaxima: 150,
      registroAnvisa: "1.0456.0789.001-2",
      observacoes: "Benzodiazepínico. Controle especial lista B1.",
      status: "ativo",
    },
    {
      nome: "Propofol",
      dcb: "PROPOFOL",
      lista: "C1",
      categoria: "anestésico",
      concentracao: "10 mg/mL",
      apresentacao: "Ampola 20 mL",
      lote: "PPF-2024-003",
      fabricante: "Fresenius Kabi",
      validade: "2026-03-15",
      unidade: "ampola",
      qtdAtual: 55,
      qtdMinima: 10,
      qtdMaxima: 100,
      registroAnvisa: "1.0789.0123.001-5",
      observacoes:
        "Emulsão lipídica. Não misturar com outros fármacos na mesma seringa.",
      status: "ativo",
    },
    {
      nome: "Morfina",
      dcb: "MORFINA",
      lista: "A2",
      categoria: "analgésico",
      concentracao: "10 mg/mL",
      apresentacao: "Ampola 1 mL",
      lote: "MRF-2024-004",
      fabricante: "Cristália",
      validade: "2025-09-30",
      unidade: "ampola",
      qtdAtual: 45,
      qtdMinima: 10,
      qtdMaxima: 80,
      registroAnvisa: "1.0321.0654.001-9",
      observacoes: "Opioide. Notificação de receita A especial obrigatória.",
      status: "ativo",
    },
    {
      nome: "Tramadol",
      dcb: "TRAMADOL",
      lista: "B2",
      categoria: "analgésico",
      concentracao: "50 mg/mL",
      apresentacao: "Ampola 2 mL",
      lote: "TRM-2024-005",
      fabricante: "Teuto",
      validade: "2026-11-30",
      unidade: "ampola",
      qtdAtual: 90,
      qtdMinima: 20,
      qtdMaxima: 150,
      registroAnvisa: "1.0654.0987.001-3",
      observacoes: "Analgésico opioide fraco. Lista B2.",
      status: "ativo",
    },
    {
      nome: "Cetamina",
      dcb: "CETAMINA",
      lista: "C3",
      categoria: "anestésico",
      concentracao: "50 mg/mL",
      apresentacao: "Frasco 10 mL",
      lote: "CET-2024-006",
      fabricante: "Cristália",
      validade: "2025-06-30",
      unidade: "frasco",
      qtdAtual: 30,
      qtdMinima: 5,
      qtdMaxima: 60,
      registroAnvisa: "1.0987.0321.001-1",
      observacoes: "Anestésico dissociativo. Lista C3.",
      status: "ativo",
    },
    {
      nome: "Vecurônio",
      dcb: "VECURÔNIO BROMETO",
      lista: "normal",
      categoria: "bloqueador",
      concentracao: "4 mg/mL",
      apresentacao: "Frasco-ampola 10 mg",
      lote: "VEC-2024-007",
      fabricante: "Eurofarma",
      validade: "2026-08-31",
      unidade: "frasco",
      qtdAtual: 40,
      qtdMinima: 8,
      qtdMaxima: 80,
      registroAnvisa: "1.1234.5678.001-4",
      observacoes: "Bloqueador neuromuscular não despolarizante.",
      status: "ativo",
    },
    {
      nome: "Neostigmina",
      dcb: "NEOSTIGMINA",
      lista: "normal",
      categoria: "reversor",
      concentracao: "0,5 mg/mL",
      apresentacao: "Ampola 1 mL",
      lote: "NEO-2024-008",
      fabricante: "Hipolabor",
      validade: "2025-04-30",
      unidade: "ampola",
      qtdAtual: 8,
      qtdMinima: 10,
      qtdMaxima: 50,
      registroAnvisa: "1.5678.9012.001-6",
      observacoes: "Reversor de bloqueio neuromuscular. ESTOQUE BAIXO!",
      status: "ativo",
    },
    {
      nome: "Atropina",
      dcb: "ATROPINA",
      lista: "normal",
      categoria: "anticolinérgico",
      concentracao: "0,5 mg/mL",
      apresentacao: "Ampola 1 mL",
      lote: "ATR-2024-009",
      fabricante: "Hypofarma",
      validade: "2026-02-28",
      unidade: "ampola",
      qtdAtual: 60,
      qtdMinima: 12,
      qtdMaxima: 100,
      registroAnvisa: "1.9012.3456.001-8",
      observacoes: "Anticolinérgico. Uso em bradicardia e pré-anestesia.",
      status: "ativo",
    },
  ];

  const now = Date.now();
  for (const m of meds) {
    await dbCreate("medications", {
      ...m,
      criadoEm: now,
      atualizadoEm: now,
      atualizadoPor: "seed",
    });
    await new Promise((r) => setTimeout(r, 80)); // evitar rate limit
  }
  console.log(`[seed] ${meds.length} medicamentos inseridos.`);
}

// ============================================================
// MOVIMENTAÇÕES
// ============================================================

async function seedMovements() {
  const rawMeds = await dbReadAll("medications");
  const meds = snapshotToArray(rawMeds);
  if (!meds.length) return;

  const medByNome = (nome) => meds.find((m) => m.nome.includes(nome));
  const fent = medByNome("Fentanila");
  const midaz = medByNome("Midazolam");
  const prop = medByNome("Propofol");
  const morf = medByNome("Morfina");

  const hoje = new Date();
  const daysAgo = (d) => new Date(Date.now() - d * 86400000).toISOString();

  const movs = [
    {
      tipo: "entrada",
      medicamentoId: fent?.id,
      medicamentoNome: "Fentanila",
      medicamentoLista: "A1",
      quantidade: 50,
      protocolo: "MOV-2024-000001",
      notaFiscal: "NF-12345",
      fornecedor: "Cristália Distribuidora",
      registradoPorNome: "Dra. Ana Santos",
      registradoPorRole: "FARMACEUTICO_RT",
      dataHora: daysAgo(15),
    },
    {
      tipo: "saida",
      medicamentoId: fent?.id,
      medicamentoNome: "Fentanila",
      medicamentoLista: "A1",
      quantidade: 3,
      protocolo: "MOV-2024-000002",
      pacienteNome: "João Silva",
      prontuario: "PRT-001",
      tipoCirurgia: "Apendicectomia",
      sala: "CC-01",
      medicoResponsavel: "Dr. Carlos Lima",
      crmResponsavel: "CRM-12345",
      registradoPorNome: "Dra. Ana Santos",
      registradoPorRole: "FARMACEUTICO_RT",
      dataHora: daysAgo(7),
    },
    {
      tipo: "saida",
      medicamentoId: midaz?.id,
      medicamentoNome: "Midazolam",
      medicamentoLista: "B1",
      quantidade: 2,
      protocolo: "MOV-2024-000003",
      pacienteNome: "João Silva",
      prontuario: "PRT-001",
      tipoCirurgia: "Apendicectomia",
      sala: "CC-01",
      medicoResponsavel: "Dr. Carlos Lima",
      crmResponsavel: "CRM-12345",
      registradoPorNome: "Dra. Ana Santos",
      registradoPorRole: "FARMACEUTICO_RT",
      dataHora: daysAgo(7),
    },
    {
      tipo: "saida",
      medicamentoId: prop?.id,
      medicamentoNome: "Propofol",
      medicamentoLista: "C1",
      quantidade: 4,
      protocolo: "MOV-2024-000004",
      pacienteNome: "Maria Oliveira",
      prontuario: "PRT-002",
      tipoCirurgia: "Laparoscopia diagnóstica",
      sala: "CC-02",
      medicoResponsavel: "Dra. Beatriz Costa",
      crmResponsavel: "CRM-67890",
      registradoPorNome: "Dra. Ana Santos",
      registradoPorRole: "FARMACEUTICO_RT",
      dataHora: daysAgo(3),
    },
    {
      tipo: "perda",
      medicamentoId: morf?.id,
      medicamentoNome: "Morfina",
      medicamentoLista: "A2",
      quantidade: 1,
      protocolo: "MOV-2024-000005",
      causa: "quebra",
      justificativa: "Ampola quebrada durante movimentação no estoque.",
      registradoPorNome: "Dra. Ana Santos",
      registradoPorRole: "FARMACEUTICO_RT",
      dataHora: daysAgo(2),
    },
    {
      tipo: "saida",
      medicamentoId: fent?.id,
      medicamentoNome: "Fentanila",
      medicamentoLista: "A1",
      quantidade: 2,
      protocolo: "MOV-2024-000006",
      pacienteNome: "Pedro Mendes",
      prontuario: "PRT-003",
      tipoCirurgia: "Colecistectomia laparoscópica",
      sala: "CC-01",
      medicoResponsavel: "Dr. Rafael Torres",
      crmResponsavel: "CRM-11223",
      registradoPorNome: "Farmacêutico Pedro",
      registradoPorRole: "FARMACEUTICO",
      dataHora: daysAgo(1),
    },
  ];

  for (const m of movs) {
    if (!m.medicamentoId) continue;
    await dbCreate("movements", m);
    await new Promise((r) => setTimeout(r, 80));
  }
  console.log(`[seed] ${movs.length} movimentações inseridas.`);
}

// ============================================================
// CIRURGIAS
// ============================================================

async function seedSurgeries() {
  const surgeries = [
    {
      prontuario: "PRT-001",
      pacienteNome: "João Silva",
      data: new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0],
      hora: "08:30",
      tipoCirurgia: "Apendicectomia",
      sala: "CC-01",
      cirurgiao: "Dr. Carlos Lima",
      anestesista: "Dra. Ana Santos",
      tipoAnestesia: "geral",
      status: "realizada",
      observacoes: "Cirurgia de urgência. Paciente em bom estado.",
    },
    {
      prontuario: "PRT-002",
      pacienteNome: "Maria Oliveira",
      data: new Date(Date.now() - 3 * 86400000).toISOString().split("T")[0],
      hora: "14:00",
      tipoCirurgia: "Laparoscopia diagnóstica",
      sala: "CC-02",
      cirurgiao: "Dra. Beatriz Costa",
      anestesista: "Dra. Ana Santos",
      tipoAnestesia: "geral",
      status: "realizada",
      observacoes: "Procedimento eletivo. Sem intercorrências.",
    },
    {
      prontuario: "PRT-003",
      pacienteNome: "Pedro Mendes",
      data: new Date(Date.now() - 1 * 86400000).toISOString().split("T")[0],
      hora: "10:00",
      tipoCirurgia: "Colecistectomia laparoscópica",
      sala: "CC-01",
      cirurgiao: "Dr. Rafael Torres",
      anestesista: "Dra. Ana Santos",
      tipoAnestesia: "geral",
      status: "realizada",
    },
    {
      prontuario: "PRT-004",
      pacienteNome: "Lucia Ferreira",
      data: new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0],
      hora: "07:30",
      tipoCirurgia: "Histerectomia",
      sala: "CC-03",
      cirurgiao: "Dra. Sandra Alves",
      anestesista: "Dr. Marcos Souza",
      tipoAnestesia: "geral",
      status: "agendada",
    },
  ];

  for (const s of surgeries) {
    await dbCreate("surgeries", { ...s, registradoPor: "seed" });
    await new Promise((r) => setTimeout(r, 80));
  }
  console.log(`[seed] ${surgeries.length} cirurgias inseridas.`);
}

// ============================================================
// RESÍDUOS
// ============================================================

async function seedResidues() {
  const residues = [
    {
      grupoResidue: "B",
      dataDescarte: new Date(Date.now() - 30 * 86400000)
        .toISOString()
        .split("T")[0],
      descricao:
        "Medicamentos vencidos — Fentanila 50mcg/mL — lote expirado 2023",
      quantidade: 0.5,
      unidade: "kg",
      empresaColetora: "EcoFarma Descarte LTDA",
      cnpjEmpresa: "12.345.678/0001-90",
      licencaIbama: "IBAMA-2024-001234",
      numeroMTR: "MTR-2024-SP-001",
      observacoes: "Descarte conforme RDC 222/2018.",
      registradoPorNome: "Dra. Ana Santos",
    },
    {
      grupoResidue: "E",
      dataDescarte: new Date(Date.now() - 10 * 86400000)
        .toISOString()
        .split("T")[0],
      descricao: "Perfurocortantes — seringas e agulhas de ampolas",
      quantidade: 1.2,
      unidade: "kg",
      empresaColetora: "EcoFarma Descarte LTDA",
      cnpjEmpresa: "12.345.678/0001-90",
      licencaIbama: "IBAMA-2024-001234",
      numeroMTR: "MTR-2024-SP-002",
      observacoes: "",
      registradoPorNome: "Dra. Ana Santos",
    },
  ];

  for (const r of residues) {
    await dbCreate("residues", { ...r, registradoPor: "seed" });
    await new Promise((r2) => setTimeout(r2, 80));
  }
  console.log(`[seed] ${residues.length} resíduos inseridos.`);
}

// ============================================================
// CONFIGURAÇÕES
// ============================================================

async function seedSettings() {
  await dbSet("settings/main", {
    institutionName: "Hospital Universitário Central",
    address: "Av. Hospitalar, 1000 — São Paulo/SP — CEP 01310-100",
    cnpj: "00.000.000/0001-00",
    cnes: "0123456",
    anvisaNumber: "ANVISA-SP-001234",
    responsavelTecnico: "Dra. Ana Santos",
    crfNumero: "CRF-SP-12345",
  });
  console.log("[seed] Configurações inseridas.");
}
