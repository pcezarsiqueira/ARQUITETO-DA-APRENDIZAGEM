import type { Diagnosis } from "@/domain/diagnosis";
import type { Discovery } from "@/domain/models";
import { evaluateDiagnosis } from "@/domain/diagnosis-rubric";
import { invalidReferences, rubricIds } from "@/domain/pedagogical-analysis";
import type { Capability, ConsistencyReview, Finding } from "./contracts";

const clean = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
// Full source equality, not a security hash. Excludes review/status to avoid self-invalidation.
export function consistencySnapshot(
  d: Diagnosis,
  discovery: Discovery,
): string {
  return JSON.stringify({
    discovery,
    facts: d.facts,
    content: d.pedagogy ?? d.analysis ?? d.inferences,
    rationale: d.pedagogy?.rationale ?? d.rationale,
  });
}
export function extractCapabilities(objective: string): Capability[] {
  if (!objective.trim()) return [];
  // Portuguese clause boundaries only propose candidates. Human decomposition is mandatory.
  const clauses = objective
    .split(/;|\n|\s+e\s+(?=(?:[\p{L}]+(?:ar|er|ir))\b)/u)
    .map((s) => s.trim())
    .filter(Boolean);
  // Expressly stated qualities are separate outcomes, not invented prerequisites.
  const parts = clauses.flatMap((clause) => {
    const qualities = [
      ...clause.matchAll(
        /\b(específic[ao]s?|respeitos[ao]s?|orientad[ao]s? a acordos)\b/giu,
      ),
    ].map((m) => m[0]);
    return qualities.length > 1 ? qualities : [clause];
  });
  // If grammar yields too many parts, retain the entire objective for manual decomposition.
  return (parts.length > 20 ? [objective] : parts).map((sourceQuote, i) => ({
    id: `objective-${i + 1}`,
    label: sourceQuote,
    sourceQuote,
    origin: "rule_candidate",
  }));
}
export function startConsistencyReview(
  d: Diagnosis,
  discovery: Discovery,
): ConsistencyReview {
  return {
    version: 1,
    originalRecord:
      d.consistency?.originalRecord ??
      JSON.stringify({ ...d, consistency: undefined }),
    sourceSnapshot: consistencySnapshot(d, discovery),
    capabilities: extractCapabilities(discovery.teach),
    decompositionConfirmed: false,
    links: [],
    dispositions: [],
    knowledgeReview: { note: "", reviewed: false },
    pilotReview: { confirmed: false, justification: "" },
    aiReports: [],
  };
}
export function reviewIsCurrent(d: Diagnosis, discovery: Discovery) {
  return d.consistency?.sourceSnapshot === consistencySnapshot(d, discovery);
}
function competencyAt(d: Diagnosis, i: number) {
  return d.pedagogy?.competencies[i];
}
export function coverageFor(
  d: Diagnosis,
  discovery: Discovery,
  capability: Capability,
) {
  const review = d.consistency;
  if (!review || !reviewIsCurrent(d, discovery))
    return {
      status: "pending",
      reason: "A relação precisa ser revisada para esta versão do diagnóstico.",
    };
  if (
    !capability.sourceQuote.trim() ||
    !discovery.teach.includes(capability.sourceQuote)
  )
    return {
      status: "pending",
      reason:
        "O trecho precisa corresponder literalmente ao objetivo informado.",
    };
  const links = review.links.filter((l) => l.capabilityId === capability.id);
  if (!links.length)
    return {
      status: "absent",
      reason:
        "Ainda não há competência, evidência e critério relacionados a esta capacidade.",
    };
  if (links.every((l) => l.judgment === "absent"))
    return {
      status: "absent",
      reason: "O revisor registrou ausência de cobertura para esta capacidade.",
    };
  for (const l of links) {
    const c = competencyAt(d, l.competencyIndex);
    if (
      !c ||
      !c.condition.trim() ||
      !l.evidenceQuote.trim() ||
      !l.criterionQuote.trim() ||
      !c.performanceEvidence.includes(l.evidenceQuote) ||
      !c.successCriterion.includes(l.criterionQuote) ||
      l.explanation.trim().length < 15
    )
      continue;
    const values = [
      capability.sourceQuote,
      capability.label,
      c.action,
      discovery.teach,
    ].map(clean);
    // Echoes, empty and copied action/goal do not establish coverage. No word-overlap approval.
    if (
      values.includes(clean(l.evidenceQuote)) ||
      values.includes(clean(l.criterionQuote)) ||
      clean(l.evidenceQuote) === clean(l.criterionQuote)
    )
      continue;
    if (l.judgment === "supported_by_human")
      return {
        status: "supported_by_human",
        reason:
          "Relação justificada pelo revisor, com trechos de evidência e critério. Não é prova de aprendizagem.",
      };
  }
  return {
    status: links.some((l) => l.judgment === "partial") ? "partial" : "pending",
    reason:
      "A relação ainda não tem evidência e critério distintos, trechos válidos e confirmação humana fundamentada.",
  };
}
export function investigateKnowledgeCurse(d: Diagnosis, discovery: Discovery) {
  const prompts: { kind: string; question: string; basis: string }[] = [];
  if (/específic|respeitos|adequad|eficaz/i.test(discovery.teach))
    prompts.push({
      kind: "Familiaridade presumida",
      basis: discovery.teach,
      question:
        "Que exemplos e contraexemplos mostram o que esses termos significam em uma ação concreta?",
    });
  const jargon = [
    ...Object.values(discovery)
      .join(" ")
      .matchAll(/\b[A-ZÁÉÍÓÚ]{2,8}\b/g),
  ].map((m) => m[0]);
  if (jargon.length)
    prompts.push({
      kind: "Jargões e expressões",
      basis: [...new Set(jargon)].join(", "),
      question:
        "O público já consegue explicar e usar estas siglas? Quais precisam de exemplo?",
    });
  if (
    /acordos|configurar|diagnosticar|calcular|testar|verificar|executar/i.test(
      discovery.teach,
    )
  ) {
    prompts.push({
      kind: "Etapas intermediárias e saltos",
      basis: discovery.teach,
      question:
        "Que passos ligam a situação inicial ao resultado? Há alguma decisão intermediária que só o especialista sabe tomar?",
    });
    prompts.push({
      kind: "Conhecimento tácito",
      basis: discovery.teach,
      question:
        "Que sinais você usa para decidir que o resultado é adequado? Demonstre um caso suficiente e um insuficiente.",
    });
  }
  return {
    prompts,
    proposedKinds: d.pedagogy?.knowledgeCurse.map((k) => k.kind) ?? [],
    limitation:
      "Perguntas de investigação, não dificuldades comprovadas. Não é necessário preencher todas as categorias.",
  };
}
export function checkConsistency(
  d: Diagnosis,
  discovery: Discovery,
): Finding[] {
  const findings: Finding[] = [];
  const add = (
    id: string,
    kind: Finding["kind"],
    certainty: Finding["certainty"],
    title: string,
    detail: string,
    correction: string,
  ) => findings.push({ id, kind, certainty, title, detail, correction });
  const a = d.pedagogy;
  if (
    d.facts.some(
      (f) =>
        !Object.values(discovery).some(
          (value) => value.trim() && f.includes(value),
        ),
    )
  )
    add(
      "untraced-fact",
      "assumption",
      "heuristic_alert",
      "Um fato editado precisa de confirmação de origem",
      "Há texto na lista de fatos sem correspondência literal com os campos informados. Pode ser uma explicação humana legítima; não é possível confirmar pela regra.",
      "Confirme a informação na descoberta ou identifique-a como hipótese, registrando a fonte.",
    );
  if (
    a &&
    /acordos/i.test(discovery.teach) &&
    !a.competencies.some((c) =>
      /acordo|próximo passo|responsável|acompanhamento/i.test(
        c.performanceEvidence + " " + c.successCriterion,
      ),
    )
  )
    add(
      "agreement-performance",
      "objective",
      "heuristic_alert",
      "O objetivo pede acordos: onde o aprendiz os demonstra?",
      "No caso conhecido, a evidência e o critério só descrevem clareza e respeito. A busca por sinais de acordo é um alerta conservador, não um avaliador semântico universal.",
      "Defina um desempenho negociado observável ou explique como a evidência existente o demonstra. Repetir a palavra acordo não confirma cobertura.",
    );
  if (!a)
    add(
      "legacy-structure",
      "reference",
      "objective_check",
      "Registro anterior sem evidências estruturadas",
      "O texto original está preservado; não há campos separados para rastrear desempenho.",
      "Organize o registro sem IA e complete os campos manualmente.",
    );
  const capabilities =
    d.consistency?.capabilities ?? extractCapabilities(discovery.teach);
  if (!capabilities.length)
    add(
      "objective-empty",
      "objective",
      "objective_check",
      "O resultado esperado ainda não foi descrito",
      "Não há capacidade explícita para relacionar.",
      "Complete o objetivo na descoberta.",
    );
  for (const cap of capabilities)
    if (coverageFor(d, discovery, cap).status !== "supported_by_human")
      add(
        `coverage:${cap.id}`,
        "objective",
        "objective_check",
        `Falta demonstrar: ${cap.label}`,
        "A relação objetivo → competência → evidência → critério ainda está ausente, parcial ou sem revisão atual.",
        "Vincule trechos verificáveis e explique como demonstram esta capacidade; se faltar desempenho, edite a competência.",
      );
  if (a) {
    if (invalidReferences(a, discovery).length)
      add(
        "invalid-source",
        "reference",
        "objective_check",
        "Há trechos que não constam da descoberta",
        "Uma fonte literal não corresponde ao conteúdo informado.",
        "Corrija a fonte sem inventar informações.",
      );
    a.competencies.forEach((c, i) => {
      if (
        !c.condition.trim() ||
        !c.performanceEvidence.trim() ||
        !c.successCriterion.trim()
      )
        add(
          `missing-performance:${i}`,
          "reference",
          "objective_check",
          `Competência ${i + 1} incompleta`,
          "Faltam condição, evidência ou critério de desempenho.",
          "Preencha com um comportamento observável, sem apenas repetir o objetivo.",
        );
      if (
        c.feasibility.status === "feasible" &&
        (!discovery.constraints.trim() ||
          /conforme planejamento do especialista|cabe|cabendo|tempo suficiente|viável/i.test(
            c.feasibility.rationale,
          ))
      )
        add(
          `feasibility:${i}`,
          "feasibility",
          "heuristic_alert",
          `Viabilidade da competência ${i + 1} exige fundamento`,
          "Informar duração ou declarar que cabe não mostra quanto tempo a prática e a devolutiva exigem. A regra é conservadora; confira as informações disponíveis.",
          "Registre a base concreta ou marque a viabilidade como ainda não verificada.",
        );
      if (
        /claro|respeitos|adequad|eficaz|corretamente/i.test(c.successCriterion)
      )
        add(
          `vague:${i}`,
          "criterion",
          "heuristic_alert",
          `Explique o que conta como sucesso na competência ${i + 1}`,
          "Há qualificadores que podem ser interpretados de modos diferentes. A presença deles não torna todo o critério inválido.",
          "Mostre indicadores, exemplos e contraexemplos que um observador consiga distinguir.",
        );
      const duration = (s: string) => {
        const m = s.match(/\b(\d+)\s*(minutos?|horas?)\b/i);
        return m
          ? Number(m[1]) * (m[2].toLowerCase().startsWith("hora") ? 60 : 1)
          : undefined;
      };
      const available = duration(discovery.constraints),
        needed = duration(c.condition);
      if (available !== undefined && needed !== undefined && needed > available)
        add(
          `duration:${i}`,
          "constraint",
          "objective_check",
          `Duração incompatível na competência ${i + 1}`,
          `A condição menciona ${needed} minutos; a restrição informa ${available}. Confirme se se referem à mesma atividade.`,
          "Reduza o escopo ou esclareça o período indicado, sem alterar a restrição silenciosamente.",
        );
      if (
        /sem (?:acesso a |uso de )?(?:computador|internet)|somente papel/i.test(
          discovery.constraints,
        ) &&
        /(?:executar|acessar|rodar|usar).*(?:online|computador|software|nuvem)/i.test(
          c.condition,
        )
      )
        add(
          `resource:${i}`,
          "constraint",
          "heuristic_alert",
          `Recurso possivelmente indisponível na competência ${i + 1}`,
          "A condição parece exigir um recurso explicitamente restringido.",
          "Adapte a condição ou investigue o recurso; a regra não interpreta todas as alternativas.",
        );
    });
    const history = discovery.priorKnowledge + " " + discovery.experiences;
    a.questions.forEach((q, i) => {
      if (
        /aprendizados obtidos|após (?:o |um )treinamento|j[aá] (?:realizaram|fizeram|aplicaram)|simula[çc][oõ]es anteriores/i.test(
          q.question,
        ) &&
        !/(?:participaram|realizaram|treinamento anterior|simulações anteriores)/i.test(
          history,
        )
      )
        add(
          `previous:${i}`,
          "assumption",
          "heuristic_alert",
          `A pergunta ${i + 1} pode presumir experiência anterior`,
          "A pergunta parece depender de uma experiência que não foi expressamente informada. Uma pergunta sobre se houve experiência é diferente de presumir que houve.",
          "Pergunte primeiro se a experiência ocorreu ou retire a pressuposição.",
        );
    });
    const generatedText = [
      a.rationale,
      ...a.hypotheses.map((h) => h.rationale + " " + h.statement),
      ...a.questions.map((q) => q.decisionChange),
      ...a.competencies.map((c) => c.objectiveRelation),
    ].join(" ");
    if (
      /media[çc][aã]o|mediar conflitos/i.test(generatedText) &&
      !/media[çc][aã]o|mediar conflitos/i.test(discovery.teach)
    )
      add(
        "scope-mediation",
        "scope",
        "heuristic_alert",
        "O diagnóstico pode ampliar o objetivo para mediação de conflitos",
        "Mediação aparece no diagnóstico, mas não está expressa no objetivo. Pode ser contexto legítimo, não é erro comprovado.",
        "Justifique o vínculo ou delimite a competência ao feedback informado.",
      );
    a.constraints.forEach((c, i) => {
      if (
        /restringindo|impossível|não permite/i.test(c.effectOnPlanning) &&
        /digitais|grande grupo/i.test(c.effectOnPlanning) &&
        !/sem.*digital|proibid|não.*grupo/i.test(discovery.constraints)
      )
        add(
          `operational-assumption:${i}`,
          "assumption",
          "heuristic_alert",
          "Uma restrição pode ter sido ampliada sem informação",
          "Duplas e material impresso não comprovam indisponibilidade de plenária ou recursos digitais.",
          "Retire a proibição inferida ou marque a informação como pendente.",
        );
    });
  }
  // Works with both preserved real formats; language alerts never claim exhaustive fact checking.
  const narrative = d.pedagogy?.rationale ?? d.rationale;
  if (/(?:o medo|a ansiedade).*(?:apontam|comprova|demonstra)/i.test(narrative))
    add(
      "emotion-certainty",
      "assumption",
      "heuristic_alert",
      "Uma explicação emocional pode estar sendo tratada como fato",
      "A linguagem parece estabelecer uma causa emocional não demonstrada pela descoberta.",
      "Separe comportamento relatado de explicações possíveis e registre o que falta investigar.",
    );
  if (
    d.analysis?.barriers.some((b) => /60 minutos|limitação do tempo/i.test(b))
  )
    add(
      "legacy-time-barrier",
      "constraint",
      "heuristic_alert",
      "Tempo da oficina não é característica do aprendiz",
      "O registro anterior mistura restrição operacional com barreira de aprendizagem.",
      "Mova o limite para o planejamento em uma revisão, preservando o original.",
    );
  return findings;
}
export function pilotReadiness(d: Diagnosis, discovery: Discovery) {
  const review = d.consistency;
  const reasons: string[] = [];
  if (!review || !reviewIsCurrent(d, discovery))
    return {
      ready: false,
      reasons: [
        "Inicie ou atualize a conferência para esta versão do diagnóstico.",
      ],
    };
  if (
    !review.decompositionConfirmed ||
    !review.capabilities.length ||
    new Set(review.capabilities.map((c) => c.id)).size !==
      review.capabilities.length ||
    review.capabilities.some(
      (c) =>
        !c.label.trim() ||
        !c.sourceQuote.trim() ||
        !discovery.teach.includes(c.sourceQuote),
    )
  )
    reasons.push(
      "Revise a lista de capacidades expressas no objetivo, sem omitir resultados.",
    );
  if (
    review.capabilities.some(
      (c) => coverageFor(d, discovery, c).status !== "supported_by_human",
    )
  )
    reasons.push(
      "Há capacidades sem relação de desempenho confirmada. Justificar uma exceção não equivale a demonstrar cobertura.",
    );
  for (const f of checkConsistency(d, discovery)) {
    const disposition = review.dispositions.find((x) => x.findingId === f.id);
    if (
      f.certainty === "heuristic_alert" &&
      (!disposition ||
        !["keep", "investigate"].includes(disposition.status) ||
        disposition.justification.trim().length < 15)
    )
      reasons.push(`Revise ou registre uma decisão: ${f.title}`);
    if (f.certainty === "objective_check" && f.kind !== "objective")
      reasons.push(f.title);
  }
  if (
    !review.knowledgeReview.reviewed ||
    review.knowledgeReview.note.trim().length < 15
  )
    reasons.push(
      "Registre a investigação contextual dos pressupostos e dos passos que podem parecer óbvios.",
    );
  if (evaluateDiagnosis(d, discovery).blocking.length)
    reasons.push(
      "Há pendências objetivas na estrutura ou na viabilidade do diagnóstico.",
    );
  if (
    d.pedagogy &&
    rubricIds.some(
      (id) => !d.review?.pedagogicalReview?.reviewedCriteria.includes(id),
    )
  )
    reasons.push(
      "A revisão humana dos sete critérios do diagnóstico está incompleta.",
    );
  if (d.review?.status !== "approved")
    reasons.push(
      "A revisão humana do diagnóstico ainda precisa ser aprovada e salva.",
    );
  if (
    !review.pilotReview.confirmed ||
    review.pilotReview.justification.trim().length < 15
  )
    reasons.push(
      "Confirme a revisão para piloto e registre as limitações aceitas.",
    );
  return { ready: reasons.length === 0, reasons: [...new Set(reasons)] };
}

export function assistedSnapshot(d: Diagnosis, discovery: Discovery): string {
  return JSON.stringify({
    diagnosis: consistencySnapshot(d, discovery),
    capabilities: d.consistency?.capabilities,
    links: d.consistency?.links,
  });
}
