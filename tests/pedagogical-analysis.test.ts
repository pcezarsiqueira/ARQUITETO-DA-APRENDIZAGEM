import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import original from "../docs/validation/phase2/diagnosis-original.json";
import evidence from "../docs/validation/phase2/evidence.json";
import revised from "../docs/validation/phase2/technical-revision-v2.json";
import {
  diagnosisSchema,
  approveDiagnosis,
  buildDiagnosis,
} from "../src/domain/diagnosis";
import {
  pedagogicalOutputSchema,
  invalidReferences,
  rubricIds,
} from "../src/domain/pedagogical-analysis";
import { evaluateDiagnosis } from "../src/domain/diagnosis-rubric";
import { adaptLegacyDiagnosis } from "../src/domain/adapt-diagnosis";
const old = diagnosisSchema.parse(original);
const improved = diagnosisSchema.parse(revised);
const discovery = old.review!.sourceDiscovery;
function reviewed() {
  const copy = structuredClone(improved);
  copy.review!.pedagogicalReview = {
    reviewedCriteria: [...rubricIds],
    justification:
      "Revisei o vínculo com o objetivo, as evidências e as ressalvas à luz do caso fictício.",
  };
  return copy;
}
test("preserved real original is byte-identical and is not silently migrated", () => {
  assert.equal(
    createHash("sha256")
      .update(readFileSync("docs/validation/phase2/diagnosis-original.json"))
      .digest("hex"),
    evidence.originalSha256,
  );
  assert.equal(old.pedagogy, undefined);
  assert.deepEqual(old.analysis, original.analysis);
  assert.equal(original.review.editedByHuman, false);
});
test("strict new schema requires verification, decision impact and source types; legacy response cannot masquerade as V2", () => {
  assert.throws(() => pedagogicalOutputSchema.parse(original.analysis));
  const a = structuredClone(improved.pedagogy!);
  assert.deepEqual(invalidReferences(a, discovery), []);
  pedagogicalOutputSchema.parse(a);
  assert.throws(() =>
    pedagogicalOutputSchema.parse({
      ...a,
      competencies: ["Conduzir uma conversa respeitosa"],
    }),
  );
  const { successCriterion: _, ...missing } = a.competencies[0];
  void _;
  assert.throws(() =>
    pedagogicalOutputSchema.parse({ ...a, competencies: [missing] }),
  );
  const { decisionChange: __, ...question } = a.questions[0];
  void __;
  assert.throws(() =>
    pedagogicalOutputSchema.parse({ ...a, questions: [question] }),
  );
  assert.throws(() =>
    pedagogicalOutputSchema.parse({
      ...a,
      hypotheses: [{ ...a.hypotheses[0], support: "proven_fact" }],
    }),
  );
});
test("fabricated quotes and confirmed prerequisites inferred from a job title are rejected", () => {
  const copy = reviewed();
  copy.pedagogy!.hypotheses[0].basis[0].quote = "The user never said this";
  assert.ok(evaluateDiagnosis(copy, discovery).blocking.length);
  assert.throws(() =>
    buildDiagnosis(copy.pedagogy!, discovery, "test", new Date().toISOString()),
  );
  const confirmed = reviewed();
  confirmed.pedagogy!.priorKnowledge[0].basis = [
    { field: "audience", quote: discovery.audience },
  ];
  assert.ok(
    evaluateDiagnosis(confirmed, discovery).blocking.some((text) =>
      text.includes("Conhecimento marcado"),
    ),
  );
  assert.throws(() =>
    approveDiagnosis(confirmed, discovery, new Date().toISOString()),
  );
});
test("real-case defects remain visible: operational time, emotional inference, broad action and invented percentage", () => {
  const copy = reviewed();
  copy.pedagogy!.hypotheses[2].statement = original.analysis.barriers[2];
  copy.pedagogy!.competencies[0].action = original.analysis.competencies[3];
  copy.pedagogy!.competencies[0].successCriterion = "80% de retenção garantida";
  const report = evaluateDiagnosis(copy, discovery);
  for (const id of ["separation", "observability", "criteria"])
    assert.equal(
      report.findings.find((f) => f.criterion === id)?.status,
      "needs_review",
    );
  assert.equal(report.learningEffectivenessScore, null);
  const certainty = reviewed();
  certainty.pedagogy!.rationale = original.rationale;
  assert.equal(
    evaluateDiagnosis(certainty, discovery).findings.find(
      (f) => f.criterion === "separation",
    )!.status,
    "needs_review",
  );
  copy.pedagogy!.hypotheses[2].statement = original.analysis.barriers[0];
  assert.match(
    evaluateDiagnosis(copy, discovery).findings.find(
      (f) => f.criterion === "separation",
    )!.justification,
    /emocional/,
  );
});
test("rubric explains seven dimensions and always retains human judgment, never a learning score", () => {
  const report = evaluateDiagnosis(improved, discovery);
  assert.deepEqual(report.blocking, []);
  assert.equal(report.findings.length, 7);
  assert.ok(
    report.findings.every(
      (f) => f.humanJudgment.length > 20 && f.justification.length > 20,
    ),
  );
  assert.equal(report.learningEffectivenessScore, null);
  assert.ok(
    evaluateDiagnosis(old, discovery).findings.every(
      (f) => f.status === "needs_review",
    ),
  );
  assert.throws(() =>
    approveDiagnosis(improved, discovery, new Date().toISOString()),
  );
  assert.equal(
    approveDiagnosis(reviewed(), discovery, new Date().toISOString()).review
      ?.status,
    "approved",
  );
  const partial = reviewed();
  partial.review!.pedagogicalReview!.reviewedCriteria = ["grounding"];
  assert.throws(() =>
    approveDiagnosis(partial, discovery, new Date().toISOString()),
  );
});
test("adaptation is explicit and lossless, creates no invented evidence, preserves large legacy items and blocks incomplete approval", () => {
  const before = JSON.stringify(old);
  const adapted = adaptLegacyDiagnosis(old, discovery);
  assert.equal(JSON.stringify(old), before);
  assert.equal(adapted.pedagogyOrigin, "technical_adaptation");
  assert.deepEqual(adapted.analysis, old.analysis);
  assert.equal(adapted.generatedPedagogy, undefined);
  assert.equal(
    adapted.pedagogy!.competencies[0].action,
    old.analysis!.competencies[0],
  );
  assert.equal(adapted.pedagogy!.competencies[0].performanceEvidence, "");
  assert.equal(adapted.review!.status, "draft");
  assert.throws(() =>
    approveDiagnosis(adapted, discovery, new Date().toISOString()),
  );
  assert.ok(evaluateDiagnosis(adapted, discovery).blocking.length);
  const large = structuredClone(old);
  large.analysis!.barriers = Array.from(
    { length: 8 },
    (_, i) => "Barreira " + i,
  );
  large.analysis!.gaps = Array.from({ length: 8 }, (_, i) => "Lacuna " + i);
  large.analysis!.assumptions = Array.from(
    { length: 8 },
    (_, i) => "Pressuposto " + i,
  );
  large.analysis!.competencies[0] = "x".repeat(2000);
  const largeAdaptation = adaptLegacyDiagnosis(large, discovery);
  assert.equal(largeAdaptation.pedagogy!.hypotheses.length, 24);
  assert.equal(largeAdaptation.pedagogy!.competencies[0].action.length, 2000);
});
test("missing performance evidence and unresolved feasibility block approval even with human acknowledgement", () => {
  const copy = reviewed();
  copy.pedagogy!.competencies[0].performanceEvidence = "";
  assert.throws(() =>
    approveDiagnosis(copy, discovery, new Date().toISOString()),
  );
  const unconfirmed = reviewed();
  unconfirmed.pedagogy!.competencies[0].feasibility.status = "needs_validation";
  assert.throws(() =>
    approveDiagnosis(unconfirmed, discovery, new Date().toISOString()),
  );
});

test("a quantitative threshold is not justified just because it is a substring of the available duration", () => {
  const copy = reviewed();
  copy.pedagogy!.competencies[0].successCriterion = "Executar em 6 minutos";
  assert.equal(
    evaluateDiagnosis(copy, discovery).findings.find(
      (f) => f.criterion === "criteria",
    )?.status,
    "needs_review",
  );
});
test("partial adapted records explain missing evidence rather than reporting a successful structural check", () => {
  const report = evaluateDiagnosis(
    adaptLegacyDiagnosis(old, discovery),
    discovery,
  );
  assert.equal(
    report.findings.find((f) => f.criterion === "grounding")?.status,
    "needs_review",
  );
  assert.match(
    report.findings.find((f) => f.criterion === "grounding")!.justification,
    /sem trechos/,
  );
  assert.match(
    report.findings.find((f) => f.criterion === "criteria")!.justification,
    /Faltam critérios/,
  );
});

test("changing the discovery clears prior rubric acknowledgement as well as approval", async () => {
  const { updateProjectDiscovery } = await import("../src/domain/projects");
  const { exampleProject } = await import("../src/domain/example");
  const approved = approveDiagnosis(
    reviewed(),
    discovery,
    new Date().toISOString(),
  );
  const project = { ...structuredClone(exampleProject), diagnosis: approved };
  const next = updateProjectDiscovery(
    project,
    { ...discovery, audience: "Outro público" },
    new Date().toISOString(),
  );
  assert.equal(next.diagnosis?.review?.status, "draft");
  assert.equal(next.diagnosis?.review?.pedagogicalReview, undefined);
  assert.equal(
    project.diagnosis.review?.pedagogicalReview?.reviewedCriteria.length,
    7,
  );
});

test("demonstrative records without review metadata can be adapted without inventing AI provenance", async () => {
  const { exampleProject } = await import("../src/domain/example");
  const result = adaptLegacyDiagnosis(
    exampleProject.diagnosis!,
    exampleProject.discovery,
  );
  assert.equal(result.source, "demonstration");
  assert.equal(result.review?.version, 1);
  assert.equal(result.pedagogyOrigin, "technical_adaptation");
  assert.equal(result.review?.status, "draft");
  assert.equal(exampleProject.diagnosis?.review, undefined);
});
