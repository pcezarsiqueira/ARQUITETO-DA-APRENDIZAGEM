import "server-only";
import { createOpenAIClient } from "@/integrations/ai/client";
import { DiagnosisLimits } from "@/server/diagnosis-limits";
import {
  assistedReview,
  createReviewHandler,
  getReviewConfig,
  reviewConfigured,
} from "@/server/pedagogical-review";
export const runtime = "nodejs";
const state = globalThis as typeof globalThis & {
  pedagogicalReviewLimits?: DiagnosisLimits;
};
const limits = (state.pedagogicalReviewLimits ??= new DiagnosisLimits(1, 3, 1));
export function GET() {
  return Response.json(
    { configured: reviewConfigured(getReviewConfig()) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
export const POST = createReviewHandler({
  getConfig: getReviewConfig,
  limits,
  generate: (key, model, input) =>
    assistedReview(createOpenAIClient(key), model, input),
});
