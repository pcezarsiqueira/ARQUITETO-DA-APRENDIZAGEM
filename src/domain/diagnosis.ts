import { z } from "zod";
import { discoverySchema, type Discovery } from "./models";
const items = z.array(z.string().trim().min(1).max(700)).min(1).max(8);
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
  analysis: diagnosisOutputSchema.optional(),
  review: z
    .object({
      status: z.enum(["draft", "approved"]),
      version: z.number().int().positive(),
      sourceDiscovery: discoverySchema,
      generatedAt: z.iso.datetime(),
      model: z.string().min(1).max(100),
      approvedAt: z.iso.datetime().optional(),
      editedByHuman: z.boolean(),
    })
    .optional(),
});
export type Diagnosis = z.infer<typeof diagnosisSchema>;
export const diagnosisRequestSchema = z
  .object({ discovery: discoverySchema, consent: z.literal(true) })
  .strict();
export function discoveryChanged(a: Discovery, b: Discovery) {
  return (
    JSON.stringify(discoverySchema.parse(a)) !==
    JSON.stringify(discoverySchema.parse(b))
  );
}
export function buildDiagnosis(
  output: DiagnosisOutput,
  discovery: Discovery,
  model: string,
  now: string,
  version = 1,
): Diagnosis {
  const parsed = diagnosisOutputSchema.parse(output);
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
    !valid.analysis ||
    discoveryChanged(valid.review.sourceDiscovery, discovery)
  )
    throw new Error(
      "Revise o diagnóstico com a descoberta atual antes de aprovar.",
    );
  return {
    ...valid,
    review: { ...valid.review, status: "approved", approvedAt: now },
  };
}
