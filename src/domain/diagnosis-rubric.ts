import type { Diagnosis } from "./diagnosis";
import type { Discovery } from "./models";
import {
  invalidReferences,
  referencesOf,
  pedagogicalPathLabel,
  pedagogicalOutputSchema,
  type RubricId,
} from "./pedagogical-analysis";
export type Finding = {
  criterion: RubricId;
  status: "structural_check" | "needs_review";
  justification: string;
  humanJudgment: string;
};
export type RubricReport = {
  blocking: string[];
  findings: Finding[];
  learningEffectivenessScore: null;
};
const labels: Record<RubricId, string> = {
  grounding: "Fundamentação das hipóteses",
  separation: "Fatos e inferências",
  observability: "Ações observáveis",
  criteria: "Critérios de sucesso",
  questions: "Perguntas que mudam decisões",
  assumptions: "Pressupostos ocultos",
  feasibility: "Público e restrições",
};
export { labels as rubricLabels };
export function evaluateDiagnosis(
  d: Diagnosis,
  discovery: Discovery,
): RubricReport {
  const a = d.pedagogy;
  const blocking: string[] = [];
  const found = (
    criterion: RubricId,
    okay: boolean,
    justification: string,
    humanJudgment: string,
  ): Finding => ({
    criterion,
    status: okay ? "structural_check" : "needs_review",
    justification,
    humanJudgment,
  });
  if (!a)
    return {
      blocking: [],
      learningEffectivenessScore: null,
      findings: (Object.keys(labels) as RubricId[]).map((criterion) =>
        found(
          criterion,
          false,
          "Registro antigo: não há estrutura suficiente para verificar este critério.",
          "Adaptar sem IA e revisar, sem inventar campos ausentes.",
        ),
      ),
    };
  const complete = pedagogicalOutputSchema.safeParse(a);
  if (!complete.success)
    blocking.push(
      ...complete.error.issues.map(
        (issue) =>
          `Revise ${pedagogicalPathLabel(issue.path)}: campo obrigatório ou limite de itens/tamanho.`,
      ),
    );
  const bad = invalidReferences(a, discovery);
  if (bad.length)
    blocking.push(
      "Há fundamentações sem trecho literal correspondente na descoberta: " +
        [...new Set(bad)]
          .map((path) =>
            pedagogicalPathLabel(
              path.split(".").map((p) => (/^\d+$/.test(p) ? Number(p) : p)),
            ),
          )
          .join(", "),
    );
  const reportedInvalid = a.priorKnowledge.some(
    (p) =>
      p.status === "reported_by_specialist" &&
      !p.basis.some(
        (ref) =>
          ref.field === "priorKnowledge" &&
          !!ref.quote.trim() &&
          discovery.priorKnowledge.includes(ref.quote),
      ),
  );
  if (reportedInvalid)
    blocking.push(
      "Conhecimento marcado como informado exige trecho do campo de conhecimentos prévios, não uma inferência pelo cargo.",
    );
  if (!a.competencies.length)
    blocking.push(
      "Defina ao menos uma competência verificável antes de aprovar.",
    );
  if (a.competencies.some((c) => c.feasibility.status !== "feasible"))
    blocking.push(
      "Resolva ou rejeite competências cuja viabilidade ainda não foi confirmada.",
    );
  const operational = a.hypotheses.filter(
    (h) =>
      h.category.endsWith("barrier") &&
      /(\b\d+\s*minutos?\b|limita[çc][aã]o (do |de )?tempo|dura[çc][aã]o da oficina|modalidade|roteiro impresso)/i.test(
        h.statement,
      ),
  );
  const psych = a.hypotheses.filter((h) =>
    /\b(medo|ansiedade|transtorno|trauma)\b/i.test(h.statement),
  );
  const emotionalCertainty =
    /\b(?:o medo|a ansiedade|o trauma)\b[^.!?]{0,180}\b(?:aponta\w*|demonstra\w*|comprova\w*)/i.test(
      a.rationale,
    );
  const broad = a.competencies.filter((c) =>
    /^(compreender|conhecer|entender|saber|reconhecer e manejar)\b/i.test(
      c.action.trim(),
    ),
  );
  const providedNumbers = new Set(
    Object.values(discovery)
      .join(" ")
      .match(/\b\d+(?:[,.]\d+)?%?/g) ?? [],
  );
  const unsupportedNumbers = a.competencies.filter((c) =>
    (c.successCriterion.match(/\b\d+(?:[,.]\d+)?%?/g) ?? []).some(
      (n) => !providedNumbers.has(n),
    ),
  );
  const questionsOkay =
    a.questions.length > 0 &&
    a.questions.every(
      (q) =>
        q.missingInformation.trim() &&
        q.whyNeeded.trim() &&
        q.decisionChange.trim(),
    );
  const groundingOkay =
    !bad.length &&
    referencesOf(a).every((item) => item.basis.length > 0) &&
    a.hypotheses.every((h) => h.rationale.trim() && h.uncertainty.trim());
  const observable =
    a.competencies.length > 0 &&
    !broad.length &&
    a.competencies.every(
      (c) =>
        c.action.trim() && c.condition.trim() && c.performanceEvidence.trim(),
    );
  const criteriaComplete =
    a.competencies.length > 0 &&
    a.competencies.every(
      (c) => c.successCriterion.trim() && c.criterionRationale.trim(),
    );
  const curseComplete =
    a.knowledgeCurse.length > 0 &&
    a.knowledgeCurse.every(
      (k) => k.example.trim() && k.whyUnconfirmed.trim() && k.rationale.trim(),
    );
  const feasible =
    a.constraints.length > 0 &&
    a.competencies.length > 0 &&
    a.competencies.every(
      (c) =>
        c.feasibility.status === "feasible" &&
        c.feasibility.rationale.trim() &&
        c.objectiveRelation.trim(),
    );
  return {
    blocking: [...new Set(blocking)],
    learningEffectivenessScore: null,
    findings: [
      found(
        "grounding",
        groundingOkay,
        bad.length
          ? "Há referências que não correspondem ao conteúdo informado."
          : !groundingOkay
            ? "Há afirmações sem trechos, justificativas ou limites registrados. Complete sem inventar suporte."
            : "Trechos, justificativas e limites de inferência estão identificados. Citar um trecho não prova uma relação causal.",
        "Verifique se o trecho realmente sustenta a hipótese e se hipóteses alternativas foram consideradas.",
      ),
      found(
        "separation",
        !reportedInvalid &&
          !operational.length &&
          !psych.length &&
          !emotionalCertainty,
        reportedInvalid
          ? "Um conhecimento foi marcado como informado sem trecho do campo correspondente; não presuma conhecimento pelo cargo."
          : operational.length
            ? "Uma possível barreira menciona restrições operacionais; revise sua classificação."
            : emotionalCertainty
              ? "A justificativa parece transformar uma explicação emocional não observada em causa estabelecida. Revise a incerteza e as alternativas."
              : psych.length
                ? "Há inferência sobre estado emocional ou condição psicológica. Não está comprovada; revise a linguagem e o suporte."
                : "Fatos vêm da descoberta; hipóteses e inferências fracas têm rótulos próprios, e restrições estão separadas.",
        "Confirme que nenhuma frase da justificativa transforma uma hipótese em fato. Essas regras não detectam toda ambiguidade semântica.",
      ),
      found(
        "observability",
        observable,
        broad.length
          ? "Há ação ampla ou verbo mental que exige operacionalização."
          : !observable
            ? "Faltam ação, condição ou evidência de desempenho em competências propostas."
            : "Ações têm condição e evidência explicitadas; isso não garante observabilidade real.",
        "Uma pessoa conseguiria observar o comportamento e reconhecer a evidência sem adivinhar a intenção?",
      ),
      found(
        "criteria",
        !unsupportedNumbers.length && criteriaComplete,
        unsupportedNumbers.length
          ? "Há número no critério que não consta dos dados fornecidos; valide sua justificativa, sem atribuir caráter científico."
          : !criteriaComplete
            ? "Faltam critérios de sucesso ou justificativas para verificá-los."
            : "Critérios e suas justificativas estão declarados, sem pontuação artificial de eficácia.",
        "O critério diferencia desempenho suficiente de insuficiente, com exigência proporcional ao objetivo?",
      ),
      found(
        "questions",
        questionsOkay,
        questionsOkay
          ? "Cada pergunta declara informação faltante, necessidade, decisão afetada, mudança possível e prioridade."
          : "Há perguntas sem decisão explícita ou ainda não foram propostas perguntas de esclarecimento.",
        "A resposta mudaria objetivos, pré-requisitos, atividades ou avaliação? Evite perguntar novamente o que já foi informado.",
      ),
      found(
        "assumptions",
        curseComplete,
        curseComplete
          ? "Há exemplos ligados ao conteúdo e declaração de que não são ocorrências comprovadas."
          : "Não há manifestação proposta. Pode ser adequado; requer justificativa e revisão humana, sem forçar invenções.",
        "Revise familiaridade presumida, jargões, saltos, etapas omitidas e saber tácito, incluindo exemplos e explicações alternativas.",
      ),
      found(
        "feasibility",
        feasible,
        !feasible
          ? "A relação com o objetivo, as restrições ou a viabilidade ainda precisam ser completadas/revistas."
          : "Há vínculo declarado com o objetivo e análise de viabilidade; restrições e público precisam ser conferidos com o contexto real.",
        "As ações cabem no tempo, modalidade e recursos sem ampliar silenciosamente o objetivo?",
      ),
    ],
  };
}
