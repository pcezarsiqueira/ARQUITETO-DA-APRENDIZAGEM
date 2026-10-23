import { buildDiagnosis } from "../../src/domain/diagnosis";
import { emptyDiscovery } from "../../src/domain/models";
import type { PedagogicalAnalysis } from "../../src/domain/pedagogical-analysis";
export const offlineCases = [
  {
    subject: "Redes de computadores",
    teach:
      "Configurar uma rede local e verificar a conectividade entre dois computadores.",
    condition: "Em laboratório local de treinamento, sem dados de produção",
    evidence:
      "Configuração registrada e resultado do teste de conexão entre as máquinas",
    criterion:
      "Endereços distintos na mesma sub-rede e resposta do destino no teste documentado",
  },
  {
    subject: "Circuitos elétricos",
    teach:
      "Calcular a corrente em um circuito resistivo e justificar a escolha da equação.",
    condition:
      "Diante de um esquema didático com tensão e resistência fornecidas",
    evidence:
      "Cálculo escrito com unidades e explicação da relação entre tensão, resistência e corrente",
    criterion:
      "Relação I=V/R aplicada aos valores fornecidos, resultado em ampères e justificativa coerente com o circuito resistivo",
  },
  {
    subject: "Consultas SQL",
    teach:
      "Escrever uma consulta SQL e testar o resultado em uma base de treinamento.",
    condition: "Em um banco local com tabelas e linhas fictícias fornecidas",
    evidence:
      "Consulta executada e comparação das linhas retornadas com a amostra de referência",
    criterion:
      "Colunas e filtros correspondem ao pedido e o resultado coincide com a amostra fornecida",
  },
  {
    subject: "Leitura crítica",
    teach:
      "Comparar as fontes de uma notícia e justificar uma conclusão sobre a confiabilidade.",
    condition: "Diante de duas notícias fictícias e suas fontes identificadas",
    evidence:
      "Quadro de comparação das fontes e conclusão escrita apoiada nos dados disponíveis",
    criterion:
      "A conclusão distingue autoria, evidências e limites sem afirmar certeza não sustentada",
  },
];
export function offlineDiagnosis(c = offlineCases[0]) {
  const discovery = {
    ...emptyDiscovery,
    subject: c.subject,
    teach: c.teach,
    constraints: "60 minutos",
    modality: "Oficina",
  };
  const analysis: PedagogicalAnalysis = {
    schemaVersion: 2,
    priorKnowledge: [],
    hypotheses: [],
    constraints: [],
    questions: [],
    knowledgeCurse: [],
    rationale:
      "Caso construído offline para verificar relações, sem geração e sem eficácia alegada.",
    competencies: [
      {
        action: c.teach,
        condition: c.condition,
        performanceEvidence: c.evidence,
        successCriterion: c.criterion,
        criterionRationale:
          "Critério local do exercício, verificável na amostra fornecida e sem pretensão universal.",
        objectiveRelation: c.teach,
        feasibility: {
          status: "feasible",
          rationale:
            "Uma rodada de exercício e conferência em laboratório didático são condições assumidas somente neste caso de teste.",
        },
        basis: [{ field: "teach", quote: c.teach }],
      },
    ],
  };
  return {
    discovery,
    diagnosis: buildDiagnosis(
      analysis,
      discovery,
      "offline-fixture",
      "2026-10-23T12:00:00.000Z",
    ),
  };
}
