import { z } from "zod";
import type { Discovery } from "./models";
export const discoveryFields = [
  "subject",
  "teach",
  "audience",
  "priorKnowledge",
  "difficulties",
  "experiences",
  "modality",
  "constraints",
] as const;
export const analysisSections = [
  "priorKnowledge",
  "hypotheses",
  "constraints",
  "competencies",
  "questions",
  "knowledgeCurse",
] as const;
export const rubricIds = [
  "grounding",
  "separation",
  "observability",
  "criteria",
  "questions",
  "assumptions",
  "feasibility",
] as const;
export function analysisSchema(complete: boolean) {
  const text = complete
    ? z.string().trim().min(1).max(700)
    : z.string().max(20000);
  const reference = z
    .object({ field: z.enum(discoveryFields), quote: text })
    .strict();
  const basis = complete
    ? z.array(reference).min(1).max(3)
    : z.array(reference).max(3);
  return z
    .object({
      schemaVersion: z.literal(2),
      priorKnowledge: z
        .array(
          z
            .object({
              statement: text,
              status: z.enum(["reported_by_specialist", "unverified"]),
              basis,
              rationale: text,
              validationQuestion: text,
            })
            .strict(),
        )
        .max(complete ? 4 : 100),
      hypotheses: z
        .array(
          z
            .object({
              category: z.enum([
                "hidden_assumption",
                "knowledge_gap",
                "skill_gap",
                "cognitive_barrier",
                "behavioral_barrier",
              ]),
              statement: text,
              support: z.enum(["grounded_hypothesis", "weak_inference"]),
              basis,
              rationale: text,
              uncertainty: text,
              validationQuestion: text,
            })
            .strict(),
        )
        .max(complete ? 6 : 100),
      constraints: z
        .array(
          z
            .object({
              kind: z.enum(["time", "modality", "resources", "planning"]),
              statement: text,
              basis,
              effectOnPlanning: text,
            })
            .strict(),
        )
        .max(complete ? 4 : 100),
      competencies: z
        .array(
          z
            .object({
              action: text,
              condition: text,
              performanceEvidence: text,
              successCriterion: text,
              criterionRationale: text,
              objectiveRelation: text,
              feasibility: z
                .object({
                  status: z.enum([
                    "feasible",
                    "needs_validation",
                    "not_feasible",
                  ]),
                  rationale: text,
                })
                .strict(),
              basis,
            })
            .strict(),
        )
        .max(complete ? 4 : 100),
      questions: z
        .array(
          z
            .object({
              question: text,
              missingInformation: text,
              whyNeeded: text,
              decisionImpact: z.enum([
                "objectives",
                "prerequisites",
                "activities",
                "assessment",
              ]),
              decisionChange: text,
              priority: z.enum(["high", "medium", "low"]),
            })
            .strict(),
        )
        .max(complete ? 5 : 100),
      knowledgeCurse: z
        .array(
          z
            .object({
              kind: z.enum([
                "familiarity",
                "jargon",
                "reasoning_jump",
                "omitted_step",
                "tacit_knowledge",
              ]),
              example: text,
              basis,
              rationale: text,
              whyUnconfirmed: text,
              clarifyingQuestion: text,
            })
            .strict(),
        )
        .max(complete ? 5 : 100),
      rationale: complete
        ? z.string().trim().min(1).max(1400)
        : z.string().max(20000),
    })
    .strict();
}
export const pedagogicalOutputSchema = analysisSchema(true);
export const pedagogicalDraftSchema = analysisSchema(false);
export type PedagogicalAnalysis = z.infer<typeof pedagogicalOutputSchema>;
export type AnalysisSection = (typeof analysisSections)[number];
export type RubricId = (typeof rubricIds)[number];
export type Reference = {
  field: (typeof discoveryFields)[number];
  quote: string;
};
export function referencesOf(
  a: PedagogicalAnalysis,
): { path: string; basis: Reference[] }[] {
  return (
    [
      "priorKnowledge",
      "hypotheses",
      "constraints",
      "competencies",
      "knowledgeCurse",
    ] as const
  ).flatMap((section) =>
    a[section].map((item, index) => ({
      path: `${section}.${index}`,
      basis: item.basis,
    })),
  );
}
export function invalidReferences(
  a: PedagogicalAnalysis,
  discovery: Discovery,
): string[] {
  return referencesOf(a).flatMap(({ path, basis }) =>
    basis.flatMap((ref) =>
      !ref.quote.trim() || !discovery[ref.field].includes(ref.quote)
        ? [path]
        : [],
    ),
  );
}
export function projectLegacyAnalysis(a: PedagogicalAnalysis) {
  return {
    priorKnowledge: a.priorKnowledge.map((v) => v.statement),
    assumptions: a.hypotheses
      .filter((v) => v.category === "hidden_assumption")
      .map((v) => v.statement),
    gaps: a.hypotheses
      .filter((v) => v.category.endsWith("gap"))
      .map((v) => v.statement),
    barriers: a.hypotheses
      .filter((v) => v.category.endsWith("barrier"))
      .map((v) => v.statement),
    competencies: a.competencies.map((v) => v.action),
    needsValidation: a.questions.map((v) => v.question),
    rationale: a.rationale,
  };
}

export function pedagogicalPathLabel(parts: PropertyKey[]): string {
  const labels: Record<string, string> = {
    priorKnowledge: "Conhecimento prévio",
    hypotheses: "Hipótese",
    constraints: "Restrição",
    competencies: "Competência",
    questions: "Pergunta",
    knowledgeCurse: "Pressuposto possível",
    statement: "texto",
    status: "situação",
    basis: "fundamentação",
    field: "campo de origem",
    quote: "trecho literal",
    rationale: "justificativa",
    validationQuestion: "pergunta de verificação",
    category: "tipo",
    support: "sustentação",
    uncertainty: "incerteza",
    kind: "tipo",
    effectOnPlanning: "efeito no planejamento",
    action: "ação observável",
    condition: "condição",
    performanceEvidence: "evidência de desempenho",
    successCriterion: "critério de sucesso",
    criterionRationale: "justificativa do critério",
    objectiveRelation: "relação com objetivo",
    feasibility: "viabilidade",
    question: "pergunta",
    missingInformation: "informação faltante",
    whyNeeded: "necessidade",
    decisionImpact: "decisão afetada",
    decisionChange: "mudança na decisão",
    priority: "prioridade",
    example: "exemplo",
    whyUnconfirmed: "limite da afirmação",
    clarifyingQuestion: "pergunta de esclarecimento",
  };
  return parts
    .map((part) =>
      typeof part === "number"
        ? String(part + 1)
        : (labels[String(part)] ?? "campo"),
    )
    .join(" · ");
}
