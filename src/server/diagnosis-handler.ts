import "server-only";
import { timingSafeEqual } from "node:crypto";
import OpenAI from "openai";
import { ZodError } from "zod";
import {
  buildDiagnosis,
  diagnosisRequestSchema,
  type DiagnosisOutput,
} from "@/domain/diagnosis";
import type { Discovery } from "@/domain/models";
import { DiagnosisProviderError } from "@/integrations/ai/diagnosis";
import { DiagnosisLimits } from "./diagnosis-limits";
const MAX_BYTES = 24_000;
function result(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...(status === 429 ? { "Retry-After": "60" } : {}),
    },
  });
}
async function readLimited(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("empty");
  let length = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_BYTES) {
        await reader.cancel();
        throw new RangeError("body");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const joined = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.length;
  }
  return JSON.parse(new TextDecoder().decode(joined));
}
export type DiagnosisDependencies = {
  getConfig: () => {
    key?: string;
    accessToken?: string;
    model: string;
    origin?: string;
  };
  generate: (
    key: string,
    model: string,
    discovery: Discovery,
  ) => Promise<DiagnosisOutput>;
  limits: DiagnosisLimits;
};
export function createDiagnosisHandler(deps: DiagnosisDependencies) {
  return async function POST(request: Request) {
    const config = deps.getConfig();
    if (!config.key || !config.accessToken || config.accessToken.length < 32)
      return result(
        {
          error:
            "Diagnóstico indisponível. Configure a chave de API e o código de acesso no servidor.",
        },
        503,
      );
    const origin = request.headers.get("origin");
    const allowed = config.origin ?? new URL(request.url).origin;
    if (origin !== allowed)
      return result({ error: "Origem não autorizada." }, 403);
    const authorization = request.headers.get("authorization") ?? "";
    const expected = `Bearer ${config.accessToken}`;
    if (
      Buffer.byteLength(authorization) !== Buffer.byteLength(expected) ||
      !timingSafeEqual(Buffer.from(authorization), Buffer.from(expected))
    )
      return result({ error: "Código de acesso inválido." }, 401);
    if (
      request.headers.get("content-type")?.split(";")[0].trim() !==
      "application/json"
    )
      return result({ error: "Envie os dados como JSON." }, 415);
    if (Number(request.headers.get("content-length")) > MAX_BYTES)
      return result({ error: "Dados excedem o limite de tamanho." }, 413);
    let input;
    try {
      input = diagnosisRequestSchema.parse(await readLimited(request));
    } catch (error) {
      return result(
        {
          error:
            error instanceof RangeError
              ? "Dados excedem o limite de tamanho."
              : "Confira o assunto, os limites dos campos e a autorização de envio.",
        },
        error instanceof RangeError ? 413 : 400,
      );
    }
    const slot = deps.limits.acquire();
    if (!slot)
      return result(
        {
          error:
            "Limite de uso atingido. Aguarde antes de tentar novamente; o orçamento diário também pode ter sido atingido.",
        },
        429,
      );
    try {
      const output = await deps.generate(
        config.key,
        config.model,
        input.discovery,
      );
      return result({
        diagnosis: buildDiagnosis(
          output,
          input.discovery,
          config.model,
          new Date().toISOString(),
        ),
      });
    } catch (error) {
      // Never return/log provider payloads: they can contain private input or credentials.
      if (error instanceof OpenAI.APIConnectionTimeoutError)
        return result(
          {
            error:
              "A análise demorou além do limite. Tente novamente mais tarde.",
          },
          504,
        );
      if (error instanceof OpenAI.APIError && error.status === 429)
        return result(
          {
            error:
              "A OpenAI atingiu um limite de uso ou orçamento. Verifique a conta ou tente mais tarde.",
          },
          429,
        );
      if (
        error instanceof DiagnosisProviderError ||
        error instanceof ZodError ||
        error instanceof SyntaxError
      )
        return result(
          {
            error:
              "A IA não forneceu uma proposta completa e válida. Seus dados anteriores foram preservados.",
          },
          502,
        );
      return result(
        {
          error:
            "Não foi possível concluir a análise. Verifique a configuração do provedor ou tente mais tarde.",
        },
        502,
      );
    } finally {
      slot.release();
    }
  };
}
