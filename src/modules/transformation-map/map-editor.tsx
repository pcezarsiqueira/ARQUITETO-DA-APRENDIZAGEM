"use client";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  GitBranch,
  Grip,
  Maximize2,
  Plus,
  Save,
  Target,
} from "lucide-react";
import type { Project } from "@/domain/models";
import {
  approvedDiagnosis,
  arrangeMap,
  connectMap,
  createMap,
  mapFindings,
  mapIsStale,
  newMapNode,
  rebaseMap,
  restoreMapRevision,
  saveMapRevision,
} from "@/domain/map-operations";
import {
  nodeKinds,
  nodeLabels,
  relationKinds,
  relationLabels,
  validRelation,
  type MapNode,
  type MapRevision,
  type NodeKind,
  type RelationKind,
  type VisualMap,
} from "@/domain/visual-map";
function explainMapError(error: unknown, fallback: string) {
  return error instanceof Error && error.name !== "ZodError"
    ? error.message
    : fallback;
}
const field =
  "mt-1 block w-full rounded-lg border border-stone-300 bg-white p-2.5 text-sm";
const button =
  "rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40";
const natureLabels: Record<MapNode["nature"], string> = {
  reported: "Informado pelo especialista",
  hypothesis: "Hipótese — não comprovada",
  unverified: "Ainda não verificado",
  human_decision: "Decisão de planejamento",
};
const colors: Record<NodeKind, string> = {
  current_state: "#e8eeeb",
  desired_state: "#d6ede3",
  knowledge: "#e6eff9",
  skill: "#e6eff9",
  decision: "#e6eff9",
  prerequisite: "#e6eff9",
  barrier: "#fff0d5",
  gap: "#fff0d5",
  assumption: "#fff0d5",
  competency: "#d6ede3",
  evidence: "#ece8f5",
  criterion: "#f4e8e4",
};
export function MapEditor({
  project,
  onSave,
  onDirtyChange,
}: {
  project: Project;
  onSave: (map: VisualMap) => boolean;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const [draft, setDraft] = useState<MapRevision | undefined>(() =>
    project.visualMap
      ? structuredClone(project.visualMap.revisions.at(-1))
      : undefined,
  );
  const [dirty, setDirty] = useState(false),
    [selected, setSelected] = useState<string | null>(null),
    [mode, setMode] = useState<"auto" | "canvas" | "list">("auto");
  const [newType, setNewType] = useState<NodeKind>("knowledge"),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [relation, setRelation] = useState<RelationKind>("supports"),
    [edgeNote, setEdgeNote] = useState("");
  const [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [originNote, setOriginNote] = useState(""),
    [restoreVersion, setRestoreVersion] = useState("");
  const scroll = useRef<HTMLDivElement>(null);
  const inspectorRef = useRef<HTMLElement>(null);
  function selectNode(id: string) {
    setSelected(id);
    if (window.matchMedia("(max-width:1279px)").matches)
      requestAnimationFrame(() => {
        inspectorRef.current?.focus({ preventScroll: true });
        inspectorRef.current?.scrollIntoView({ block: "start" });
      });
  }
  const drag = useRef<{
    id: string;
    pointer: number;
    startX: number;
    startY: number;
    x: number;
    y: number;
  } | null>(null);
  const findings = draft ? mapFindings(draft) : undefined,
    stale = draft ? mapIsStale(draft, project) : false;
  const node = draft?.nodes.find((n) => n.id === selected);
  useEffect(() => {
    onDirtyChange(dirty);
    return () => onDirtyChange(false);
  }, [dirty, onDirtyChange]);
  useEffect(() => {
    if (!dirty) return;
    const protect = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, [dirty]);
  const viewX = draft?.view.scrollX,
    viewY = draft?.view.scrollY,
    savedVersion = draft?.version;
  useEffect(() => {
    if (scroll.current && viewX !== undefined && viewY !== undefined) {
      scroll.current.scrollLeft = viewX;
      scroll.current.scrollTop = viewY;
    }
  }, [savedVersion, viewX, viewY, mode]);
  function edit(next: MapRevision) {
    setDraft({
      ...next,
      approval: { status: "draft", note: next.approval.note },
    });
    setDirty(true);
    setMessage("");
    setError("");
  }
  function updateNode(patch: Partial<MapNode>) {
    if (!draft || !node) return;
    edit({
      ...draft,
      nodes: draft.nodes.map((n) =>
        n.id === node.id
          ? {
              ...n,
              ...patch,
              modifiedByHuman: true,
              review: { ...n.review, accepted: false },
            }
          : n,
      ),
    });
  }
  function move(id: string, x: number, y: number) {
    if (!draft) return;
    edit({
      ...draft,
      nodes: draft.nodes.map((n) =>
        n.id === id
          ? {
              ...n,
              x: Math.min(4000, Math.max(0, Math.round(x))),
              y: Math.min(50000, Math.max(0, Math.round(y))),
            }
          : n,
      ),
    });
  }
  function startDrag(e: PointerEvent<HTMLButtonElement>, n: MapNode) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      id: n.id,
      pointer: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      x: n.x,
      y: n.y,
    };
    setSelected(n.id);
  }
  function moveDrag(e: PointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d || !draft || d.pointer !== e.pointerId) return;
    move(
      d.id,
      d.x + (e.clientX - d.startX) / draft.view.zoom,
      d.y + (e.clientY - d.startY) / draft.view.zoom,
    );
  }
  function start(kind: "diagnosis" | "legacy_map" | "blank") {
    if (
      draft &&
      !confirm(
        "Criar outra proposta inicial? Salve o mapa atual antes se deseja preservar as alterações. As versões já salvas serão mantidas.",
      )
    )
      return;
    try {
      const next = createMap(project, kind, new Date().toISOString());
      edit(next);
      setSelected(
        next.nodes.find((n) => n.type === "competency")?.id ??
          next.nodes[0]?.id ??
          null,
      );
    } catch (e) {
      setError(
        explainMapError(
          e,
          "Não foi possível preparar este mapa dentro dos limites. O registro anterior foi preservado.",
        ),
      );
    }
  }
  function save(approve = false) {
    if (!draft) return;
    try {
      const map = saveMapRevision(
        project,
        {
          ...draft,
          view: {
            ...draft.view,
            scrollX: scroll.current?.clientWidth
              ? scroll.current.scrollLeft
              : draft.view.scrollX,
            scrollY: scroll.current?.clientWidth
              ? scroll.current.scrollTop
              : draft.view.scrollY,
          },
        },
        new Date().toISOString(),
        approve,
      );
      if (!onSave(map)) {
        setError(
          "Não foi possível salvar. Sua edição continua aberta; confira o aviso de armazenamento ou conflito de abas.",
        );
        return;
      }
      setDraft(structuredClone(map.revisions.at(-1)));
      setDirty(false);
      setError("");
      setMessage(
        approve
          ? "Mapa aprovado e salvo, com revisão humana."
          : "Nova versão do mapa salva neste navegador.",
      );
    } catch (e) {
      setError(
        explainMapError(
          e,
          "Confira o tamanho e a estrutura dos elementos. Sua edição foi preservada.",
        ),
      );
    }
  }
  const width = Math.max(1510, ...(draft?.nodes.map((n) => n.x + 285) ?? [])),
    height = Math.max(720, ...(draft?.nodes.map((n) => n.y + 215) ?? []));
  return (
    <section
      id="mapa-transformacao"
      aria-label="Editor do mapa de transformação"
      className="mt-8 min-w-0 scroll-mt-4 overflow-hidden rounded-2xl border border-teal-200 bg-white shadow-sm"
    >
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-stone-200 bg-[#edf5ef] p-5 md:p-6">
        <div>
          <p className="mb-2 text-[10px] font-bold tracking-[.2em] text-teal-800">
            ETAPA 03 · DESENHAR A TRANSFORMAÇÃO
          </p>
          <h2 className="flex items-center gap-2 text-2xl font-semibold">
            <GitBranch size={24} />
            Mapa de Transformação
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
            Do que o aprendiz já traz ao que precisa demonstrar. Conecte os
            passos, confira as hipóteses e mantenha suas decisões visíveis.
          </p>
        </div>
        <span className="rounded-full border border-teal-200 bg-white px-3 py-1 text-xs text-teal-900">
          {!draft
            ? "Comece uma proposta"
            : dirty
              ? "Alterações não salvas"
              : stale
                ? "Origem mudou · revisar"
                : draft.approval.status === "approved"
                  ? `Versão ${draft.version} · aprovada`
                  : `Versão ${draft.version} · em revisão`}
        </span>
      </header>
      <div className="space-y-4 p-4 md:p-5">
        {!draft && (
          <div className="rounded-xl border border-dashed border-teal-300 bg-teal-50/50 p-6">
            <Target className="text-teal-800" />
            <h3 className="mt-3 text-lg font-semibold">
              O mapa começa com uma transformação, não com um formato.
            </h3>
            <p className="mt-2 text-sm leading-6">
              Use o diagnóstico aprovado ou comece manualmente. Nada é enviado à
              IA. O exemplo editorial também pode ser adaptado como rascunho,
              sem alterar o original.
            </p>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={button}
            disabled={!approvedDiagnosis(project)}
            onClick={() => start("diagnosis")}
          >
            Construir do diagnóstico aprovado
          </button>
          <button
            type="button"
            className={button}
            onClick={() => start("blank")}
          >
            Começar mapa em branco
          </button>
          {!!project.maps.length && (
            <button
              type="button"
              className={button}
              onClick={() => start("legacy_map")}
            >
              Adaptar mapa editorial existente
            </button>
          )}
        </div>
        {!approvedDiagnosis(project) && (
          <p className="text-xs text-stone-500">
            Para usar o diagnóstico como origem, revise e aprove a versão atual.
            O caminho manual continua disponível.
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="rounded-lg bg-red-50 p-3 text-sm text-red-800"
          >
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="text-sm text-teal-800">
            {message}
          </p>
        )}
        {draft && (
          <>
            {stale && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
                <strong>
                  O diagnóstico ou a descoberta mudou. Seu mapa foi preservado.
                </strong>
                <p className="mt-2">
                  Compare as informações, ajuste o que fizer sentido e registre
                  a revisão da origem. Não atualizamos seus elementos
                  automaticamente.
                </p>
                <details className="mt-2">
                  <summary>Comparar origem com as informações atuais</summary>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div>
                      <strong>Origem preservada</strong>
                      <pre className="max-h-56 overflow-auto whitespace-pre-wrap text-xs">
                        {draft.source.record}
                      </pre>
                    </div>
                    <div>
                      <strong>Objetivo atual</strong>
                      <p>{project.discovery.teach}</p>
                      <strong>Diagnóstico atual</strong>
                      <p>
                        {project.diagnosis?.pedagogy?.rationale ??
                          project.diagnosis?.rationale ??
                          "Ainda não informado."}
                      </p>
                    </div>
                  </div>
                </details>
                <label className="mt-3 block">
                  Como conferi as mudanças na origem
                  <textarea
                    className={field}
                    maxLength={2000}
                    value={originNote}
                    onChange={(e) => setOriginNote(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className={button + " mt-2"}
                  onClick={() => {
                    try {
                      edit(rebaseMap(draft, project, originNote));
                      setOriginNote("");
                    } catch (e) {
                      setError(
                        e instanceof Error ? e.message : "Confira a revisão.",
                      );
                    }
                  }}
                >
                  Confirmar revisão da origem sem substituir elementos
                </button>
              </div>
            )}
            <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl bg-stone-50 p-3">
              <div className="flex flex-wrap items-end gap-2">
                <label className="text-xs">
                  Adicionar ao mapa
                  <select
                    className={field}
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as NodeKind)}
                  >
                    {nodeKinds.map((k) => (
                      <option key={k} value={k}>
                        {nodeLabels[k]}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className={button + " flex items-center gap-1"}
                  disabled={draft.nodes.length >= 200}
                  onClick={() => {
                    const n = newMapNode(
                      newType,
                      crypto.randomUUID(),
                      draft.nodes.length,
                    );
                    edit({ ...draft, nodes: [...draft.nodes, n] });
                    selectNode(n.id);
                  }}
                >
                  <Plus size={15} />
                  Adicionar elemento
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={button}
                  aria-pressed={mode === "canvas"}
                  onClick={() => setMode("canvas")}
                >
                  Visão espacial
                </button>
                <button
                  type="button"
                  className={button}
                  aria-pressed={mode === "list"}
                  onClick={() => setMode("list")}
                >
                  Lista acessível
                </button>
                <button
                  type="button"
                  className={button + " flex items-center gap-1"}
                  onClick={() => edit(arrangeMap(draft))}
                >
                  <Maximize2 size={14} />
                  Organizar por etapas
                </button>
              </div>
            </div>
            <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
              <div className="min-w-0">
                <div
                  className={
                    mode === "auto"
                      ? "hidden md:block"
                      : mode === "canvas"
                        ? "block"
                        : "hidden"
                  }
                >
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
                    <span>
                      Arraste pela alça ou use as setas do teclado. Role para
                      explorar.
                    </span>
                    <label>
                      Zoom{" "}
                      <select
                        aria-label="Zoom do mapa"
                        className="rounded border border-stone-300 bg-white p-1"
                        value={draft.view.zoom}
                        onChange={(e) =>
                          edit({
                            ...draft,
                            view: {
                              ...draft.view,
                              zoom: Number(e.target.value),
                            },
                          })
                        }
                      >
                        {[0.4, 0.5, 0.6, 0.75, 1, 1.25, 1.5].map((v) => (
                          <option key={v} value={v}>
                            {Math.round(v * 100)}%
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div
                    ref={scroll}
                    tabIndex={0}
                    aria-label="Área espacial do mapa; use rolagem para navegar"
                    className="h-[570px] max-w-full overflow-auto rounded-xl border border-stone-200 bg-[#f7f9f5]"
                    style={{
                      backgroundImage:
                        "radial-gradient(#cddbd2 1px, transparent 1px)",
                      backgroundSize: "18px 18px",
                    }}
                  >
                    <div
                      style={{
                        width: width * draft.view.zoom,
                        height: height * draft.view.zoom,
                        position: "relative",
                      }}
                    >
                      <div
                        style={{
                          width,
                          height,
                          transform: `scale(${draft.view.zoom})`,
                          transformOrigin: "top left",
                          position: "relative",
                        }}
                      >
                        <div
                          className="absolute top-3 left-8 flex gap-4 text-[11px] font-bold tracking-widest text-stone-500"
                          aria-hidden="true"
                        >
                          {[
                            "PONTO DE PARTIDA",
                            "BASES E PRÁTICA",
                            "COMPETÊNCIAS",
                            "EVIDÊNCIAS",
                            "CHEGADA E CRITÉRIOS",
                          ].map((t) => (
                            <span key={t} style={{ width: 274 }}>
                              {t}
                            </span>
                          ))}
                        </div>
                        <svg
                          width={width}
                          height={height}
                          className="pointer-events-none absolute inset-0"
                          aria-hidden="true"
                        >
                          <defs>
                            <marker
                              id={`map-arrow-${project.id}`}
                              markerWidth="9"
                              markerHeight="9"
                              refX="8"
                              refY="4"
                              orient="auto"
                            >
                              <path d="M 0 0 L 8 4 L 0 8" fill="#719589" />
                            </marker>
                          </defs>
                          {draft.edges.map((e) => {
                            const a = draft.nodes.find((n) => n.id === e.from)!,
                              b = draft.nodes.find((n) => n.id === e.to)!;
                            const ax = a.x + 250,
                              ay = a.y + 85,
                              bx = b.x,
                              by = b.y + 85;
                            const bend = Math.max(70, Math.abs(bx - ax) * 0.5);
                            return (
                              <g key={e.id}>
                                <path
                                  d={`M${ax},${ay} C${ax + bend},${ay} ${bx - bend},${by} ${bx},${by}`}
                                  fill="none"
                                  stroke={
                                    selected === a.id || selected === b.id
                                      ? "#166654"
                                      : "#a2b6ab"
                                  }
                                  strokeWidth="2"
                                  markerEnd={`url(#map-arrow-${project.id})`}
                                />
                              </g>
                            );
                          })}
                        </svg>
                        {draft.nodes.map((n) => (
                          <article
                            key={n.id}
                            style={{
                              left: n.x,
                              top: n.y,
                              width: 250,
                              height: 185,
                              borderColor:
                                selected === n.id ? "#166654" : "#d7e0d8",
                            }}
                            className="absolute overflow-hidden rounded-xl border-2 bg-white shadow-sm"
                          >
                            <div
                              style={{ background: colors[n.type] }}
                              className="flex items-center justify-between px-3 py-2"
                            >
                              <span className="text-xs font-semibold">
                                {nodeLabels[n.type]}
                              </span>
                              <button
                                type="button"
                                aria-label={`Mover ${n.title || nodeLabels[n.type]}`}
                                className="rounded p-1"
                                style={{ touchAction: "none" }}
                                onPointerDown={(e) => startDrag(e, n)}
                                onPointerMove={moveDrag}
                                onPointerUp={() => {
                                  drag.current = null;
                                }}
                                onPointerCancel={() => {
                                  drag.current = null;
                                }}
                                onKeyDown={(e) => {
                                  const shift = e.shiftKey ? 50 : 15;
                                  const delta: Record<
                                    string,
                                    [number, number]
                                  > = {
                                    ArrowLeft: [-shift, 0],
                                    ArrowRight: [shift, 0],
                                    ArrowUp: [0, -shift],
                                    ArrowDown: [0, shift],
                                  };
                                  if (delta[e.key]) {
                                    e.preventDefault();
                                    move(
                                      n.id,
                                      n.x + delta[e.key][0],
                                      n.y + delta[e.key][1],
                                    );
                                  }
                                }}
                              >
                                <Grip size={15} />
                              </button>
                            </div>
                            <button
                              type="button"
                              aria-pressed={selected === n.id}
                              onClick={() => selectNode(n.id)}
                              className="block w-full px-3 pt-3 text-left"
                            >
                              <span className="line-clamp-3 text-sm font-semibold leading-5">
                                {n.title ||
                                  "Novo elemento — clique para editar"}
                              </span>
                              <span className="mt-2 block truncate text-[10px] text-stone-500">
                                {natureLabels[n.nature]}
                              </span>
                              <span
                                className={
                                  "mt-2 inline-flex items-center gap-1 text-[10px] " +
                                  (n.review.accepted
                                    ? "text-teal-800"
                                    : "text-amber-800")
                                }
                              >
                                {n.review.accepted ? <Check size={12} /> : null}
                                {n.review.accepted
                                  ? "Revisado pelo especialista"
                                  : "Aguardando revisão"}
                              </span>
                            </button>
                          </article>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  className={
                    mode === "auto"
                      ? "block md:hidden"
                      : mode === "list"
                        ? "block"
                        : "hidden"
                  }
                >
                  <p className="mb-3 text-xs text-stone-500">
                    A mesma estrutura em lista. Selecione um elemento para
                    editar; conexões e posições permanecem preservadas.
                  </p>
                  <div className="grid max-h-[570px] gap-2 overflow-y-auto rounded-xl border border-stone-200 bg-stone-50 p-3 sm:grid-cols-2">
                    {draft.nodes.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => selectNode(n.id)}
                        aria-pressed={selected === n.id}
                        className="rounded-xl border border-stone-200 bg-white p-3 text-left"
                      >
                        <span
                          className="inline-block rounded px-2 py-1 text-[10px] font-semibold"
                          style={{ background: colors[n.type] }}
                        >
                          {nodeLabels[n.type]}
                        </span>
                        <strong className="mt-2 block text-sm">
                          {n.title || "Novo elemento"}
                        </strong>
                        <span className="mt-2 block text-[11px] text-stone-500">
                          {natureLabels[n.nature]} ·{" "}
                          {n.review.accepted ? "Revisado" : "Revisar"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                {!draft.nodes.length && (
                  <p className="mt-3 rounded-lg bg-teal-50 p-5 text-sm">
                    Adicione o estado atual e o desejado. Depois descreva o que
                    o aprendiz deve demonstrar e como você verificará.
                  </p>
                )}
              </div>
              <aside
                ref={inspectorRef}
                tabIndex={-1}
                aria-label="Editar elemento do mapa"
                className="min-w-0 rounded-xl border border-stone-200 bg-stone-50 p-4"
              >
                {node ? (
                  <>
                    <p className="text-[10px] font-bold tracking-widest text-teal-800">
                      SEU OLHAR DE ESPECIALISTA
                    </p>
                    <h3 className="mt-2 text-lg font-semibold">
                      Editar elemento
                    </h3>
                    <label className="mt-3 block text-xs">
                      Tipo de elemento
                      <select
                        className={field}
                        value={node.type}
                        onChange={(e) => {
                          const type = e.target.value as NodeKind;
                          const nextNodes = draft.nodes.map((n) =>
                            n.id === node.id
                              ? {
                                  ...n,
                                  type,
                                  modifiedByHuman: true,
                                  review: { ...n.review, accepted: false },
                                }
                              : n,
                          );
                          const invalid = draft.edges.some((edge) => {
                            const a = nextNodes.find(
                                (n) => n.id === edge.from,
                              )!,
                              b = nextNodes.find((n) => n.id === edge.to)!;
                            return !validRelation(
                              a.type,
                              b.type,
                              edge.relation,
                            );
                          });
                          if (invalid) {
                            setError(
                              "Desconecte primeiro as relações incompatíveis antes de mudar o tipo deste elemento.",
                            );
                            return;
                          }
                          updateNode({ type });
                        }}
                      >
                        {nodeKinds.map((k) => (
                          <option key={k} value={k}>
                            {nodeLabels[k]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="mt-3 block text-xs">
                      Conteúdo do elemento
                      <textarea
                        rows={4}
                        maxLength={20000}
                        className={field}
                        value={node.title}
                        onChange={(e) => updateNode({ title: e.target.value })}
                      />
                    </label>
                    <label className="mt-3 block text-xs">
                      Explicação ou pergunta de investigação
                      <textarea
                        rows={3}
                        maxLength={20000}
                        className={field}
                        value={node.description}
                        onChange={(e) =>
                          updateNode({ description: e.target.value })
                        }
                      />
                    </label>
                    <p className="mt-3 rounded bg-white p-2 text-xs leading-5">
                      <strong>{natureLabels[node.nature]}</strong>
                      <br />
                      Origem:{" "}
                      {node.source.kind === "diagnosis"
                        ? "Diagnóstico"
                        : node.source.kind === "legacy_map"
                          ? "Mapa editorial anterior"
                          : node.source.kind === "discovery"
                            ? "Descoberta"
                            : "Autoria manual"}
                      .{" "}
                      {node.modifiedByHuman
                        ? "Texto modificado pelo especialista."
                        : "Texto importado sem alteração."}
                    </p>
                    <details className="mt-2 text-xs">
                      <summary>Ver trecho original e referência</summary>
                      <p className="mt-2 whitespace-pre-wrap">
                        {node.source.quote || "Elemento criado manualmente."}
                      </p>
                      <p className="mt-2 break-words text-stone-500">
                        {node.source.path}
                      </p>
                      <p>
                        Natureza na origem:{" "}
                        {natureLabels[node.source.natureAtImport]}
                      </p>
                    </details>
                    <label className="mt-3 block text-xs">
                      Como tratar esta informação
                      <select
                        className={field}
                        value={node.nature}
                        onChange={(e) =>
                          updateNode({
                            nature: e.target.value as MapNode["nature"],
                          })
                        }
                      >
                        {Object.entries(natureLabels).map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </label>
                    {node.type === "competency" && (
                      <>
                        <label className="mt-3 block text-xs">
                          Condição de desempenho
                          <textarea
                            className={field}
                            rows={2}
                            maxLength={20000}
                            value={node.condition}
                            onChange={(e) =>
                              updateNode({ condition: e.target.value })
                            }
                          />
                        </label>
                        <label className="mt-3 block text-xs">
                          Se não houver dependência adicional, por quê?
                          <textarea
                            className={field}
                            rows={2}
                            maxLength={2000}
                            value={node.dependencyJustification}
                            onChange={(e) =>
                              updateNode({
                                dependencyJustification: e.target.value,
                              })
                            }
                          />
                        </label>
                      </>
                    )}
                    <label className="mt-3 block text-xs">
                      Nota da revisão deste elemento
                      <textarea
                        className={field}
                        rows={2}
                        maxLength={2000}
                        value={node.review.note}
                        onChange={(e) =>
                          updateNode({
                            review: { accepted: false, note: e.target.value },
                          })
                        }
                      />
                    </label>
                    <label className="mt-3 flex items-start gap-2 text-xs leading-5">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={node.review.accepted}
                        onChange={(e) =>
                          edit({
                            ...draft,
                            nodes: draft.nodes.map((n) =>
                              n.id === node.id
                                ? {
                                    ...n,
                                    review: {
                                      ...n.review,
                                      accepted: e.target.checked,
                                    },
                                  }
                                : n,
                            ),
                          })
                        }
                      />
                      Revisei este elemento. Aceitá-lo no planejamento não
                      comprova uma hipótese.
                    </label>
                    <div
                      className="mt-4 flex gap-1"
                      aria-label="Reorganizar elemento"
                    >
                      {[
                        ["Esquerda", ArrowLeft, -30, 0],
                        ["Acima", ArrowUp, 0, -30],
                        ["Abaixo", ArrowDown, 0, 30],
                        ["Direita", ArrowRight, 30, 0],
                      ].map(([label, Icon, dx, dy]) => {
                        const Direction = Icon as typeof ArrowLeft;
                        return (
                          <button
                            key={String(label)}
                            type="button"
                            aria-label={`Mover elemento: ${label}`}
                            className={button}
                            onClick={() =>
                              move(
                                node.id,
                                node.x + Number(dx),
                                node.y + Number(dy),
                              )
                            }
                          >
                            <Direction size={15} />
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      className="mt-4 text-xs font-semibold text-red-800"
                      onClick={() => {
                        if (
                          !confirm(
                            "Remover este elemento e suas conexões da proposta? As versões salvas continuam no histórico.",
                          )
                        )
                          return;
                        edit({
                          ...draft,
                          nodes: draft.nodes.filter((n) => n.id !== node.id),
                          edges: draft.edges.filter(
                            (e) => e.from !== node.id && e.to !== node.id,
                          ),
                        });
                        setSelected(null);
                      }}
                    >
                      Remover elemento e suas conexões
                    </button>
                  </>
                ) : (
                  <>
                    <h3 className="font-semibold">Selecione um elemento</h3>
                    <p className="mt-3 text-sm leading-6">
                      Edite o texto, consulte a origem, registre dúvidas e
                      confirme sua revisão. Você pode usar a visão espacial ou a
                      lista.
                    </p>
                  </>
                )}
              </aside>
            </div>
            <details className="rounded-xl border border-stone-200 p-4" open>
              <summary className="cursor-pointer font-semibold">
                Conexões e rastreabilidade ({draft.edges.length})
              </summary>
              <p className="mt-2 text-sm leading-6 text-stone-500">
                Uma competência é demonstrada por uma evidência, avaliada por um
                critério. Conhecimentos e habilidades podem contribuir para ela;
                se não forem necessários, justifique no elemento em vez de criar
                ligações artificiais.
              </p>
              <div className="mt-4 grid items-end gap-3 md:grid-cols-3">
                <label className="text-xs">
                  Elemento de origem
                  <select
                    className={field}
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                  >
                    <option value="">Selecione</option>
                    {draft.nodes.map((n) => (
                      <option key={n.id} value={n.id}>
                        {nodeLabels[n.type]}: {n.title || "Sem nome"}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs">
                  Tipo de conexão
                  <select
                    className={field}
                    value={relation}
                    onChange={(e) =>
                      setRelation(e.target.value as RelationKind)
                    }
                  >
                    {relationKinds.map((r) => (
                      <option key={r} value={r}>
                        {relationLabels[r]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs">
                  Elemento de destino
                  <select
                    className={field}
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                  >
                    <option value="">Selecione</option>
                    {draft.nodes
                      .filter((n) => n.id !== from)
                      .map((n) => (
                        <option key={n.id} value={n.id}>
                          {nodeLabels[n.type]}: {n.title || "Sem nome"}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
              <label className="mt-3 block text-xs">
                Por que estes elementos estão relacionados?
                <input
                  className={field}
                  maxLength={2000}
                  value={edgeNote}
                  onChange={(e) => setEdgeNote(e.target.value)}
                />
              </label>
              <button
                type="button"
                className={button + " mt-3"}
                disabled={!from || !to || draft.edges.length >= 600}
                onClick={() => {
                  try {
                    edit(
                      connectMap(
                        draft,
                        from,
                        to,
                        relation,
                        crypto.randomUUID(),
                        edgeNote,
                      ),
                    );
                    setEdgeNote("");
                  } catch (e) {
                    setError(
                      e instanceof Error ? e.message : "Confira a conexão.",
                    );
                  }
                }}
              >
                Conectar elementos
              </button>
              <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto">
                {draft.edges.map((e) => (
                  <li
                    key={e.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-stone-50 p-3 text-xs"
                  >
                    <span>
                      <strong>
                        {draft.nodes.find((n) => n.id === e.from)?.title}
                      </strong>{" "}
                      · {relationLabels[e.relation].toLowerCase()} ·{" "}
                      <strong>
                        {draft.nodes.find((n) => n.id === e.to)?.title}
                      </strong>
                      {e.note && (
                        <span className="mt-1 block text-stone-500">
                          {e.note}
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      aria-label={`Desconectar ${e.id}`}
                      className="font-semibold text-red-800"
                      onClick={() =>
                        edit({
                          ...draft,
                          edges: draft.edges.filter((v) => v.id !== e.id),
                        })
                      }
                    >
                      Desconectar
                    </button>
                  </li>
                ))}
              </ul>
            </details>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl bg-amber-50 p-4">
                <h3 className="font-semibold">
                  Conferência antes da aprovação
                </h3>
                <p className="mt-2 text-xs leading-5">
                  {findings?.blocking.length
                    ? `${findings.blocking.length} pontos precisam de revisão.`
                    : "Estrutura conferida. Você ainda precisa avaliar a coerência pedagógica."}{" "}
                  Não há pontuação de aprendizagem.
                </p>
                <details
                  className="mt-3 text-xs"
                  open={!!findings?.blocking.length}
                >
                  <summary>Ver pontos de revisão</summary>
                  <ul className="mt-2 list-disc space-y-1 pl-4">
                    {findings?.blocking.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                    {findings?.warnings.map((f) => (
                      <li key={f} className="text-stone-500">
                        {f}
                      </li>
                    ))}
                  </ul>
                </details>
              </div>
              <div className="rounded-xl border border-stone-200 p-4">
                <label className="block text-sm font-semibold">
                  O que mudou nesta versão?
                  <input
                    className={field}
                    value={draft.summary}
                    maxLength={2000}
                    onChange={(e) =>
                      edit({ ...draft, summary: e.target.value })
                    }
                  />
                </label>
                <label className="mt-3 block text-sm font-semibold">
                  Justificativa da aprovação do mapa
                  <textarea
                    className={field}
                    rows={3}
                    maxLength={2000}
                    value={draft.approval.note}
                    onChange={(e) =>
                      edit({
                        ...draft,
                        approval: { status: "draft", note: e.target.value },
                      })
                    }
                  />
                </label>
                <p className="mt-2 text-xs leading-5 text-stone-500">
                  Aprovar registra sua revisão do planejamento. Não comprova
                  aprendizagem nem transforma hipóteses em fatos.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="flex items-center gap-2 rounded-lg bg-teal-800 px-4 py-3 text-sm font-semibold text-white"
                onClick={() => save()}
              >
                <Save size={16} />
                Salvar versão do mapa
              </button>
              <button
                type="button"
                className={button + " py-3"}
                disabled={
                  stale ||
                  !!findings?.blocking.length ||
                  draft.approval.note.trim().length < 15
                }
                onClick={() => save(true)}
              >
                Aprovar mapa e salvar versão
              </button>
              <span className="text-xs text-stone-500">
                Salvo apenas neste navegador. Versões anteriores são
                preservadas.
              </span>
            </div>
          </>
        )}
        {!!project.visualMap?.revisions.length && (
          <details className="rounded-xl border border-stone-200 p-4">
            <summary className="cursor-pointer font-semibold">
              Histórico de versões do mapa ({project.visualMap.revisions.length}
              )
            </summary>
            <ul className="my-3 space-y-2 text-sm">
              {project.visualMap.revisions.map((r) => (
                <li key={r.version}>
                  <strong>v{r.version}</strong> ·{" "}
                  {r.approval.status === "approved" ? "aprovada" : "rascunho"} ·{" "}
                  {r.summary || "Sem descrição"} · {r.nodes.length} elementos
                </li>
              ))}
            </ul>
            <label className="block text-xs">
              Versão a restaurar como nova proposta
              <select
                className={field}
                value={restoreVersion}
                onChange={(e) => setRestoreVersion(e.target.value)}
              >
                <option value="">Selecione</option>
                {project.visualMap.revisions.map((r) => (
                  <option key={r.version} value={r.version}>
                    Versão {r.version}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className={button + " mt-3"}
              disabled={!restoreVersion}
              onClick={() => {
                if (
                  dirty &&
                  !confirm(
                    "Restaurar a versão salva e descartar as alterações ainda não salvas?",
                  )
                )
                  return;
                try {
                  const map = restoreMapRevision(
                    project,
                    Number(restoreVersion),
                    new Date().toISOString(),
                  );
                  if (onSave(map)) {
                    setDraft(structuredClone(map.revisions.at(-1)));
                    setDirty(false);
                    setSelected(null);
                    setMessage(
                      "Versão restaurada como novo rascunho. O histórico foi preservado.",
                    );
                  }
                } catch (e) {
                  setError(
                    e instanceof Error
                      ? e.message
                      : "Não foi possível restaurar.",
                  );
                }
              }}
            >
              Restaurar como nova versão
            </button>
          </details>
        )}
        <p className="border-t border-stone-100 pt-4 text-xs leading-6 text-stone-500">
          Um mapa central, várias possibilidades futuras: plano de aula,
          storyboard, exercícios, avaliações, simulações e trilhas. Os geradores
          não fazem parte desta etapa.
        </p>
      </div>
    </section>
  );
}
