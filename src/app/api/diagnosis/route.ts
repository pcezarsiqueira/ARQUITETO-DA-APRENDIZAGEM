import "server-only";
import { createOpenAIClient } from "@/integrations/ai/client";
import { getDiagnosisConfig } from "@/server/diagnosis-config";
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
  getConfig: getDiagnosisConfig,
  limits,
  generate: (apiKey, model, discovery) =>
    generateDiagnosis(createOpenAIClient(apiKey), model, discovery),
});
