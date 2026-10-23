import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
// Keep human configuration intact. This only initializes an absent local file.
if (!existsSync(".env.local") && !process.env.DIAGNOSIS_ACCESS_TOKEN) {
  writeFileSync(
    ".env.local",
    `# Local only; never commit or print this file.\nDIAGNOSIS_ACCESS_TOKEN=${randomBytes(32).toString("hex")}\nOPENAI_DIAGNOSIS_MODEL=gpt-4.1-mini\n`,
    { flag: "wx", mode: 0o600 },
  );
  console.log("Configuração local de acesso preparada, sem exibir o segredo.");
} else {
  console.log("Configuração existente preservada.");
}
