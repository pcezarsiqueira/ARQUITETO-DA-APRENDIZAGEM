import { z } from "zod";
export const nodeKinds = [
  "current_state",
  "desired_state",
  "knowledge",
  "skill",
  "decision",
  "prerequisite",
  "barrier",
  "gap",
  "assumption",
  "competency",
  "evidence",
  "criterion",
] as const;
export const nodeLabels: Record<NodeKind, string> = {
  current_state: "Estado atual",
  desired_state: "Estado desejado",
  knowledge: "Conhecimento",
  skill: "Habilidade",
  decision: "Decisão",
  prerequisite: "Pré-requisito",
  barrier: "Barreira",
  gap: "Lacuna",
  assumption: "Pressuposto",
  competency: "Competência",
  evidence: "Evidência",
  criterion: "Critério de sucesso",
};
export const relationKinds = [
  "supports",
  "requires",
  "demonstrates",
  "assesses",
  "addresses",
  "leads_to",
] as const;
export const relationLabels: Record<RelationKind, string> = {
  supports: "Contribui para",
  requires: "Depende de",
  demonstrates: "É demonstrada por",
  assesses: "É avaliada por",
  addresses: "Ajuda a superar",
  leads_to: "Conduz a",
};
const text = z.string().max(20000),
  id = z.string().min(1).max(120);
export const mapNodeSchema = z.object({
  id,
  type: z.enum(nodeKinds),
  title: text,
  description: text,
  x: z.number().finite().min(0).max(4000),
  y: z.number().finite().min(0).max(50000),
  nature: z.enum(["reported", "hypothesis", "unverified", "human_decision"]),
  source: z.object({
    kind: z.enum(["diagnosis", "discovery", "legacy_map", "human"]),
    path: z.string().max(200),
    quote: text,
    natureAtImport: z.enum([
      "reported",
      "hypothesis",
      "unverified",
      "human_decision",
    ]),
  }),
  modifiedByHuman: z.boolean(),
  review: z.object({ accepted: z.boolean(), note: z.string().max(2000) }),
  condition: text,
  dependencyJustification: z.string().max(2000),
});
export const mapEdgeSchema = z.object({
  id,
  from: id,
  to: id,
  relation: z.enum(relationKinds),
  note: z.string().max(2000),
});
export const mapRevisionSchema = z
  .object({
    version: z.number().int().positive(),
    createdAt: z.iso.datetime(),
    summary: z.string().max(2000),
    nodes: z.array(mapNodeSchema).max(200),
    edges: z.array(mapEdgeSchema).max(600),
    view: z.object({
      zoom: z.number().min(0.4).max(1.5),
      scrollX: z.number().min(0).max(10000),
      scrollY: z.number().min(0).max(100000),
    }),
    source: z.object({
      kind: z.enum(["diagnosis", "legacy_map", "blank"]),
      diagnosisSnapshot: z.string().max(2_000_000),
      discoverySnapshot: z.string().max(20000),
      diagnosisVersion: z.number().int().positive().nullable(),
      record: z.string().max(2_000_000),
    }),
    approval: z.object({
      status: z.enum(["draft", "approved"]),
      note: z.string().max(2000),
      approvedAt: z.iso.datetime().optional(),
    }),
  })
  .superRefine((map, ctx) => {
    const ids = new Set(map.nodes.map((n) => n.id));
    if (ids.size !== map.nodes.length)
      ctx.addIssue({
        code: "custom",
        message: "Elementos com identificadores repetidos.",
      });
    if (new Set(map.edges.map((e) => e.id)).size !== map.edges.length)
      ctx.addIssue({
        code: "custom",
        message: "Conexões com identificadores repetidos.",
      });
    const signatures = new Set<string>();
    for (const edge of map.edges) {
      const key = `${edge.from}:${edge.to}:${edge.relation}`;
      if (
        !ids.has(edge.from) ||
        !ids.has(edge.to) ||
        edge.from === edge.to ||
        signatures.has(key)
      )
        ctx.addIssue({
          code: "custom",
          message: "Conexão sem origem/destino válido ou repetida.",
        });
      signatures.add(key);
      const from = map.nodes.find((n) => n.id === edge.from),
        to = map.nodes.find((n) => n.id === edge.to);
      if (from && to && !validRelation(from.type, to.type, edge.relation))
        ctx.addIssue({
          code: "custom",
          message: "O tipo de conexão não corresponde aos elementos.",
        });
    }
  });
export const visualMapSchema = z
  .object({
    schemaVersion: z.literal(1),
    id,
    revisions: z.array(mapRevisionSchema).min(1).max(100),
  })
  .superRefine((m, ctx) => {
    if (
      m.revisions.some(
        (r, i) => i > 0 && r.version <= m.revisions[i - 1].version,
      )
    )
      ctx.addIssue({
        code: "custom",
        message: "Versões precisam ser crescentes.",
      });
  });
export type NodeKind = (typeof nodeKinds)[number];
export type RelationKind = (typeof relationKinds)[number];
export type MapNode = z.infer<typeof mapNodeSchema>;
export type MapEdge = z.infer<typeof mapEdgeSchema>;
export type MapRevision = z.infer<typeof mapRevisionSchema>;
export type VisualMap = z.infer<typeof visualMapSchema>;
export function validRelation(
  from: NodeKind,
  to: NodeKind,
  relation: RelationKind,
) {
  const dependencies: NodeKind[] = [
    "knowledge",
    "skill",
    "decision",
    "prerequisite",
  ];
  switch (relation) {
    case "supports":
      return dependencies.includes(from) && to === "competency";
    case "requires":
      return from === "competency" && dependencies.includes(to);
    case "demonstrates":
      return from === "competency" && to === "evidence";
    case "assesses":
      return from === "evidence" && to === "criterion";
    case "addresses":
      return (
        from === "competency" && ["barrier", "gap", "assumption"].includes(to)
      );
    case "leads_to":
      return true;
  }
}
