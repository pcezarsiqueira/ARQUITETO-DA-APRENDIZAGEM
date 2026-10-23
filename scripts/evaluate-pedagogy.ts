import { readFileSync, writeFileSync } from "node:fs";
import { diagnosisSchema } from "../src/domain/diagnosis";
import { adaptLegacyDiagnosis } from "../src/domain/adapt-diagnosis";
import {
  evaluateDiagnosis,
  rubricLabels,
} from "../src/domain/diagnosis-rubric";
const base = "docs/validation/phase2/";
const original = diagnosisSchema.parse(
  JSON.parse(readFileSync(base + "diagnosis-original.json", "utf8")),
);
const revision = diagnosisSchema.parse(
  JSON.parse(readFileSync(base + "technical-revision-v2.json", "utf8")),
);
const discovery = original.review!.sourceDiscovery;
const comparison = {
  scope:
    "Verificação estrutural offline; não mede eficácia nem comprova aprendizagem.",
  generationCalls: 0,
  originalOrigin:
    "Diagnóstico da única análise real preservada; adaptação incompleta apenas para aplicar regras, sem alterar o original.",
  revisionOrigin:
    "Revisão técnica baseada no registro e no relatório; não foi gerada pela OpenAI com o novo contrato.",
  labels: rubricLabels,
  original: evaluateDiagnosis(
    adaptLegacyDiagnosis(original, discovery),
    discovery,
  ),
  technicalRevision: evaluateDiagnosis(revision, discovery),
  liveValidationOfV2:
    "Pendente: exige nova autorização antes de qualquer chamada paga.",
};
writeFileSync(
  base + "rubric-comparison-v2.json",
  JSON.stringify(comparison, null, 2) + "\n",
);
if (comparison.technicalRevision.blocking.length)
  throw new Error(
    "A revisão técnica de referência tem pendências estruturais.",
  );
console.log(
  "Rubrica offline registrada. Nenhuma chamada de geração. O julgamento humano continua obrigatório.",
);
