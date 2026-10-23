import type { Diagnosis } from "./diagnosis";
import { discoveryChanged } from "./diagnosis";
import type { Project, TransformationMap } from "./models";
import {
  mapRevisionSchema,
  visualMapSchema,
  validRelation,
  type MapNode,
  type MapRevision,
  type NodeKind,
  type RelationKind,
  type VisualMap,
} from "./visual-map";
export function diagnosisMapSnapshot(d?: Diagnosis) {
  return d
    ? JSON.stringify({
        facts: d.facts,
        analysis: d.pedagogy ?? d.analysis ?? d.inferences,
        needsValidation: d.needsValidation,
        rationale: d.pedagogy?.rationale ?? d.rationale,
        review: d.review,
      })
    : "";
}
export function approvedDiagnosis(project: Project) {
  const d = project.diagnosis;
  return (
    !!d?.review &&
    d.review.status === "approved" &&
    !discoveryChanged(d.review.sourceDiscovery, project.discovery)
  );
}
export function newMapNode(type: NodeKind, id: string, index = 0): MapNode {
  return {
    id,
    type,
    title: "",
    description: "",
    x: 40 + (index % 4) * 300,
    y: 50 + Math.floor(index / 4) * 230,
    nature: "human_decision",
    source: {
      kind: "human",
      path: "",
      quote: "",
      natureAtImport: "human_decision",
    },
    modifiedByHuman: false,
    review: { accepted: false, note: "" },
    condition: "",
    dependencyJustification: "",
  };
}
export function arrangeMap(map: MapRevision): MapRevision {
  const columns: Record<NodeKind, number> = {
    current_state: 0,
    desired_state: 4,
    knowledge: 1,
    skill: 1,
    decision: 1,
    prerequisite: 1,
    barrier: 0,
    gap: 0,
    assumption: 0,
    competency: 2,
    evidence: 3,
    criterion: 4,
  };
  const rows = [0, 0, 0, 0, 0];
  return {
    ...map,
    nodes: map.nodes.map((n) => ({
      ...n,
      x: 35 + columns[n.type] * 290,
      y: 55 + rows[columns[n.type]]++ * 230,
    })),
  };
}
export function createMap(
  project: Project,
  kind: "diagnosis" | "legacy_map" | "blank",
  now: string,
): MapRevision {
  if (kind === "diagnosis" && !approvedDiagnosis(project))
    throw new Error(
      "Aprove o diagnóstico atual antes de construir o mapa a partir dele.",
    );
  const old = project.maps.at(-1);
  if (kind === "legacy_map" && !old)
    throw new Error("Não há mapa anterior para adaptar.");
  const map: MapRevision = {
    version: 1,
    createdAt: now,
    summary: "Proposta inicial para revisão humana",
    nodes: [],
    edges: [],
    view: { zoom: 0.75, scrollX: 0, scrollY: 0 },
    source: {
      kind,
      diagnosisSnapshot: diagnosisMapSnapshot(project.diagnosis),
      discoverySnapshot: JSON.stringify(project.discovery),
      diagnosisVersion: project.diagnosis?.review?.version ?? null,
      record: JSON.stringify(
        kind === "legacy_map"
          ? old
          : kind === "diagnosis"
            ? project.diagnosis
            : { discovery: project.discovery },
      ),
    },
    approval: { status: "draft", note: "" },
  };
  let counter = 0;
  const add = (
    type: NodeKind,
    title: string,
    path: string,
    nature: MapNode["nature"],
    description = "",
  ) => {
    const n = newMapNode(type, `node-${++counter}`);
    n.title = title;
    n.description = description;
    n.nature = nature;
    n.source = {
      kind:
        kind === "legacy_map"
          ? "legacy_map"
          : path.startsWith("discovery.")
            ? "discovery"
            : "diagnosis",
      path,
      quote: title,
      natureAtImport: nature,
    };
    map.nodes.push(n);
    return n;
  };
  const edge = (from: MapNode, to: MapNode, relation: RelationKind) =>
    map.edges.push({
      id: `edge-${map.edges.length + 1}`,
      from: from.id,
      to: to.id,
      relation,
      note: "Relação da estrutura original; conferir o significado.",
    });
  const competence = (
    title: string,
    evidence: string,
    criterion: string,
    path: string,
    condition = "",
  ) => {
    const c = add(
      "competency",
      title,
      kind === "legacy_map"
        ? path + ".behavior"
        : path.startsWith("pedagogy.")
          ? path + ".action"
          : path,
      "unverified",
    );
    c.condition = condition;
    if (evidence) {
      const e = add(
        "evidence",
        evidence,
        path + (kind === "legacy_map" ? ".evidence" : ".performanceEvidence"),
        "unverified",
      );
      edge(c, e, "demonstrates");
      if (criterion) {
        const k = add(
          "criterion",
          criterion,
          path +
            (kind === "legacy_map" ? ".successCriteria" : ".successCriterion"),
          "unverified",
        );
        edge(e, k, "assesses");
      }
    } else if (criterion)
      add(
        "criterion",
        criterion,
        path +
          (kind === "legacy_map" ? ".successCriteria" : ".successCriterion"),
        "unverified",
      );
  };
  if (kind === "blank") return map;
  if (kind === "legacy_map" && old) {
    add("current_state", old.currentState, "currentState", "unverified");
    add("desired_state", old.desiredState, "desiredState", "human_decision");
    old.objectives.forEach((o, i) =>
      competence(o.behavior, o.evidence, o.successCriteria, `objectives.${i}`),
    );
    old.prerequisites.forEach((s, i) =>
      add("prerequisite", s, `prerequisites.${i}`, "unverified"),
    );
    old.barriers.forEach((s, i) =>
      add("barrier", s, `barriers.${i}`, "hypothesis"),
    );
    old.intermediateSkills.forEach((s, i) =>
      add("skill", s, `intermediateSkills.${i}`, "unverified"),
    );
  } else {
    const d = project.diagnosis!,
      a = d.pedagogy;
    const current =
      project.discovery.priorKnowledge || project.discovery.difficulties;
    if (current)
      add(
        "current_state",
        current,
        project.discovery.priorKnowledge
          ? "discovery.priorKnowledge"
          : "discovery.difficulties",
        "reported",
      );
    if (project.discovery.teach)
      add(
        "desired_state",
        project.discovery.teach,
        "discovery.teach",
        "human_decision",
      );
    if (a) {
      a.priorKnowledge.forEach((p, i) =>
        add(
          p.status === "reported_by_specialist" ? "knowledge" : "prerequisite",
          p.statement,
          `pedagogy.priorKnowledge.${i}.statement`,
          p.status === "reported_by_specialist" ? "reported" : "unverified",
          p.rationale + "\nA verificar: " + p.validationQuestion,
        ),
      );
      a.hypotheses.forEach((h, i) =>
        add(
          h.category === "hidden_assumption"
            ? "assumption"
            : h.category.endsWith("barrier")
              ? "barrier"
              : "gap",
          h.statement,
          `pedagogy.hypotheses.${i}.statement`,
          "hypothesis",
          h.rationale +
            "\nIncerteza: " +
            h.uncertainty +
            "\nPergunta: " +
            h.validationQuestion,
        ),
      );
      a.competencies.forEach((c, i) =>
        competence(
          c.action,
          c.performanceEvidence,
          c.successCriterion,
          `pedagogy.competencies.${i}`,
          c.condition,
        ),
      );
    } else {
      (d.analysis?.competencies ?? []).forEach((s, i) =>
        competence(s, "", "", `analysis.competencies.${i}`),
      );
      (d.analysis?.priorKnowledge ?? []).forEach((s, i) =>
        add("prerequisite", s, `analysis.priorKnowledge.${i}`, "unverified"),
      );
      (d.analysis?.gaps ?? []).forEach((s, i) =>
        add("gap", s, `analysis.gaps.${i}`, "hypothesis"),
      );
      (d.analysis?.barriers ?? []).forEach((s, i) =>
        add("barrier", s, `analysis.barriers.${i}`, "hypothesis"),
      );
    }
  }
  return mapRevisionSchema.parse(arrangeMap(map));
}
export function mapIsStale(map: MapRevision, project: Project) {
  return (
    map.source.discoverySnapshot !== JSON.stringify(project.discovery) ||
    map.source.diagnosisSnapshot !== diagnosisMapSnapshot(project.diagnosis) ||
    (map.source.kind === "diagnosis" && !approvedDiagnosis(project))
  );
}
export function mapFindings(map: MapRevision) {
  const blocking: string[] = [],
    warnings: string[] = [];
  for (const type of ["current_state", "desired_state", "competency"] as const)
    if (!map.nodes.some((n) => n.type === type))
      blocking.push(
        `Inclua ${type === "current_state" ? "o estado atual" : type === "desired_state" ? "o estado desejado" : "ao menos uma competência"}.`,
      );
  for (const n of map.nodes) {
    if (!n.title.trim()) blocking.push("Há elemento sem conteúdo.");
    if (!n.review.accepted)
      blocking.push(`Revise: ${n.title || "elemento sem nome"}.`);
    if (n.type === "competency") {
      if (!n.condition.trim())
        blocking.push(`Defina a condição de desempenho: ${n.title}.`);
      const evidence = map.edges
        .filter((e) => e.from === n.id && e.relation === "demonstrates")
        .map((e) => map.nodes.find((v) => v.id === e.to)!);
      if (!evidence.length)
        blocking.push(`Relacione uma evidência: ${n.title}.`);
      if (
        evidence.some(
          (e) =>
            !map.edges.some(
              (k) => k.from === e.id && k.relation === "assesses",
            ),
        )
      )
        blocking.push(`Relacione critérios às evidências de: ${n.title}.`);
      if (evidence.some((e) => e.title.trim() === n.title.trim()))
        blocking.push(`A evidência apenas repete a competência: ${n.title}.`);
      if (
        evidence.some((e) =>
          map.edges.some(
            (edge) =>
              edge.from === e.id &&
              edge.relation === "assesses" &&
              map.nodes.find((k) => k.id === edge.to)?.title.trim() ===
                e.title.trim(),
          ),
        )
      )
        blocking.push(`O critério apenas repete a evidência de: ${n.title}.`);
      const dependencies = map.edges.some(
        (e) =>
          (e.from === n.id && e.relation === "requires") ||
          (e.to === n.id && e.relation === "supports"),
      );
      if (!dependencies && n.dependencyJustification.trim().length < 15)
        blocking.push(
          `Relacione conhecimentos/habilidades ou justifique por que não há dependência adicional: ${n.title}.`,
        );
    }
    if (
      !map.edges.some((e) => e.from === n.id || e.to === n.id) &&
      !["current_state", "desired_state"].includes(n.type)
    )
      warnings.push(
        `Elemento ainda sem conexão: ${n.title || "sem nome"}. Pode ser uma investigação independente; não invente relação.`,
      );
  }
  return { blocking: [...new Set(blocking)], warnings };
}
export function connectMap(
  map: MapRevision,
  from: string,
  to: string,
  relation: RelationKind,
  id: string,
  note = "",
): MapRevision {
  const a = map.nodes.find((n) => n.id === from),
    b = map.nodes.find((n) => n.id === to);
  if (!a || !b || from === to || !validRelation(a.type, b.type, relation))
    throw new Error("Escolha elementos e um tipo de conexão compatíveis.");
  if (
    map.edges.some(
      (e) => e.from === from && e.to === to && e.relation === relation,
    )
  )
    throw new Error("Esta conexão já existe.");
  return mapRevisionSchema.parse({
    ...map,
    edges: [...map.edges, { id, from, to, relation, note }],
    approval: { status: "draft", note: map.approval.note },
  });
}
export function removeMapNode(map: MapRevision, id: string): MapRevision {
  return {
    ...map,
    nodes: map.nodes.filter((n) => n.id !== id),
    edges: map.edges.filter((e) => e.from !== id && e.to !== id),
    approval: { status: "draft", note: map.approval.note },
  };
}
export function saveMapRevision(
  project: Project,
  input: MapRevision,
  now: string,
  approve = false,
): VisualMap {
  const map = mapRevisionSchema.parse(structuredClone(input));
  if ((project.visualMap?.revisions.length ?? 0) >= 100)
    throw new Error(
      "O histórico atingiu 100 versões. Nenhuma foi descartada; exporte o projeto para preservação.",
    );
  if (
    approve &&
    (mapIsStale(map, project) ||
      mapFindings(map).blocking.length ||
      map.approval.note.trim().length < 15)
  )
    throw new Error(
      "Revise as pendências, a origem e a justificativa de aprovação.",
    );
  const versions = [
    ...project.maps.map((m) => m.version),
    ...(project.visualMap?.revisions.map((r) => r.version) ?? []),
  ];
  const revision = {
    ...map,
    version: Math.max(0, ...versions) + 1,
    createdAt: now,
    approval: {
      status: approve ? ("approved" as const) : ("draft" as const),
      note: map.approval.note,
      ...(approve ? { approvedAt: now } : {}),
    },
  };
  return visualMapSchema.parse({
    schemaVersion: 1,
    id: project.visualMap?.id ?? "map-" + project.id,
    revisions: [...(project.visualMap?.revisions ?? []), revision],
  });
}
export function rebaseMap(
  map: MapRevision,
  project: Project,
  note: string,
): MapRevision {
  if (note.trim().length < 15)
    throw new Error("Explique como você conferiu as mudanças na origem.");
  if (map.source.kind === "diagnosis" && !approvedDiagnosis(project))
    throw new Error(
      "O diagnóstico atual precisa estar aprovado para confirmar a nova origem.",
    );
  return {
    ...map,
    source: {
      ...map.source,
      diagnosisSnapshot: diagnosisMapSnapshot(project.diagnosis),
      discoverySnapshot: JSON.stringify(project.discovery),
      diagnosisVersion: project.diagnosis?.review?.version ?? null,
    },
    summary: note,
    approval: { status: "draft", note: "" },
    nodes: map.nodes.map((n) => ({
      ...n,
      review: { ...n.review, accepted: false },
    })),
  };
}
export function restoreMapRevision(
  project: Project,
  version: number,
  now: string,
): VisualMap {
  const old = project.visualMap?.revisions.find((r) => r.version === version);
  if (!old) throw new Error("Versão não encontrada.");
  return saveMapRevision(
    project,
    {
      ...structuredClone(old),
      summary: `Restaurada da versão ${version}; revisar novamente.`,
      nodes: old.nodes.map((n) => ({
        ...n,
        review: { ...n.review, accepted: false },
      })),
      approval: { status: "draft", note: "" },
    },
    now,
  );
}
export function projectMapContract(map: MapRevision): TransformationMap {
  return {
    version: map.version,
    approved: map.approval.status === "approved",
    currentState: map.nodes
      .filter((n) => n.type === "current_state")
      .map((n) => n.title)
      .join("\n"),
    desiredState: map.nodes
      .filter((n) => n.type === "desired_state")
      .map((n) => n.title)
      .join("\n"),
    objectives: map.nodes
      .filter((n) => n.type === "competency")
      .map((c) => {
        const ev = map.edges
          .filter((e) => e.from === c.id && e.relation === "demonstrates")
          .map((e) => e.to);
        return {
          id: c.id,
          behavior: c.title,
          evidence: map.nodes
            .filter((n) => ev.includes(n.id))
            .map((n) => n.title)
            .join("\n"),
          successCriteria: map.nodes
            .filter((n) =>
              map.edges.some(
                (e) =>
                  ev.includes(e.from) &&
                  e.to === n.id &&
                  e.relation === "assesses",
              ),
            )
            .map((n) => n.title)
            .join("\n"),
        };
      }),
    prerequisites: map.nodes
      .filter((n) => n.type === "prerequisite")
      .map((n) => n.title),
    barriers: map.nodes
      .filter((n) => ["barrier", "gap", "assumption"].includes(n.type))
      .map((n) => n.title),
    intermediateSkills: map.nodes
      .filter((n) => ["knowledge", "skill", "decision"].includes(n.type))
      .map((n) => n.title),
  };
}

/** Versioned input boundary for future generators. This function never generates or sends data. */
export function approvedMapContract(project: Project, version: number) {
  const revision = project.visualMap?.revisions.find(
    (r) => r.version === version,
  );
  if (
    !revision ||
    revision.approval.status !== "approved" ||
    mapIsStale(revision, project) ||
    mapFindings(revision).blocking.length
  )
    throw new Error(
      "Escolha uma versão atual e aprovada do mapa antes de preparar um entregável.",
    );
  return structuredClone({
    schemaVersion: 1 as const,
    mapId: project.visualMap!.id,
    version: revision.version,
    nodes: revision.nodes,
    edges: revision.edges,
    source: revision.source,
    approval: revision.approval,
  });
}
