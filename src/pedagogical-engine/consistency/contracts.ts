import { z } from "zod";
const text = z.string().max(2000);
export const capabilitySchema = z.object({
  id: z.string().min(1).max(80),
  label: text,
  sourceQuote: text,
  origin: z.enum(["rule_candidate", "human"]),
});
export const coverageLinkSchema = z.object({
  capabilityId: z.string().max(80),
  competencyIndex: z.number().int().min(0).max(99),
  evidenceQuote: text,
  criterionQuote: text,
  explanation: text,
  judgment: z.enum(["pending", "partial", "absent", "supported_by_human"]),
});
export const dispositionSchema = z.object({
  findingId: z.string().max(200),
  status: z.enum(["pending", "investigate", "keep", "corrected"]),
  justification: text,
});
export const assistedOutputSchema = z
  .object({
    findings: z
      .array(
        z
          .object({
            target: z.string().min(1).max(120),
            issue: z.string().min(1).max(700),
            reason: z.string().min(1).max(700),
            suggestion: z.string().min(1).max(700),
            uncertainty: z.string().min(1).max(700),
          })
          .strict(),
      )
      .max(6),
    limitations: z.string().min(1).max(1000),
  })
  .strict();
export const consistencyReviewSchema = z.object({
  version: z.literal(1),
  originalRecord: z.string().max(2_000_000).optional(),
  sourceSnapshot: z.string().max(2_000_000),
  capabilities: z.array(capabilitySchema).max(20),
  decompositionConfirmed: z.boolean(),
  links: z.array(coverageLinkSchema).max(100),
  dispositions: z.array(dispositionSchema).max(100),
  knowledgeReview: z.object({ note: text, reviewed: z.boolean() }),
  pilotReview: z.object({ confirmed: z.boolean(), justification: text }),
  aiReports: z
    .array(
      z.object({
        purpose: z.enum(["verify", "suggest"]),
        target: z.string().max(200),
        sourceSnapshot: z.string().max(2_000_000),
        createdAt: z.iso.datetime(),
        model: z.string().max(100),
        output: assistedOutputSchema,
      }),
    )
    .max(10),
});
export type Capability = z.infer<typeof capabilitySchema>;
export type ConsistencyReview = z.infer<typeof consistencyReviewSchema>;
export type AssistedOutput = z.infer<typeof assistedOutputSchema>;
export type Finding = {
  id: string;
  kind:
    | "objective"
    | "reference"
    | "feasibility"
    | "assumption"
    | "scope"
    | "criterion"
    | "constraint";
  certainty: "objective_check" | "heuristic_alert";
  title: string;
  detail: string;
  correction: string;
};
