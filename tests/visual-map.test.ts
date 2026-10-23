import { test } from "node:test";
import assert from "node:assert/strict";
import { exampleProject } from "../src/domain/example";
import { buildDiagnosis } from "../src/domain/diagnosis";
import { diagnosisSchema } from "../src/domain/diagnosis";
import real from "../docs/validation/phase2/v2-real/diagnosis-original.json";
import { loadProjects, saveProjects } from "../src/persistence/projects";
import {
  updateProjectDiscovery,
  duplicateProject,
} from "../src/domain/projects";
import {
  approvedMapContract,
  approvedDiagnosis,
  arrangeMap,
  connectMap,
  createMap,
  mapFindings,
  mapIsStale,
  newMapNode,
  projectMapContract,
  rebaseMap,
  removeMapNode,
  restoreMapRevision,
  saveMapRevision,
} from "../src/domain/map-operations";
import {
  mapRevisionSchema,
  visualMapSchema,
  validRelation,
} from "../src/domain/visual-map";
import type { Project } from "../src/domain/models";
const now = "2026-10-23T16:00:00.000Z";
export function reviewedExample() {
  const p = structuredClone(exampleProject),
    m = createMap(p, "legacy_map", now);
  const c = m.nodes.find((n) => n.type === "competency")!;
  c.condition = "Diante do caso fictício de atraso, em uma simulação em dupla.";
  c.dependencyJustification =
    "O exercício fornece os dados necessários; nenhuma dependência adicional é assumida neste teste.";
  m.nodes = m.nodes.map((n) => ({
    ...n,
    review: {
      accepted: true,
      note: "Revisado em caso fictício; hipóteses permanecem não comprovadas.",
    },
  }));
  m.approval.note =
    "Revisei os estados, as relações e o desempenho; aprovação restrita a planejamento do caso fictício.";
  return { p, m };
}
test("diagnosis import requires current human approval and never promotes hypotheses into facts", () => {
  const p = {
    ...structuredClone(exampleProject),
    diagnosis: diagnosisSchema.parse(real),
  };
  assert.throws(() => createMap(p, "diagnosis", now));
  p.diagnosis.review!.status = "approved";
  assert.equal(approvedDiagnosis(p), true);
  const m = createMap(p, "diagnosis", now);
  assert.ok(
    m.nodes.some((n) => n.type === "assumption" && n.nature === "hypothesis"),
  );
  assert.ok(
    m.nodes
      .filter((n) => n.source.path.startsWith("pedagogy.hypotheses"))
      .every((n) => n.nature === "hypothesis" && !n.review.accepted),
  );
  const c = m.nodes.find((n) => n.type === "competency")!;
  assert.equal(c.condition, real.pedagogy.competencies[0].condition);
  assert.ok(
    m.edges.some((e) => e.from === c.id && e.relation === "demonstrates"),
  );
  assert.ok(
    !m.edges.some(
      (e) => e.relation === "requires" || e.relation === "supports",
    ),
  );
  p.discovery.teach += " Nova meta.";
  assert.throws(() => createMap(p, "diagnosis", now));
});
test("explicit legacy adaptation preserves all original records and does not invent missing conditions", () => {
  const p = structuredClone(exampleProject),
    raw = JSON.stringify(p);
  const m = createMap(p, "legacy_map", now);
  assert.equal(JSON.stringify(p), raw);
  assert.equal(m.source.record, JSON.stringify(p.maps[0]));
  assert.ok(m.nodes.some((n) => n.type === "skill"));
  assert.equal(m.nodes.find((n) => n.type === "competency")!.condition, "");
  assert.ok(
    m.nodes
      .filter((n) => n.type === "barrier")
      .every((n) => n.nature === "hypothesis"),
  );
  assert.equal(createMap(p, "blank", now).nodes.length, 0);
});
test("approved legacy diagnoses lacking structured evidence create honest incomplete proposals", () => {
  const p = structuredClone(exampleProject);
  p.diagnosis = buildDiagnosis(
    {
      priorKnowledge: ["Rotinas da equipe"],
      assumptions: [],
      gaps: [],
      barriers: [],
      competencies: ["Descrever o comportamento"],
      needsValidation: [],
      rationale: "Exemplo controlado sem evidências estruturadas.",
    },
    p.discovery,
    "controlled",
    now,
  );
  p.diagnosis.review!.status = "approved";
  const m = createMap(p, "diagnosis", now);
  assert.equal(m.nodes.filter((n) => n.type === "evidence").length, 0);
  assert.ok(mapFindings(m).blocking.some((f) => f.includes("evidência")));
});
test("connections are typed, unique, non-reflexive and cannot point at missing elements", () => {
  const { m } = reviewedExample(),
    c = m.nodes.find((n) => n.type === "competency")!,
    k = m.nodes.find((n) => n.type === "prerequisite")!;
  const next = connectMap(m, k.id, c.id, "supports", "manual-edge");
  assert.equal(m.edges.length + 1, next.edges.length);
  assert.throws(() => connectMap(next, k.id, c.id, "supports", "duplicate"));
  assert.throws(() => connectMap(m, c.id, c.id, "leads_to", "self"));
  assert.throws(() => connectMap(m, k.id, c.id, "assesses", "wrong"));
  assert.throws(() =>
    mapRevisionSchema.parse({
      ...m,
      edges: [
        ...m.edges,
        {
          id: "dangling",
          from: c.id,
          to: "absent",
          relation: "demonstrates",
          note: "",
        },
      ],
    }),
  );
  assert.throws(() =>
    mapRevisionSchema.parse({ ...m, nodes: [...m.nodes, m.nodes[0]] }),
  );
  assert.equal(validRelation("competency", "knowledge", "requires"), true);
});
test("removing nodes detaches incident connections without mutating saved origins", () => {
  const { m } = reviewedExample(),
    raw = JSON.stringify(m),
    e = m.nodes.find((n) => n.type === "evidence")!;
  const next = removeMapNode(m, e.id);
  assert.ok(!next.edges.some((c) => c.from === e.id || c.to === e.id));
  assert.equal(JSON.stringify(m), raw);
  assert.ok(mapFindings(next).blocking.some((f) => f.includes("evidência")));
});
test("traceability requires evidence, criteria and justified dependencies without mandatory artificial categories", () => {
  const { m } = reviewedExample();
  assert.deepEqual(mapFindings(m).blocking, []);
  const c = m.nodes.find((n) => n.type === "competency")!,
    e = m.nodes.find((n) => n.type === "evidence")!;
  c.dependencyJustification = "";
  assert.ok(mapFindings(m).blocking.some((f) => f.includes("dependência")));
  const k = m.nodes.find((n) => n.type === "skill")!;
  const linked = connectMap(m, k.id, c.id, "supports", "skill-edge");
  assert.deepEqual(mapFindings(linked).blocking, []);
  const noCriteria = {
    ...linked,
    edges: linked.edges.filter((edge) => edge.relation !== "assesses"),
  };
  assert.ok(
    mapFindings(noCriteria).blocking.some((f) => f.includes("critérios")),
  );
  linked.nodes.find((n) => n.id === e.id)!.title = c.title;
  assert.ok(mapFindings(linked).blocking.some((f) => f.includes("repete")));
});
test("drafts, positions, view and immutable approval history survive persistence with legacy compatibility", () => {
  const { p, m } = reviewedExample();
  m.nodes[0].x = 133;
  m.view = { zoom: 0.6, scrollX: 55, scrollY: 80 };
  p.visualMap = saveMapRevision(p, m, now, true);
  assert.equal(p.visualMap.revisions[0].version, 2);
  const original = JSON.stringify(p.visualMap.revisions[0]);
  const next = structuredClone(p.visualMap.revisions[0]);
  next.nodes[0].title += " Editado.";
  p.visualMap = saveMapRevision(p, next, now);
  assert.equal(p.visualMap.revisions.at(-1)!.approval.status, "draft");
  assert.equal(JSON.stringify(p.visualMap.revisions[0]), original);
  let raw = "";
  const descriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "localStorage",
  );
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: () => raw || null,
      setItem: (_: string, v: string) => {
        raw = v;
      },
    },
  });
  try {
    saveProjects([p, exampleProject]);
    const loaded = loadProjects();
    assert.deepEqual(loaded[0].visualMap, p.visualMap);
    assert.equal(loaded[1].visualMap, undefined);
    assert.deepEqual(loaded[1].maps, exampleProject.maps);
  } finally {
    if (descriptor)
      Object.defineProperty(globalThis, "localStorage", descriptor);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
  const duplicate = duplicateProject(p, "copy", now);
  assert.notEqual(duplicate.visualMap!.id, p.visualMap.id);
  duplicate.visualMap!.revisions[0].nodes[0].x = 999;
  assert.equal(p.visualMap.revisions[0].nodes[0].x, 133);
});
test("diagnosis/discovery changes preserve maps, block approval and require explicit source review", () => {
  const { p, m } = reviewedExample();
  p.visualMap = saveMapRevision(p, m, now, true);
  const original = JSON.stringify(p.visualMap);
  const changed = updateProjectDiscovery(
    p,
    { ...p.discovery, teach: "Novo resultado esperado" },
    now,
  );
  assert.equal(JSON.stringify(changed.visualMap), original);
  assert.equal(mapIsStale(m, changed), true);
  assert.throws(() => saveMapRevision(changed, m, now, true));
  assert.throws(() => rebaseMap(m, changed, ""));
  const reviewed = rebaseMap(
    m,
    changed,
    "Conferi a nova meta e preservo o texto para revisão explícita.",
  );
  assert.deepEqual(
    reviewed.nodes.map((n) => n.title),
    m.nodes.map((n) => n.title),
  );
  assert.ok(reviewed.nodes.every((n) => !n.review.accepted));
  assert.equal(mapIsStale(reviewed, changed), false);
  const d = diagnosisSchema.parse(real);
  d.review!.status = "approved";
  const fromDiag: Project = { ...p, diagnosis: d };
  const dm = createMap(fromDiag, "diagnosis", now);
  d.review!.status = "draft";
  assert.equal(mapIsStale(dm, fromDiag), true);
  assert.throws(() =>
    rebaseMap(
      dm,
      fromDiag,
      "Conferência manual com texto suficiente para explicar a revisão.",
    ),
  );
});
test("restoring appends an unapproved revision, preserves the beginning and refuses to silently trim history", () => {
  const { p, m } = reviewedExample();
  p.visualMap = saveMapRevision(p, m, now, true);
  const before = JSON.stringify(p.visualMap.revisions[0]);
  p.visualMap = restoreMapRevision(p, 2, now);
  assert.equal(p.visualMap.revisions.at(-1)!.version, 3);
  assert.equal(p.visualMap.revisions.at(-1)!.approval.status, "draft");
  assert.ok(
    p.visualMap.revisions.at(-1)!.nodes.every((n) => !n.review.accepted),
  );
  assert.equal(JSON.stringify(p.visualMap.revisions[0]), before);
  p.visualMap.revisions = Array.from({ length: 100 }, (_, i) => ({
    ...structuredClone(m),
    version: i + 2,
  }));
  assert.throws(() => saveMapRevision(p, m, now));
  assert.throws(() =>
    visualMapSchema.parse({ ...p.visualMap, revisions: [m, m] }),
  );
});
test("spatial organization is deterministic and future contract retains provenance and structured performance", () => {
  const { m } = reviewedExample(),
    original = JSON.stringify(m);
  const arranged = arrangeMap(m);
  assert.deepEqual(arrangeMap(arranged), arranged);
  assert.equal(JSON.stringify(m), original);
  const contract = projectMapContract(m);
  assert.equal(contract.version, m.version);
  assert.match(contract.objectives[0].evidence, /Simulação/);
  assert.ok(contract.objectives[0].successCriteria.includes("pactuar"));
  const manual = newMapNode("decision", "manual", 3);
  assert.equal(manual.nature, "human_decision");
  assert.equal(manual.review.accepted, false);
  const many = createMap(structuredClone(exampleProject), "blank", now);
  many.nodes = Array.from({ length: 200 }, (_, i) =>
    newMapNode("knowledge", `large-${i}`, i),
  );
  mapRevisionSchema.parse(arrangeMap(many));
});

test("future consumers receive a versioned full graph only after current human approval", () => {
  const { p, m } = reviewedExample();
  p.visualMap = saveMapRevision(p, m, now);
  assert.throws(() => approvedMapContract(p, 2));
  p.visualMap = saveMapRevision(p, m, now, true);
  const contract = approvedMapContract(p, 3);
  assert.equal(contract.mapId, p.visualMap.id);
  assert.equal(contract.schemaVersion, 1);
  assert.equal(contract.version, 3);
  assert.deepEqual(contract.edges, m.edges);
  contract.nodes[0].title = "consumer-local-change";
  assert.notEqual(
    p.visualMap.revisions[1].nodes[0].title,
    "consumer-local-change",
  );
  p.discovery.teach += " Nova meta.";
  assert.throws(() => approvedMapContract(p, 3));
});
