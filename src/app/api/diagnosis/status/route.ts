import "server-only";
import { getDiagnosisConfig } from "@/server/diagnosis-config";
export const dynamic = "force-dynamic";
export function GET() {
  const { key, accessToken } = getDiagnosisConfig();
  // Readiness is local configuration only, never an external provider validation.
  return Response.json(
    { configured: !!key && !!accessToken && accessToken.length >= 32 },
    { headers: { "Cache-Control": "no-store" } },
  );
}
