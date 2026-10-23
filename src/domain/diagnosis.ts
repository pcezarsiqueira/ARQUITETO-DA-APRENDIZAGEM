import {
  pedagogicalDraftSchema,
  pedagogicalOutputSchema,
  projectLegacyAnalysis,
  rubricIds,
  invalidReferences,
  type PedagogicalAnalysis,
} from "./pedagogical-analysis";
import { consistencyReviewSchema } from "@/pedagogical-engine/consistency/contracts";
import { evaluateDiagnosis } from "./diagnosis-rubric";
import { z } from "zod";
import { discoverySchema, type Discovery } from "./models";
const items = z.array(z.string().trim().min(1).max(700)).max(8);
// All fields required for strict Structured Outputs; no tools or free-form execution.
export const diagnosisOutputSchema = z
  .object({
    priorKnowledge: items,
    assumptions: items,
    gaps: items,
    barriers: items,
    competencies: items,
    needsValidation: items,
    rationale: z.string().trim().min(1).max(1400),
  })
  .strict();
export type DiagnosisOutput = z.infer<typeof diagnosisOutputSchema>;
const legacyText = z.string().max(20000);
export const diagnosisSchema = z.object({
  facts: z.array(legacyText).max(100),
  inferences: z.array(legacyText).max(100),
  needsValidation: z.array(legacyText).max(100),
  source: z.enum(["demonstration", "ai"]),
  rationale: legacyText,
  analysis: z
    .object({
      priorKnowledge: z.array(legacyText).max(100),
      assumptions: z.array(legacyText).max(100),
      gaps: z.array(legacyText).max(100),
      barriers: z.array(legacyText).max(100),
      competencies: z.array(legacyText).max(100),
      needsValidation: z.array(legacyText).max(100),
      rationale: legacyText,
    })
    .optional(),
  consistency: consistencyReviewSchema.optional(),
  pedagogy: pedagogicalDraftSchema.optional(),
  generatedPedagogy: pedagogicalDraftSchema.optional(),
  pedagogyOrigin: z.enum(["ai", "technical_adaptation"]).optional(),
  rejectedItems: z
    .array(
      z.object({
        section: z.string().max(50),
        data: z.string().max(200000),
        rejectedAt: z.iso.datetime(),
      }),
    )
    .max(100)
    .optional(),
  review: z
    .object({
      status: z.enum(["draft", "approved"]),
      version: z.number().int().positive(),
      sourceDiscovery: discoverySchema,
      generatedAt: z.iso.datetime(),
      model: z.string().min(1).max(100),
      approvedAt: z.iso.datetime().optional(),
      editedByHuman: z.boolean(),
      pedagogicalReview: z
        .object({
          reviewedCriteria: z.array(z.enum(rubricIds)).max(7),
          justification: z.string().max(1400),
        })
        .optional(),
    })
    .optional(),
});
export type Diagnosis = z.infer<typeof diagnosisSchema>;
export const diagnosisRequestSchema = z
  .object({
    discovery: discoverySchema,
    consent: z.literal(true),
    costConsent: z.literal(true),
  })
  .strict();
export function discoveryChanged(a: Discovery, b: Discovery) {
  return (
    JSON.stringify(discoverySchema.parse(a)) !==
    JSON.stringify(discoverySchema.parse(b))
  );
}
export function buildDiagnosis(
  output: DiagnosisOutput | PedagogicalAnalysis,
  discovery: Discovery,
  model: string,
  now: string,
  version = 1,
): Diagnosis {
  const structured =
    "schemaVersion" in output
      ? pedagogicalOutputSchema.parse(output)
      : undefined;
  if (structured && invalidReferences(structured, discovery).length)
    throw new Error("Fundamentação sem correspondência na descoberta.");
  const parsed = diagnosisOutputSchema.parse(
    structured ? projectLegacyAnalysis(structured) : output,
  );
  // Facts come directly from the user's input, never from model speculation.
  const labels: Record<keyof Discovery, string> = {
    subject: "Assunto",
    teach: "Transformação pretendida",
    audience: "Público",
    priorKnowledge: "Conhecimentos prévios informados",
    difficulties: "Dificuldades informadas",
    experiences: "Exemplos informados",
    modality: "Modalidade",
    constraints: "Restrições",
  };
  return diagnosisSchema.parse({
    ...(structured
      ? {
          pedagogy: structured,
          generatedPedagogy: structured,
          pedagogyOrigin: "ai",
        }
      : {}),
    facts: Object.entries(discoverySchema.parse(discovery))
      .filter(([, value]) => value.trim())
      .map(([key, value]) => `${labels[key as keyof Discovery]}: ${value}`),
    inferences: [
      ...parsed.priorKnowledge,
      ...parsed.assumptions,
      ...parsed.gaps,
      ...parsed.barriers,
      ...parsed.competencies,
    ],
    needsValidation: parsed.needsValidation,
    source: "ai",
    rationale: parsed.rationale,
    analysis: parsed,
    review: {
      status: "draft",
      version,
      sourceDiscovery: discovery,
      generatedAt: now,
      model,
      editedByHuman: false,
    },
  });
}
export function approveDiagnosis(
  diagnosis: Diagnosis,
  discovery: Discovery,
  now: string,
): Diagnosis {
  const valid = diagnosisSchema.parse(diagnosis);
  if (
    !valid.review ||
    (!valid.analysis && !valid.pedagogy) ||
    discoveryChanged(valid.review.sourceDiscovery, discovery)
  )
    throw new Error(
      "Revise o diagnóstico com a descoberta atual antes de aprovar.",
    );
  if (valid.pedagogy) {
    const rubric = evaluateDiagnosis(valid, discovery);
    if (rubric.blocking.length) throw new Error(rubric.blocking.join(" "));
    if (
      !valid.review.pedagogicalReview ||
      valid.review.pedagogicalReview.justification.trim().length < 15 ||
      rubricIds.some(
        (id) => !valid.review!.pedagogicalReview!.reviewedCriteria.includes(id),
      )
    )
      throw new Error(
        "Registre a revisão humana dos sete critérios e sua justificativa antes de aprovar.",
      );
  }
  return {
    ...valid,
    review: { ...valid.review, status: "approved", approvedAt: now },
  };
}

/** Blank lines are editing affordances, not empty claims. Never truncate user input. */
export function diagnosisLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}
