import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import first from "../docs/validation/phase2/diagnosis-original.json";
import original from "../docs/validation/phase2/v2-real/diagnosis-original.json";
import modelOutput from "../docs/validation/phase2/v2-real/model-output-original.json";
import evidence from "../docs/validation/phase2/v2-real/evidence.json";
import recordedRubric from "../docs/validation/phase2/v2-real/automated-rubric.json";
import { diagnosisSchema, approveDiagnosis } from "../src/domain/diagnosis";
import {
  pedagogicalOutputSchema,
  invalidReferences,
} from "../src/domain/pedagogical-analysis";
import { evaluateDiagnosis } from "../src/domain/diagnosis-rubric";
const diagnosis = diagnosisSchema.parse(original);
const discovery = diagnosis.review!.sourceDiscovery;
const analysis = pedagogicalOutputSchema.parse(modelOutput);

test("sole real V2 result is intact, source-identical, fully structured and not silently approved", () => {
  for (const [name, expected] of [
    ["diagnosis-original.json", evidence.originalSha256],
    ["model-output-original.json", evidence.modelOutputSha256],
  ])
    assert.equal(
      createHash("sha256")
        .update(readFileSync("docs/validation/phase2/v2-real/" + name))
        .digest("hex"),
      expected,
    );
  assert.deepEqual(discovery, first.review.sourceDiscovery);
  assert.deepEqual(analysis, diagnosis.generatedPedagogy);
  assert.deepEqual(analysis, diagnosis.pedagogy);
  assert.deepEqual(invalidReferences(analysis, discovery), []);
  assert.equal(evidence.generationAttemptsThisAuthorization, 1);
  assert.equal(evidence.subsequentPaidCalls, 0);
  assert.equal(diagnosis.review!.status, "draft");
  assert.equal(diagnosis.review!.editedByHuman, false);
  assert.throws(() =>
    approveDiagnosis(diagnosis, discovery, new Date().toISOString()),
  );
});

test("V2 corrects operational-time and emotional-certainty defects without proving learner barriers", () => {
  assert.ok(
    analysis.constraints.some(
      (c) => c.kind === "time" && c.basis.some((b) => b.quote === "60 minutos"),
    ),
  );
  assert.ok(
    analysis.priorKnowledge.every(
      (p) =>
        p.status !== "reported_by_specialist" ||
        p.basis.some((b) => b.field === "priorKnowledge"),
    ),
  );
  assert.ok(analysis.hypotheses.some((h) => h.support === "weak_inference"));
  assert.ok(
    analysis.hypotheses.every(
      (h) => h.rationale && h.uncertainty && h.validationQuestion,
    ),
  );
  assert.ok(
    analysis.hypotheses
      .filter((h) => h.category.endsWith("barrier"))
      .every((h) => !h.statement.includes("60 minutos")),
  );
  assert.doesNotMatch(analysis.rationale, /O medo de conflitos.*apontam/);
});

test("recorded structural checks explicitly do not certify semantic adequacy of the real V2 answer", () => {
  const rubric = evaluateDiagnosis(diagnosis, discovery);
  assert.deepEqual(rubric, recordedRubric);
  assert.deepEqual(rubric.blocking, []);
  assert.ok(
    rubric.findings.every(
      (f) => f.status === "structural_check" && f.humanJudgment.length,
    ),
  );
  assert.equal(rubric.learningEffectivenessScore, null);
  // Known semantic omissions: fields exist, but the actual performance does not include an agreement.
  assert.equal(analysis.competencies.length, 1);
  const competency = analysis.competencies[0];
  assert.ok(
    competency.condition &&
      competency.performanceEvidence &&
      competency.successCriterion &&
      competency.criterionRationale,
  );
  assert.match(discovery.teach, /acordos/);
  assert.doesNotMatch(
    competency.performanceEvidence + " " + competency.successCriterion,
    /acordo|próximo passo|responsável|acompanhamento/,
  );
  // Feasibility refers to an unspecified plan; literal quotes alone cannot substantiate it.
  assert.equal(competency.feasibility.status, "feasible");
  assert.match(
    competency.feasibility.rationale,
    /conforme planejamento do especialista/,
  );
  assert.doesNotMatch(
    Object.values(discovery).join(" "),
    /planejamento do especialista/,
  );
  // The question assumes prior simulation-based teaching, never described in the source.
  assert.ok(
    analysis.questions.some((q) =>
      q.question.includes("aprendizados obtidos em casos fictícios"),
    ),
  );
  assert.equal(
    discovery.experiences,
    "Caso fictício de atraso em uma entrega.",
  );
  // Only one potential knowledge-curse manifestation; labels alone do not establish depth.
  assert.deepEqual(
    analysis.knowledgeCurse.map((k) => k.kind),
    ["familiarity"],
  );
});
