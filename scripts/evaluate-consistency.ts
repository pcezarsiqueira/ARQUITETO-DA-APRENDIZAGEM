import { readFileSync, writeFileSync } from "node:fs";
import { diagnosisSchema } from "../src/domain/diagnosis";
import {
  checkConsistency,
  extractCapabilities,
  investigateKnowledgeCurse,
  pilotReadiness,
} from "../src/pedagogical-engine/consistency/engine";
import {
  offlineCases,
  offlineDiagnosis,
} from "../tests/fixtures/consistency-cases";
const base = "docs/validation/phase2/";
const real = ["diagnosis-original.json", "v2-real/diagnosis-original.json"].map(
  (file) => {
    const d = diagnosisSchema.parse(
        JSON.parse(readFileSync(base + file, "utf8")),
      ),
      discovery = d.review!.sourceDiscovery;
    return {
      file,
      capabilityCandidates: extractCapabilities(discovery.teach),
      findings: checkConsistency(d, discovery),
      investigation: investigateKnowledgeCurse(d, discovery),
      pilot: pilotReadiness(d, discovery),
    };
  },
);
const additional = offlineCases.map((c) => {
  const { diagnosis, discovery } = offlineDiagnosis(c);
  return {
    subject: c.subject,
    capabilityCandidates: extractCapabilities(discovery.teach),
    findings: checkConsistency(diagnosis, discovery),
    pilot: pilotReadiness(diagnosis, discovery),
  };
});
const report = {
  scope:
    "Regras de cobertura registrada e alertas conservadores; interpretação de significado exige julgamento humano ou proposta assistida opcional. Não mede eficácia.",
  paidCalls: 0,
  real,
  additional,
  conclusion:
    "Os dois resultados reais exigem revisão de cobertura. Casos offline mostram rastreabilidade, não aprovação pedagógica universal.",
};
writeFileSync(
  base + "consistency-evaluation.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  "Conferência offline preservada: dois resultados reais e quatro assuntos adicionais; nenhuma chamada externa.",
);
