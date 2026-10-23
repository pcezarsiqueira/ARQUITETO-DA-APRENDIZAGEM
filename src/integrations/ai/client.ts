import "server-only";
import OpenAI from "openai";
import { EnvHttpProxyAgent, fetch as proxyFetch } from "undici";
let proxyAgent: EnvHttpProxyAgent | undefined;
/** Honor the platform's HTTPS proxy and CA trust; never disable TLS verification. */
export function createOpenAIClient(apiKey: string): OpenAI {
  const useProxy = !!(
    process.env.HTTPS_PROXY ||
    process.env.HTTP_PROXY ||
    process.env.https_proxy ||
    process.env.http_proxy
  );
  return new OpenAI({
    apiKey,
    baseURL: "https://api.openai.com/v1",
    timeout: 45_000,
    maxRetries: 0,
    ...(useProxy
      ? {
          fetch: proxyFetch as unknown as typeof globalThis.fetch,
          fetchOptions: {
            dispatcher: (proxyAgent ??= new EnvHttpProxyAgent()),
          },
        }
      : {}),
  });
}
