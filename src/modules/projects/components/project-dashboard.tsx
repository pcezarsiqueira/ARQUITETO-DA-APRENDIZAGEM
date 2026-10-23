"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Compass,
  Copy,
  Download,
  LayoutDashboard,
  Plus,
  Sparkles,
  Target,
  Trash2,
  X,
} from "lucide-react";
import { MapEditor } from "@/modules/transformation-map/map-editor";
import { DiagnosisPanel } from "@/modules/diagnosis/components/diagnosis-panel";
import { Brand } from "@/shared/components/brand";
import {
  discoverySchema,
  emptyDiscovery,
  type Discovery,
  type Project,
} from "@/domain/models";
import {
  createProject,
  duplicateProject,
  updateProjectDiscovery,
} from "@/domain/projects";
import { exampleProject } from "@/domain/example";
import {
  loadProjectSnapshot,
  saveProjects,
  StorageConflictError,
} from "@/persistence/projects";

const fields: { key: keyof Discovery; label: string; hint: string }[] = [
  {
    key: "subject",
    label: "Qual conhecimento você quer transformar em aprendizagem?",
    hint: "Ex.: Feedback construtivo para novos gestores",
  },
  {
    key: "teach",
    label: "O que o aprendiz precisa conseguir fazer, compreender ou decidir?",
    hint: "Descreva uma mudança observável",
  },
  {
    key: "audience",
    label: "Quem vai aprender?",
    hint: "Função, contexto e necessidades",
  },
  {
    key: "priorKnowledge",
    label: "O que esse público já sabe?",
    hint: "Conhecimentos e experiências anteriores",
  },
  {
    key: "difficulties",
    label: "Quais dificuldades você observa?",
    hint: "Erros recorrentes, dúvidas e obstáculos",
  },
  {
    key: "experiences",
    label: "Que histórias ou exemplos você pode compartilhar?",
    hint: "Evite dados pessoais e informações confidenciais",
  },
  {
    key: "modality",
    label: "Já tem uma modalidade em mente?",
    hint: "Presencial, online, híbrido ou ainda não sei",
  },
  {
    key: "constraints",
    label: "Quais são os limites de tempo e recursos?",
    hint: "Duração disponível, ferramentas e contexto",
  },
];
export function ProjectDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Discovery>({ ...emptyDiscovery });
  const [storageBlocked, setStorageBlocked] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const storageRevision = useRef<string | null>(null);
  const diagnosisDirty = useRef(false);
  const mapDirty = useRef(false);
  const onMapDirty = useCallback((dirty: boolean) => {
    mapDirty.current = dirty;
  }, []);
  const onDiagnosisDirty = useCallback((dirty: boolean) => {
    diagnosisDirty.current = dirty;
  }, []);
  function canLeaveDiagnosis() {
    return (
      (!diagnosisDirty.current && !mapDirty.current) ||
      confirm(
        mapDirty.current && diagnosisDirty.current
          ? "Há alterações no mapa e na revisão do diagnóstico ainda não salvas. Deseja sair e descartar ambas?"
          : mapDirty.current
            ? "Há alterações no mapa ainda não salvas. Deseja sair e descartá-las?"
            : "Há uma revisão de diagnóstico não salva. Deseja sair e descartar essas alterações?",
      )
    );
  }
  function selectProject(id: string | null) {
    if (canLeaveDiagnosis()) setSelected(id);
  }

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      try {
        const snapshot = loadProjectSnapshot();
        storageRevision.current = snapshot.revision;
        setProjects(snapshot.projects);
      } catch {
        setStorageBlocked(true);
        setError(
          "Não foi possível ler os dados locais. Não sobrescreva o armazenamento antes de recuperar sua cópia.",
        );
      }
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  const active = projects.find((p) => p.id === selected);
  function persist(next: Project[]) {
    if (storageBlocked) return false;
    try {
      storageRevision.current = saveProjects(next, storageRevision.current);
      setProjects(next);
      setError("");
      return true;
    } catch (error) {
      setError(
        error instanceof StorageConflictError
          ? error.message
          : "Não foi possível salvar no navegador. Verifique o armazenamento disponível.",
      );
      return false;
    }
  }
  function newProject() {
    setEditing(null);
    setDraft({ ...emptyDiscovery });
    setOpen(true);
  }
  function exportData() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(projects, null, 2)], {
        type: "application/json",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "arquiteto-projetos.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="border-r border-stone-200 bg-white px-6 py-8 lg:sticky lg:top-0 lg:h-screen">
        <Brand onBeforeNavigate={canLeaveDiagnosis} />
        <p className="mt-12 mb-4 text-[10px] font-bold tracking-[.2em] text-stone-400">
          SEU ESPAÇO DE CRIAÇÃO
        </p>
        <nav aria-label="Navegação principal" className="space-y-2 text-sm">
          <button
            onClick={() => selectProject(null)}
            className="flex w-full items-center gap-3 rounded-lg bg-teal-50 px-4 py-3 font-semibold text-teal-800"
          >
            <LayoutDashboard size={18} /> Visão geral
          </button>
          <a
            href="#projetos"
            onClick={() => selectProject(null)}
            className="flex items-center gap-3 px-4 py-3 text-stone-600"
          >
            <BookOpen size={18} /> Meus projetos
          </a>
          <a
            href="#jornada"
            onClick={() => selectProject(null)}
            className="flex items-center gap-3 px-4 py-3 text-stone-600"
          >
            <Compass size={18} /> A jornada
          </a>
        </nav>
        <div className="mt-12 rounded-xl border border-stone-200 bg-stone-50 p-4">
          <Target size={24} className="mb-3 text-teal-700" />
          <p className="text-sm font-semibold">Comece pela transformação.</p>
          <p className="mt-2 text-xs leading-5 text-stone-500">
            Antes do material, descubra o que o aprendiz precisa conseguir
            fazer.
          </p>
        </div>
      </aside>
      <main className="mx-auto w-full max-w-[1320px] px-6 py-8 md:px-12">
        <header className="flex items-center justify-between border-b border-stone-200 pb-6">
          <p className="text-xs text-stone-500">
            Seu espaço /{" "}
            <span className="text-teal-900">
              {active ? "Projeto" : "Visão geral"}
            </span>
          </p>
          <span className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-500">
            Validação · dados locais
          </span>
        </header>
        {error && (
          <p
            role="alert"
            className="my-4 rounded-lg bg-amber-50 p-4 text-sm text-amber-900"
          >
            {error}
          </p>
        )}
        {active ? (
          <>
            <button
              onClick={() => selectProject(null)}
              className="mt-6 text-sm text-teal-800"
            >
              ← Voltar aos projetos
            </button>
            <h1 className="mt-5 text-3xl font-semibold">{active.title}</h1>
            <p className="mt-3 text-sm text-stone-500">
              {active.demonstration
                ? active.diagnosis?.source === "ai"
                  ? "Projeto demonstrativo fictício · diagnóstico assistido por IA; mapa e materiais continuam exemplos editoriais."
                  : "Exemplo fictício editorial · não é diagnóstico de IA nem pesquisa com alunos reais."
                : "Descoberta inicial · diagnóstico assistido por IA com revisão humana."}
            </p>
            <button
              onClick={() => {
                if (!canLeaveDiagnosis()) return;
                setDraft({ ...active.discovery });
                setEditing(active.id);
                setOpen(true);
              }}
              className="my-5 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm"
            >
              Editar descoberta
            </button>
            <a
              href="#mapa-transformacao"
              className="ml-3 inline-block text-sm font-semibold text-teal-800"
            >
              Abrir Mapa de Transformação ↓
            </a>
            <section className="grid gap-3 md:grid-cols-2">
              {fields.map((f) => (
                <article
                  key={f.key}
                  className="rounded-xl border border-stone-200 bg-white p-5"
                >
                  <h2 className="text-sm font-semibold">{f.label}</h2>
                  <p className="mt-2 text-sm leading-6 whitespace-pre-wrap text-stone-500">
                    {active.discovery[f.key] || "Ainda não informado"}
                  </p>
                </article>
              ))}
            </section>
            <DiagnosisPanel
              key={`${active.id}:${JSON.stringify(active.discovery)}`}
              project={active}
              onDirtyChange={onDiagnosisDirty}
              onSave={(diagnosis) =>
                persist(
                  projects.map((p) =>
                    p.id === active.id
                      ? {
                          ...p,
                          diagnosis,
                          diagnosisHistory: [
                            ...(p.diagnosisHistory ?? []),
                            ...(p.diagnosis ? [p.diagnosis] : []),
                          ].slice(-10),
                          updatedAt: new Date().toISOString(),
                        }
                      : p,
                  ),
                )
              }
            />
            {active.diagnosis?.source === "demonstration" && (
              <section className="mt-8">
                <h2 className="mb-4 text-xl font-semibold">
                  Diagnóstico demonstrativo
                </h2>
                <div className="grid gap-4 md:grid-cols-3">
                  {[
                    ["Fatos informados", active.diagnosis.facts],
                    ["Hipóteses para revisão", active.diagnosis.inferences],
                    ["Precisa de validação", active.diagnosis.needsValidation],
                  ].map(([title, items]) => (
                    <article
                      key={String(title)}
                      className="rounded-xl border border-stone-200 bg-white p-5"
                    >
                      <h3 className="font-semibold">{title}</h3>
                      <ul className="mt-3 list-disc space-y-2 pl-4 text-sm leading-6 text-stone-600">
                        {(items as string[]).map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
              </section>
            )}
            <MapEditor
              key={`map:${active.id}:${JSON.stringify(active.discovery)}`}
              project={active}
              onDirtyChange={onMapDirty}
              onSave={(visualMap) =>
                persist(
                  projects.map((p) =>
                    p.id === active.id
                      ? { ...p, visualMap, updatedAt: new Date().toISOString() }
                      : p,
                  ),
                )
              }
            />
            {active.maps.map((map) => (
              <section
                key={map.version}
                className="mt-8 rounded-xl bg-teal-50 p-6"
              >
                <h2 className="text-xl font-semibold">
                  Mapa de transformação · v{map.version}
                </h2>
                <p className="mt-2 text-xs text-teal-800">
                  Proposta editorial · aguardando revisão humana
                </p>
                <div className="mt-5 grid gap-5 md:grid-cols-2">
                  <div>
                    <h3 className="font-semibold">Estado atual</h3>
                    <p className="mt-2 text-sm leading-6">{map.currentState}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold">Estado desejado</h3>
                    <p className="mt-2 text-sm leading-6">{map.desiredState}</p>
                  </div>
                </div>
                {map.objectives.map((o) => (
                  <div
                    key={o.id}
                    className="mt-5 rounded-lg bg-white p-4 text-sm leading-6"
                  >
                    <p>
                      <strong>Competência:</strong> {o.behavior}
                    </p>
                    <p>
                      <strong>Evidência:</strong> {o.evidence}
                    </p>
                    <p>
                      <strong>Critérios:</strong> {o.successCriteria}
                    </p>
                  </div>
                ))}
                {[
                  ["Pré-requisitos", map.prerequisites],
                  ["Barreiras", map.barriers],
                  ["Habilidades intermediárias", map.intermediateSkills],
                ].map(([label, items]) => (
                  <p key={String(label)} className="mt-4 text-sm leading-6">
                    <strong>{String(label)}:</strong>{" "}
                    {(items as string[]).join("; ")}
                  </p>
                ))}
              </section>
            ))}
            {active.strategies.map((s) => (
              <section
                key={s.id}
                className="mt-8 rounded-xl border border-stone-200 bg-white p-6"
              >
                <h2 className="text-xl font-semibold">Estratégia · {s.name}</h2>
                {[
                  ["Como funciona", s.how],
                  ["Justificativa", s.rationale],
                  ["Limitações e riscos", s.risks],
                  ["Recursos", s.resources],
                  ["Participação", s.participation],
                  ["Verificação", s.verification],
                ].map(([k, v]) => (
                  <p key={k} className="mt-3 text-sm leading-6">
                    <strong>{k}:</strong> {v}
                  </p>
                ))}
              </section>
            ))}
            {active.deliverables.map((d) => (
              <section key={d.id} className="mt-8">
                <h2 className="text-xl font-semibold">{d.title}</h2>
                <p className="mt-2 text-xs text-stone-500">
                  Derivado do mapa v{d.mapVersion} · exemplo para leitura
                  {active.visualMap &&
                  active.visualMap.revisions.at(-1)!.version !== d.mapVersion
                    ? " · desatualizado em relação ao mapa visual; não atualizado automaticamente"
                    : ""}
                </p>
                <div className="mt-4 space-y-3">
                  {d.sections.map((s) => (
                    <article
                      key={s.title}
                      className="rounded-xl border border-stone-200 bg-white p-5"
                    >
                      <h3 className="font-semibold">{s.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-stone-600">
                        {s.content}
                      </p>
                    </article>
                  ))}
                  {d.scenes.map((s, i) => (
                    <article
                      key={i}
                      className="rounded-xl border border-stone-200 bg-white p-5"
                    >
                      <h3 className="font-semibold">
                        Cena {i + 1} · {s.duration}
                      </h3>
                      {Object.entries(s)
                        .filter(([k]) => k !== "duration")
                        .map(([k, v]) => (
                          <p key={k} className="mt-2 text-sm leading-6">
                            <strong>
                              {{
                                objective: "Objetivo",
                                content: "Conteúdo",
                                instructorAction: "Ação do instrutor",
                                learnerAction: "Ação do aprendiz",
                                visual: "Recurso visual",
                                transition: "Transição",
                                evidence: "Evidência",
                              }[k] ?? k}
                              :
                            </strong>{" "}
                            {v}
                          </p>
                        ))}
                    </article>
                  ))}
                </div>
              </section>
            ))}
            {active.validation && (
              <section className="mt-8">
                <h2 className="text-xl font-semibold">
                  Revisão pedagógica editorial
                </h2>
                {active.validation.findings.map((f) => (
                  <article
                    key={f.criterion}
                    className="mt-4 rounded-xl border border-stone-200 bg-white p-5"
                  >
                    <h3 className="font-semibold">{f.criterion}</h3>
                    <p className="mt-2 text-sm leading-6">{f.justification}</p>
                    <p className="mt-2 text-sm leading-6 text-teal-800">
                      Próximo passo: {f.recommendation}
                    </p>
                  </article>
                ))}
              </section>
            )}
          </>
        ) : (
          <>
            <div className="mt-9 mb-7">
              <p className="mb-2 text-xs font-semibold tracking-widest text-teal-700">
                CONHECIMENTO QUE TRANSFORMA
              </p>
              <h1 className="text-3xl font-semibold tracking-tight">
                Sua experiência pode abrir novos caminhos.
              </h1>
              <p className="mt-3 text-sm leading-6 text-stone-500">
                Transforme o que você sabe em experiências de aprendizagem com
                propósito.
              </p>
            </div>
            <section className="relative overflow-hidden rounded-2xl bg-[#173f36] p-8 text-white md:p-10">
              <div className="pointer-events-none absolute -top-14 -right-12 h-80 w-80 rounded-full border border-white/10" />
              <div className="pointer-events-none absolute top-0 right-0 h-52 w-52 rounded-full border border-white/10" />
              <div className="relative max-w-lg">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-[11px] text-emerald-100">
                  <Sparkles size={13} /> Da experiência à transformação
                </span>
                <h2 className="mt-5 text-3xl leading-tight font-medium md:text-4xl">
                  Antes de criar uma aula,
                  <br />
                  <span className="text-[#c5dc99]">desenhe a mudança.</span>
                </h2>
                <p className="mt-4 max-w-sm text-sm leading-6 text-emerald-50/70">
                  O que seu aprendiz precisa conseguir fazer? Comece com essa
                  pergunta e dê estrutura ao seu conhecimento.
                </p>
                <button
                  disabled={!ready}
                  onClick={newProject}
                  className="mt-6 inline-flex items-center gap-3 rounded-lg bg-[#d9e9b9] px-5 py-3 text-sm font-semibold text-[#173f36] hover:bg-white"
                >
                  <Plus size={17} /> Criar meu projeto <ArrowRight size={16} />
                </button>
              </div>
            </section>
            <section id="jornada" className="my-8">
              <h2 className="mb-4 text-lg font-semibold">
                Uma jornada, seis etapas
              </h2>
              <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
                {[
                  "Descoberta",
                  "Diagnóstico",
                  "Mapa",
                  "Estratégias",
                  "Entregáveis",
                  "Validação",
                ].map((name, i) => (
                  <div
                    key={name}
                    className="rounded-xl border border-stone-200 bg-white p-4"
                  >
                    <span className="text-xs text-teal-700">0{i + 1}</span>
                    <h3 className="mt-2 text-sm font-semibold">{name}</h3>
                    <p className="mt-2 text-[11px] text-stone-500">
                      {i === 0
                        ? "Comece agora"
                        : i === 1
                          ? "IA com revisão"
                          : "Próxima fase"}
                    </p>
                  </div>
                ))}
              </div>
            </section>
            <section id="projetos">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">
                    Meus projetos{" "}
                    <span className="ml-2 text-sm text-stone-400">
                      {projects.length}
                    </span>
                  </h2>
                  <p className="mt-1 text-xs text-stone-500">
                    Cada projeto começa com uma intenção de aprendizagem.
                  </p>
                </div>
                <div className="flex gap-3">
                  {projects.length > 0 && (
                    <button
                      onClick={exportData}
                      className="flex items-center gap-2 text-xs text-teal-800"
                    >
                      <Download size={14} /> Exportar JSON
                    </button>
                  )}
                  <button
                    disabled={!ready}
                    onClick={newProject}
                    className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-xs font-semibold"
                  >
                    + Novo projeto
                  </button>
                </div>
              </div>
              {!ready ? (
                <p role="status">Carregando projetos…</p>
              ) : projects.length === 0 ? (
                <div className="rounded-xl border border-dashed border-stone-300 bg-white/60 p-10 text-center">
                  <BookOpen className="mx-auto mb-4 text-stone-400" size={28} />
                  <h3 className="font-semibold">
                    Seu conhecimento é o ponto de partida.
                  </h3>
                  <p className="mt-2 text-sm text-stone-500">
                    Crie um projeto ou explore um exemplo de feedback
                    construtivo.
                  </p>
                  <button
                    onClick={() => {
                      const p = {
                        ...structuredClone(exampleProject),
                        id: crypto.randomUUID(),
                      };
                      if (persist([...projects, p])) setSelected(p.id);
                    }}
                    className="mt-5 text-sm font-semibold text-teal-800"
                  >
                    Explorar projeto demonstrativo →
                  </button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {projects.map((p) => (
                    <article
                      key={p.id}
                      className="rounded-xl border border-stone-200 bg-white p-6"
                    >
                      <p className="mb-3 text-[10px] font-semibold tracking-widest text-teal-700">
                        {p.demonstration
                          ? "EXEMPLO DEMONSTRATIVO"
                          : p.diagnosis?.review?.status === "approved"
                            ? "DIAGNÓSTICO APROVADO"
                            : p.diagnosis?.source === "ai"
                              ? "DIAGNÓSTICO EM REVISÃO"
                              : "EM DESCOBERTA"}
                      </p>
                      <button
                        onClick={() => selectProject(p.id)}
                        className="text-left text-lg font-semibold hover:text-teal-700"
                      >
                        {p.title}
                      </button>
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-stone-500">
                        {p.discovery.teach ||
                          "Continue definindo a transformação que deseja promover."}
                      </p>
                      <div className="mt-5 flex items-center justify-between border-t border-stone-100 pt-4">
                        <button
                          onClick={() => selectProject(p.id)}
                          className="text-xs font-semibold text-teal-800"
                        >
                          Abrir projeto →
                        </button>
                        <div className="flex gap-4">
                          <button
                            aria-label={`Duplicar ${p.title}`}
                            onClick={() =>
                              persist([
                                ...projects,
                                duplicateProject(
                                  p,
                                  crypto.randomUUID(),
                                  new Date().toISOString(),
                                ),
                              ])
                            }
                          >
                            <Copy size={16} />
                          </button>
                          <button
                            aria-label={`Excluir ${p.title}`}
                            onClick={() => {
                              if (confirm(`Excluir o projeto “${p.title}”?`))
                                persist(
                                  projects.filter((item) => item.id !== p.id),
                                );
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
              {projects.length > 0 && (
                <button
                  onClick={() => {
                    const p = {
                      ...structuredClone(exampleProject),
                      id: crypto.randomUUID(),
                    };
                    if (persist([...projects, p])) setSelected(p.id);
                  }}
                  className="mt-5 text-xs text-teal-800"
                >
                  Adicionar exemplo de feedback construtivo
                </button>
              )}
            </section>
          </>
        )}
        <footer className="mt-10 flex flex-wrap justify-between gap-2 border-t border-stone-200 pt-5 text-[11px] text-stone-400">
          <span>Arquiteto da Aprendizagem · Conhecimento em movimento.</span>
          <span>Dados salvos apenas neste navegador.</span>
        </footer>
      </main>
      <dialog
        ref={dialog}
        onCancel={() => setOpen(false)}
        onClose={() => setOpen(false)}
        aria-labelledby="project-title"
        className="fixed inset-0 m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl border-0 bg-white p-7 text-stone-800 shadow-xl backdrop:bg-stone-950/40"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 id="project-title" className="text-xl font-semibold">
            {editing
              ? "Editar descoberta"
              : "Vamos descobrir o ponto de partida"}
          </h2>
          <button aria-label="Fechar" onClick={() => setOpen(false)}>
            <X size={20} />
          </button>
        </div>
        <p className="mb-6 text-sm leading-6 text-stone-500">
          Não precisa ter todas as respostas. Apenas o assunto é obrigatório.
          Seus dados ficam neste navegador.
        </p>
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            try {
              const valid = discoverySchema.parse(draft);
              const now = new Date().toISOString();
              const next = editing
                ? projects.map((p) =>
                    p.id === editing
                      ? updateProjectDiscovery(p, valid, now)
                      : p,
                  )
                : [...projects, createProject(valid, crypto.randomUUID(), now)];
              if (persist(next)) {
                setOpen(false);
                if (!editing) setSelected(next[next.length - 1].id);
              }
            } catch {
              setError("Confira o assunto e os limites de tamanho dos campos.");
            }
          }}
        >
          {fields.map((f, i) => (
            <label key={f.key} className="block text-sm font-medium">
              {f.label}
              {i === 0 && " *"}
              <textarea
                autoFocus={i === 0}
                required={i === 0}
                name={f.key}
                value={draft[f.key]}
                onChange={(e) =>
                  setDraft({ ...draft, [f.key]: e.target.value })
                }
                maxLength={
                  {
                    subject: 160,
                    teach: 2000,
                    audience: 1000,
                    priorKnowledge: 2000,
                    difficulties: 2000,
                    experiences: 3000,
                    modality: 200,
                    constraints: 1000,
                  }[f.key]
                }
                rows={i === 0 ? 2 : 3}
                placeholder={f.hint}
                className="mt-2 w-full rounded-lg border border-stone-300 p-3 text-sm font-normal"
              />
            </label>
          ))}
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="w-full rounded-lg bg-teal-800 p-3 font-semibold text-white"
          >
            Salvar descoberta
          </button>
        </form>
      </dialog>
    </div>
  );
}
