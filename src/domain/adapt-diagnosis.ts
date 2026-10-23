import { diagnosisSchema, type Diagnosis } from "./diagnosis";
import {
  pedagogicalDraftSchema,
  type PedagogicalAnalysis,
} from "./pedagogical-analysis";
import type { Discovery } from "./models";
/** Explicit, lossless adaptation: no model call, no invented evidence, no storage write. */
export function adaptLegacyDiagnosis(
  original: Diagnosis,
  discovery: Discovery,
): Diagnosis {
  if (original.pedagogy) return structuredClone(original);
  const old = original.analysis;
  const reason =
    "Registro antigo: fundamentação e limites não foram registrados. Complete após revisão; não é uma nova geração de IA.";
  const hypotheses = [
    ...(old?.assumptions ?? []).map((statement) => ({
      statement,
      category: "hidden_assumption" as const,
    })),
    ...(old?.gaps ?? []).map((statement) => ({
      statement,
      category: "knowledge_gap" as const,
    })),
    ...(old?.barriers ?? []).map((statement) => ({
      statement,
      category: "behavioral_barrier" as const,
    })),
    ...(!old
      ? original.inferences.map((statement) => ({
          statement,
          category: "hidden_assumption" as const,
        }))
      : []),
  ].map((h) => ({
    ...h,
    support: "weak_inference" as const,
    basis: [],
    rationale: reason,
    uncertainty: "Ocorrência não verificada com aprendizes.",
    validationQuestion: "",
  }));
  const pedagogy: PedagogicalAnalysis = pedagogicalDraftSchema.parse({
    schemaVersion: 2,
    priorKnowledge: (old?.priorKnowledge ?? []).map((statement) => ({
      statement,
      status: "unverified",
      basis: [],
      rationale: reason,
      validationQuestion: "",
    })),
    hypotheses,
    constraints: (
      [
        ["modality", "modality"],
        ["constraints", "planning"],
      ] as const
    )
      .filter(([field]) => discovery[field].trim())
      .map(([field, kind]) => ({
        kind,
        statement: discovery[field],
        basis: [{ field, quote: discovery[field] }],
        effectOnPlanning: "",
      })),
    competencies: (old?.competencies ?? []).map((action) => ({
      action,
      condition: "",
      performanceEvidence: "",
      successCriterion: "",
      criterionRationale: "",
      objectiveRelation: "",
      feasibility: { status: "needs_validation", rationale: "" },
      basis: [],
    })),
    questions: (old?.needsValidation ?? original.needsValidation).map(
      (question) => ({
        question,
        missingInformation: "",
        whyNeeded: "",
        decisionImpact: "objectives",
        decisionChange: "",
        priority: "medium",
      }),
    ),
    knowledgeCurse: [],
    rationale: original.rationale,
  });
  return diagnosisSchema.parse({
    ...structuredClone(original),
    pedagogy,
    pedagogyOrigin: "technical_adaptation",
    review: {
      ...(original.review ?? {
        version: 1,
        sourceDiscovery: discovery,
        generatedAt: new Date().toISOString(),
        model: "registro legado",
      }),
      status: "draft",
      approvedAt: undefined,
      pedagogicalReview: undefined,
      editedByHuman: true,
    },
  });
}
