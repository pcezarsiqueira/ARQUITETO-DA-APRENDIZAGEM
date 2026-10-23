import "server-only";
import OpenAI from "openai";
import { generateDiagnosis } from "@/integrations/ai/diagnosis";
import { createDiagnosisHandler } from "@/server/diagnosis-handler";
import { DiagnosisLimits } from "@/server/diagnosis-limits";
export const runtime = "nodejs";
// Global for this process only, including hot reload. No project data is stored here.
const processState = globalThis as typeof globalThis & {
  diagnosisLimits?: DiagnosisLimits;
};
const limits = (processState.diagnosisLimits ??= new DiagnosisLimits());
export const POST = createDiagnosisHandler({
  getConfig: () => ({
    key: process.env.AI_PROVIDER_API_KEY || process.env.OPENAI_API_KEY,
    accessToken: process.env.DIAGNOSIS_ACCESS_TOKEN,
    model: process.env.OPENAI_DIAGNOSIS_MODEL || "gpt-4.1-mini",
    origin: process.env.APP_ORIGIN,
  }),
  limits,
  generate: (apiKey, model, discovery) =>
    generateDiagnosis(
      new OpenAI({
        apiKey,
        baseURL: "https://api.openai.com/v1",
        timeout: 45_000,
        maxRetries: 0,
      }),
      model,
      discovery,
    ),
});
