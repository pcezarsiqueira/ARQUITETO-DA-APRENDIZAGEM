import { emptyDiscovery, type Project } from "./models";
export const exampleProject: Project = {
  id: "demo-feedback",
  title: "Feedback que desenvolve pessoas",
  updatedAt: "2026-10-22T00:00:00.000Z",
  demonstration: true,
  discovery: {
    ...emptyDiscovery,
    subject: "Feedback construtivo para novos gestores",
    teach:
      "Conduzir uma conversa específica, respeitosa e orientada a acordos.",
    audience: "Novos gestores",
    priorKnowledge:
      "Conhecem as rotinas da equipe, mas têm pouca prática de conversas difíceis.",
    difficulties: "Evitam conflitos ou usam julgamentos genéricos.",
    experiences: "Caso fictício de atraso em uma entrega.",
    modality: "Oficina presencial",
    constraints: "60 minutos; duplas e roteiro impresso.",
  },
  diagnosis: {
    source: "demonstration",
    facts: [
      "Público: novos gestores; oficina de 60 minutos.",
      "Dificuldade informada: evitar conflitos e julgamentos genéricos.",
    ],
    inferences: [
      "Distinguir observação de interpretação pode exigir prática.",
      "A autoridade do gestor pode inibir a escuta.",
    ],
    needsValidation: [
      "Os participantes já praticaram feedback?",
      "Há segurança para simular conversas em duplas?",
    ],
    rationale:
      "Hipóteses editoriais baseadas no cenário fictício; não são pesquisa com aprendizes.",
  },
  maps: [
    {
      version: 1,
      approved: false,
      currentState: "Gestor usa avaliações genéricas ou adia conversas.",
      desiredState:
        "Gestor descreve uma situação, escuta a outra pessoa e combina um próximo passo verificável.",
      objectives: [
        {
          id: "o1",
          behavior: "Conduzir uma conversa de feedback de cinco minutos.",
          evidence: "Simulação observada com checklist.",
          successCriteria:
            "Descrever comportamento observável e impacto, fazer pergunta aberta e pactuar ação e acompanhamento.",
        },
      ],
      prerequisites: [
        "Conhecer a situação concreta e separar fatos de suposições.",
      ],
      barriers: [
        "Receio de conflito",
        "Confusão entre comportamento e identidade",
      ],
      intermediateSkills: [
        "Reescrever julgamentos como observações",
        "Praticar escuta e perguntas abertas",
      ],
    },
  ],
  strategies: [
    {
      id: "guided-practice",
      name: "Estudo de caso com prática guiada",
      how: "Analisar um caso e praticar em duplas com troca de papéis.",
      rationale:
        "Permite ensaiar comportamentos observáveis antes de uma conversa real.",
      risks:
        "Exposição pessoal e roteiros mecânicos; usar casos fictícios e permitir observar em vez de atuar.",
      resources: "Caso impresso, checklist e cronômetro.",
      participation: "Alta, com alternativa de observação.",
      verification: "Observação por pares e nova tentativa após feedback.",
    },
  ],
  deliverables: [
    {
      id: "lesson-demo",
      format: "lesson-plan",
      mapVersion: 1,
      title: "Plano de aula · Conversas que desenvolvem",
      scenes: [],
      sections: [
        {
          title: "Objetivo e evidência",
          content:
            "Conduzir conversa de cinco minutos; evidenciar situação, comportamento, impacto, escuta e acordo observável.",
        },
        {
          title: "Abertura · 5 min",
          content:
            "Apresentar objetivo e regras de segurança. Usar somente situações fictícias.",
        },
        {
          title: "Análise do caso · 10 min",
          content:
            "Entrega atrasada: separar observações de julgamentos. Reescrever ‘você é descomprometido’.",
        },
        {
          title: "Demonstração · 10 min",
          content:
            "Instrutor modela conversa com pergunta aberta e acordo. Grupo identifica os elementos do checklist.",
        },
        {
          title: "Prática em duplas · 20 min",
          content:
            "Cada pessoa pratica cinco minutos e recebe cinco minutos de feedback específico. Oferecer papel de observador.",
        },
        {
          title: "Nova tentativa · 10 min",
          content:
            "Cada participante refaz trecho frágil, observando o critério que faltou.",
        },
        {
          title: "Fechamento · 5 min",
          content:
            "Registrar ação e data de acompanhamento. Transferência ao trabalho depende de observação posterior, não é garantida pela oficina.",
        },
      ],
    },
    {
      id: "story-demo",
      format: "storyboard",
      mapVersion: 1,
      title: "Storyboard · Do julgamento ao acordo",
      sections: [],
      scenes: [
        {
          objective: "Separar fato e julgamento",
          content:
            "‘Você nunca se compromete’ versus ‘a entrega de terça chegou na quinta’.",
          instructorAction:
            "Apresentar as duas falas e perguntar qual é verificável.",
          learnerAction: "Identificar julgamento e reformular a fala.",
          visual: "Duas falas lado a lado.",
          duration: "2 minutos",
          transition: "Da observação ao impacto.",
          evidence: "Frase reformulada com situação e comportamento.",
        },
        {
          objective: "Praticar escuta",
          content: "Explorar o impacto do atraso sem presumir intenção.",
          instructorAction:
            "Modelar pergunta aberta: o que dificultou a entrega?",
          learnerAction: "Propor pergunta e aguardar a resposta do colega.",
          visual: "Fluxo: observar → perguntar → escutar.",
          duration: "3 minutos",
          transition: "Da compreensão ao acordo.",
          evidence: "Pergunta sem acusação e síntese da resposta.",
        },
        {
          objective: "Definir ação verificável",
          content: "Combinar entrega parcial e data de acompanhamento.",
          instructorAction: "Solicitar responsável, ação e prazo.",
          learnerAction: "Negociar acordo e revisar com checklist.",
          visual: "Cartão de acordo com ação, responsável e data.",
          duration: "5 minutos",
          transition: "Retomar na prática em duplas da oficina.",
          evidence: "Acordo observável e acompanhamento agendado.",
        },
      ],
    },
  ],
  validation: {
    source: "editorial",
    findings: [
      {
        criterion: "Alinhamento",
        justification:
          "A simulação observa o mesmo comportamento definido no objetivo.",
        recommendation:
          "Usar checklist explícito e oferecer devolutiva sobre cada critério.",
      },
      {
        criterion: "Progressão e prática",
        justification:
          "O plano progride de análise para demonstração, prática e nova tentativa.",
        recommendation:
          "Ajustar tempo após observar a experiência prévia dos participantes.",
      },
      {
        criterion: "Limite da evidência",
        justification:
          "Uma simulação evidencia desempenho no contexto da oficina, não transferência ao trabalho.",
        recommendation:
          "Combinar acompanhamento posterior com consentimento e critérios claros.",
      },
    ],
  },
};
