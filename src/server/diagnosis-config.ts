import "server-only";
export function getDiagnosisConfig() {
  return {
    key: process.env.AI_PROVIDER_API_KEY || process.env.OPENAI_API_KEY,
    accessToken: process.env.DIAGNOSIS_ACCESS_TOKEN,
    model: process.env.OPENAI_DIAGNOSIS_MODEL || "gpt-4.1-mini",
    origin: process.env.APP_ORIGIN,
  };
}
