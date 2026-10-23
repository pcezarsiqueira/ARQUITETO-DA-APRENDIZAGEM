import { test } from "node:test";
import assert from "node:assert/strict";
import first from "../docs/validation/phase2/diagnosis-original.json";
import second from "../docs/validation/phase2/v2-real/diagnosis-original.json";
import { diagnosisSchema } from "../src/domain/diagnosis";
import { rubricIds } from "../src/domain/pedagogical-analysis";
import { loadProjects, saveProjects } from "../src/persistence/projects";
import { exampleProject } from "../src/domain/example";
import {
  assistedSnapshot,
  checkConsistency,
  consistencySnapshot,
  coverageFor,
  extractCapabilities,
  investigateKnowledgeCurse,
  pilotReadiness,
  startConsistencyReview,
} from "../src/pedagogical-engine/consistency/engine";
import { offlineCases, offlineDiagnosis } from "./fixtures/consistency-cases";

test("both real diagnoses reveal unregistered coverage and known V2 semantic risks without calls or mutation", () => {
  const before = JSON.stringify([first, second]);
  const old = diagnosisSchema.parse(first),
    v2 = diagnosisSchema.parse(second);
  const f1 = checkConsistency(old, old.review!.sourceDiscovery),
    f2 = checkConsistency(v2, v2.review!.sourceDiscovery);
  for (const id of [
    "legacy-structure",
    "emotion-certainty",
    "legacy-time-barrier",
  ])
    assert.ok(f1.some((f) => f.id === id));
  for (const id of [
    "agreement-performance",
    "feasibility:0",
    "previous:3",
    "scope-mediation",
    "vague:0",
    "operational-assumption:1",
  ])
    assert.ok(
      f2.some((f) => f.id === id),
      id,
    );
  assert.equal(
    f2.filter(
      (f) => f.kind === "objective" && f.certainty === "objective_check",
    ).length,
    3,
  );
  assert.ok(
    f2
      .filter((f) => !f.id.startsWith("coverage:"))
      .every((f) => f.certainty === "heuristic_alert"),
  );
  assert.equal(JSON.stringify([first, second]), before);
  assert.equal(pilotReadiness(v2, v2.review!.sourceDiscovery).ready, false);
});

test("generic objective clauses and technical subjects require justified human links, never keyword coverage", () => {
  for (const c of offlineCases) {
    const { discovery, diagnosis: d } = offlineDiagnosis(c);
    d.consistency = startConsistencyReview(d, discovery);
    assert.equal(d.consistency.capabilities.length, 2, c.subject);
    assert.ok(
      d.consistency.capabilities.every((cap) =>
        discovery.teach.includes(cap.sourceQuote),
      ),
    );
    for (const cap of d.consistency.capabilities) {
      assert.equal(coverageFor(d, discovery, cap).status, "absent");
      d.consistency.links.push({
        capabilityId: cap.id,
        competencyIndex: 0,
        evidenceQuote: d.pedagogy!.competencies[0].performanceEvidence,
        criterionQuote: d.pedagogy!.competencies[0].successCriterion,
        explanation:
          "O resultado do exercício mostra a ação e a justificativa conforme o caso fornecido.",
        judgment: "pending",
      });
      assert.notEqual(
        coverageFor(d, discovery, cap).status,
        "supported_by_human",
      );
      d.consistency.links.at(-1)!.judgment = "supported_by_human";
      assert.equal(coverageFor(d, discovery, cap).status, "supported_by_human");
    }
  }
  assert.deepEqual(extractCapabilities(""), []);
  assert.equal(
    extractCapabilities(
      "Formular feedback específico e respeitoso e construir acordos e registrar um plano.",
    ).length,
    4,
  );
  assert.equal(
    extractCapabilities("Investigar um fenômeno desconhecido.").length,
    1,
  );
});

test("repetition, fabricated evidence, missing conditions and partial mappings cannot certify coverage", () => {
  const { discovery, diagnosis: d } = offlineDiagnosis();
  d.pedagogy!.competencies[0].performanceEvidence = discovery.teach;
  d.pedagogy!.competencies[0].successCriterion = discovery.teach;
  d.consistency = startConsistencyReview(d, discovery);
  const cap = d.consistency.capabilities[0];
  const link = {
    capabilityId: cap.id,
    competencyIndex: 0,
    evidenceQuote: discovery.teach,
    criterionQuote: discovery.teach,
    explanation:
      "Repete todas as palavras do objetivo, mas não demonstra o resultado em um desempenho.",
    judgment: "supported_by_human" as const,
  };
  d.consistency.links = [link];
  assert.notEqual(coverageFor(d, discovery, cap).status, "supported_by_human");
  link.evidenceQuote = "Evidência que não consta da competência";
  assert.notEqual(coverageFor(d, discovery, cap).status, "supported_by_human");
});

test("constraint conflicts, insufficient feasibility and untraceable edited facts remain explicit", () => {
  const { discovery, diagnosis: d } = offlineDiagnosis();
  discovery.constraints = "30 minutos; sem computador";
  d.facts.push("Os participantes são ansiosos por natureza.");
  d.pedagogy!.competencies[0].condition =
    "Executar software online no computador durante 90 minutos";
  d.pedagogy!.competencies[0].feasibility.rationale = "Há tempo suficiente.";
  const findings = checkConsistency(d, discovery);
  for (const id of [
    "duration:0",
    "resource:0",
    "feasibility:0",
    "untraced-fact",
  ])
    assert.ok(findings.some((f) => f.id === id));
  assert.equal(
    findings.find((f) => f.id === "duration:0")!.certainty,
    "objective_check",
  );
});

test("knowledge-curse investigation is grounded, contextual and never requires every category", () => {
  const { discovery, diagnosis: d } = offlineDiagnosis(offlineCases[2]);
  const inspection = investigateKnowledgeCurse(d, discovery);
  assert.ok(
    inspection.prompts.some(
      (p) => p.kind.includes("Jargões") && p.basis === "SQL",
    ),
  );
  assert.ok(inspection.prompts.some((p) => p.kind.includes("Etapas")));
  assert.ok(inspection.prompts.some((p) => p.kind.includes("tácito")));
  assert.match(inspection.limitation, /não dificuldades comprovadas/);
  const simple = {
    ...discovery,
    teach: "Observar uma folha",
    subject: "Folhas",
    constraints: "",
    modality: "",
  };
  assert.equal(investigateKnowledgeCurse(d, simple).prompts.length, 0);
});

test("pilot is human-reviewed, preserves uncertainty, requires current coverage and cannot be unlocked by dismissing gaps", () => {
  const { discovery, diagnosis: d } = offlineDiagnosis();
  d.consistency = startConsistencyReview(d, discovery);
  const r = d.consistency;
  r.decompositionConfirmed = true;
  r.links = r.capabilities.map((cap) => ({
    capabilityId: cap.id,
    competencyIndex: 0,
    evidenceQuote: d.pedagogy!.competencies[0].performanceEvidence,
    criterionQuote: d.pedagogy!.competencies[0].successCriterion,
    explanation:
      "Neste caso didático, a configuração e o teste fornecem os resultados observáveis solicitados.",
    judgment: "supported_by_human",
  }));
  r.knowledgeReview = {
    reviewed: true,
    note: "Investigar passos intermediários e sinais usados para interpretar os resultados do teste.",
  };
  r.pilotReview = {
    confirmed: true,
    justification:
      "Piloto assistido limitado ao caso fictício; revisão humana não comprova eficácia ou domínio geral.",
  };
  d.review!.status = "approved";
  d.review!.pedagogicalReview = {
    reviewedCriteria: [...rubricIds],
    justification:
      "Conferi os critérios do diagnóstico para o contexto fictício.",
  };
  assert.equal(pilotReadiness(d, discovery).ready, true);
  r.links[1].judgment = "partial";
  r.dispositions = [
    {
      findingId: `coverage:${r.capabilities[1].id}`,
      status: "keep",
      justification:
        "Desejo manter a lacuna apesar da cobertura não estar demonstrada.",
    },
  ];
  assert.equal(pilotReadiness(d, discovery).ready, false);
  r.links[1].judgment = "supported_by_human";
  const old = consistencySnapshot(d, discovery),
    assisted = assistedSnapshot(d, discovery);
  r.links[0].explanation += " Com revisão complementar.";
  assert.notEqual(assistedSnapshot(d, discovery), assisted);
  d.pedagogy!.competencies[0].performanceEvidence += " Nova edição.";
  assert.notEqual(consistencySnapshot(d, discovery), old);
  assert.equal(pilotReadiness(d, discovery).ready, false);
});

test("consistency decisions and report proposals survive local persistence without altering legacy originals", () => {
  const d = diagnosisSchema.parse(second);
  d.consistency = startConsistencyReview(d, d.review!.sourceDiscovery);
  d.consistency.dispositions = [
    {
      findingId: "feasibility:0",
      status: "investigate",
      justification:
        "Falta saber tamanho da turma e tempo de prática por participante.",
    },
  ];
  let raw = "";
  const storage = {
    getItem: () => raw || null,
    setItem: (_: string, v: string) => {
      raw = v;
    },
  };
  const current = { ...exampleProject, diagnosis: d };
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    value: storage,
    configurable: true,
  });
  try {
    saveProjects([current]);
    assert.deepEqual(loadProjects()[0].diagnosis!.consistency, d.consistency);
    const source = d.consistency.originalRecord;
    d.pedagogy!.rationale += " Edição posterior.";
    assert.equal(
      startConsistencyReview(d, d.review!.sourceDiscovery).originalRecord,
      source,
    );
  } finally {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
  assert.deepEqual(d.generatedPedagogy, second.generatedPedagogy);
});
