"use client";
import { useEffect, useRef, useState } from "react";
import {
  approveDiagnosis,
  diagnosisLines,
  diagnosisSchema,
  discoveryChanged,
  type Diagnosis,
  type DiagnosisOutput,
} from "@/domain/diagnosis";
import { StructuredDiagnosisEditor } from "./structured-diagnosis-editor";
import { adaptLegacyDiagnosis } from "@/domain/adapt-diagnosis";
import { evaluateDiagnosis } from "@/domain/diagnosis-rubric";
import {
  projectLegacyAnalysis,
  rubricIds,
  type AnalysisSection,
} from "@/domain/pedagogical-analysis";
import type { Project } from "@/domain/models";
const groups: {
  key: keyof Omit<DiagnosisOutput, "rationale">;
  label: string;
  hint: string;
}[] = [
  {
    key: "priorKnowledge",
    label: "Possíveis conhecimentos prévios",
    hint: "Hipóteses sobre pré-requisitos; confirme com o público.",
  },
  {
    key: "assumptions",
    label: "Pressupostos ocultos",
    hint: "Jargões e conhecimentos que podem estar sendo presumidos.",
  },
  {
    key: "gaps",
    label: "Possíveis lacunas",
    hint: "Conceitos ou habilidades intermediárias a investigar.",
  },
  {
    key: "barriers",
    label: "Barreiras de aprendizagem",
    hint: "Obstáculos cognitivos, comportamentais ou de contexto.",
  },
  {
    key: "competencies",
    label: "Competências observáveis propostas",
    hint: "Comportamentos e evidências sugeridos, sujeitos à sua revisão.",
  },
  {
    key: "needsValidation",
    label: "Perguntas para esclarecimento",
    hint: "O que ainda precisa ser validado com pessoas reais?",
  },
];
export function DiagnosisPanel({
  project,
  onSave,
  onDirtyChange,
}: {
  project: Project;
  onSave: (diagnosis: Diagnosis) => boolean;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [proposal, setProposal] = useState<Diagnosis | undefined>(
    project.diagnosis?.source === "ai" ? project.diagnosis : undefined,
  );
  const [available, setAvailable] = useState<boolean | null>(null);
  useEffect(() => {
    const abort = new AbortController();
    fetch("/api/diagnosis/status", { cache: "no-store", signal: abort.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (typeof data?.configured === "boolean")
          setAvailable(data.configured);
      })
      .catch(() => {});
    return () => abort.abort();
  }, []);
  const [approvalNote, setApprovalNote] = useState(
    project.diagnosis?.review?.pedagogicalReview?.justification ?? "",
  );
  const [reviewConfirmed, setReviewConfirmed] = useState(
    !!project.diagnosis?.review?.pedagogicalReview?.reviewedCriteria.length,
  );
  const rubric = proposal
    ? evaluateDiagnosis(proposal, project.discovery)
    : undefined;
  const [token, setToken] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
  }, [dirty, onDirtyChange]);
  useEffect(() => {
    if (!dirty) return;
    const protect = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, [dirty]);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const stale = proposal?.review
    ? discoveryChanged(proposal.review.sourceDiscovery, project.discovery)
    : false;
  function edit(next: Diagnosis) {
    setApprovalNote("");
    setReviewConfirmed(false);
    setProposal({
      ...next,
      review: next.review
        ? {
            ...next.review,
            status: "draft",
            approvedAt: undefined,
            pedagogicalReview: undefined,
            editedByHuman: true,
          }
        : undefined,
    });
    setDirty(true);
    setNotice("");
  }
  async function generate() {
    if (
      dirty &&
      !confirm("Descartar a revisão ainda não salva e gerar uma nova proposta?")
    )
      return;
    setBusy(true);
    // Each attempt needs fresh consent; retries may also incur provider charges.
    setConsent(false);
    setError("");
    setNotice("");
    const abort = new AbortController();
    controller.current = abort;
    const timer = setTimeout(() => abort.abort(), 100_000);
    try {
      const response = await fetch("/api/diagnosis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          discovery: project.discovery,
          consent,
          costConsent: consent,
        }),
        signal: abort.signal,
      });
      const data: unknown = await response.json().catch(() => null);
      if (!data || typeof data !== "object")
        throw new Error(
          "O serviço não respondeu como esperado. Seu diagnóstico salvo foi preservado.",
        );
      const payload = data as Record<string, unknown>;
      if (!response.ok)
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : "Não foi possível concluir a análise.",
        );
      const parsed = diagnosisSchema.parse(payload.diagnosis);
      if (
        parsed.source !== "ai" ||
        !parsed.analysis ||
        !parsed.review ||
        discoveryChanged(parsed.review.sourceDiscovery, project.discovery)
      )
        throw new Error("A resposta não corresponde à descoberta atual.");
      setProposal(parsed);
      setApprovalNote("");
      setReviewConfirmed(false);
      setDirty(true);
      setNotice(
        "Proposta recebida. Revise e salve ou aprove; o diagnóstico anterior ainda está preservado.",
      );
    } catch (error) {
      if (!abort.signal.aborted)
        setError(
          error instanceof Error &&
            !(error instanceof SyntaxError) &&
            error.name !== "ZodError" &&
            !(error instanceof TypeError)
            ? error.message
            : "Não foi possível concluir a análise. Seu diagnóstico salvo foi preservado. Tente novamente mais tarde.",
        );
      else
        setError(
          "A solicitação foi interrompida ou excedeu o tempo limite. O diagnóstico salvo foi preservado.",
        );
    } finally {
      clearTimeout(timer);
      setBusy(false);
    }
  }
  function save(approve = false) {
    if (!proposal?.review) return;
    try {
      const version = (project.diagnosis?.review?.version ?? 0) + 1;
      const analysis = proposal.pedagogy
        ? projectLegacyAnalysis(proposal.pedagogy)
        : proposal.analysis
          ? {
              ...proposal.analysis,
              ...Object.fromEntries(
                groups.map(({ key }) => [
                  key,
                  diagnosisLines(proposal.analysis![key].join("\n")),
                ]),
              ),
            }
          : undefined;
      const next = diagnosisSchema.parse({
        ...proposal,
        facts: diagnosisLines(proposal.facts.join("\n")),
        analysis,
        inferences: analysis
          ? [
              ...analysis.priorKnowledge,
              ...analysis.assumptions,
              ...analysis.gaps,
              ...analysis.barriers,
              ...analysis.competencies,
            ]
          : proposal.inferences,
        needsValidation: analysis?.needsValidation ?? proposal.needsValidation,
        review: {
          ...proposal.review,
          version,
          ...(proposal.pedagogy
            ? {
                pedagogicalReview: {
                  reviewedCriteria: reviewConfirmed ? [...rubricIds] : [],
                  justification: approvalNote,
                },
              }
            : {}),
        },
      });
      const reviewed = approve
        ? approveDiagnosis(next, project.discovery, new Date().toISOString())
        : {
            ...next,
            review: {
              ...next.review!,
              status: "draft" as const,
              approvedAt: undefined,
            },
          };
      if (onSave(reviewed)) {
        setProposal(reviewed);
        setDirty(false);
        setNotice(
          approve
            ? "Diagnóstico aprovado e salvo neste navegador."
            : "Revisão salva neste navegador.",
        );
        setError("");
      } else
        setError(
          "Não foi possível salvar. Sua revisão permanece aberta para nova tentativa.",
        );
    } catch {
      setError(
        proposal.pedagogy
          ? "Confira as pendências, a revisão humana e sua justificativa. Você pode salvar o rascunho mesmo incompleto."
          : "Confira os campos (até 8 itens de 700 caracteres por grupo). Atualize o diagnóstico se a descoberta mudou.",
      );
    }
  }
  return (
    <section
      className="mt-8 rounded-xl border border-teal-200 bg-white p-6"
      aria-labelledby="diagnosis-heading"
    >
      <h2 id="diagnosis-heading" className="text-xl font-semibold">
        Diagnóstico assistido por IA
      </h2>
      <p className="mt-3 text-sm leading-6 text-stone-600">
        A IA propõe hipóteses a partir da descoberta. Você mantém a autoria,
        revisa e decide o que aprovar. A análise do planejamento não comprova
        aprendizagem real.
      </p>
      {available === false && (
        <p
          role="status"
          className="mt-4 rounded-lg bg-amber-50 p-4 text-sm text-amber-900"
        >
          A IA ainda não está disponível neste ambiente. Você pode criar, editar
          e salvar projetos normalmente. A configuração fica a cargo do
          responsável técnico.
        </p>
      )}
      <details className="mt-4 rounded-lg bg-stone-50 p-4 text-sm">
        <summary className="cursor-pointer font-medium">
          Configuração e limites
        </summary>
        <p className="mt-2 leading-6">
          O administrador configura a chave exclusivamente no servidor e fornece
          um código de acesso. Limites por instância: 5 chamadas/minuto, 20 em
          24 horas e 2 simultâneas. Cada resposta tem limite de 6.000 tokens.
          Chamadas podem gerar custo mesmo quando falham. O código abaixo não é
          sua chave OpenAI e não é salvo no projeto.
        </p>
      </details>
      <label className="mt-4 block text-sm font-medium">
        Código de acesso ao diagnóstico
        <input
          type="password"
          autoComplete="off"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          maxLength={256}
          className="mt-2 block w-full max-w-md rounded-lg border border-stone-300 p-3"
        />
      </label>
      <label className="mt-4 flex items-start gap-3 text-sm leading-6">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1"
        />
        Autorizo enviar os oito campos da descoberta deste projeto à OpenAI para
        esta análise e autorizo o custo desta chamada na conta configurada.
        Revise e remova dados pessoais ou confidenciais antes de enviar. Outros
        projetos e entregáveis não serão enviados.
      </label>
      <button
        disabled={busy || available === false || !consent || !token.trim()}
        onClick={generate}
        className="mt-4 rounded-lg bg-teal-800 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy
          ? "Analisando descoberta…"
          : proposal
            ? "Gerar nova proposta"
            : "Analisar com IA"}
      </button>
      {busy && (
        <p role="status" className="mt-3 text-sm">
          Preparando hipóteses. Seu diagnóstico salvo será preservado.
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="mt-4 text-sm text-teal-800">
          {notice}
        </p>
      )}
      {(proposal || project.diagnosis) && !proposal?.pedagogy && (
        <div className="mt-5 rounded-lg bg-amber-50 p-4 text-sm">
          <p>
            Este registro usa o formato anterior. O texto permanece preservado.
            Você pode organizá-lo no novo formato, sem IA; os campos ausentes
            exigirão sua revisão antes da aprovação.
          </p>
          <button
            disabled={busy}
            type="button"
            onClick={() =>
              (() => {
                try {
                  edit(
                    adaptLegacyDiagnosis(
                      (proposal ?? project.diagnosis)!,
                      project.discovery,
                    ),
                  );
                } catch {
                  setError(
                    "Não foi possível organizar este registro. O diagnóstico antigo foi preservado.",
                  );
                }
              })()
            }
            className="mt-3 font-semibold text-teal-800"
          >
            Organizar registro antigo, sem IA
          </button>
        </div>
      )}
      {(proposal?.analysis || proposal?.pedagogy) && proposal?.review && (
        <div className="mt-6 border-t border-stone-200 pt-5">
          <p className="text-sm font-semibold">
            {stale
              ? "Desatualizado: a descoberta mudou. Gere uma nova proposta antes de aprovar."
              : dirty
                ? "Proposta com alterações ainda não salvas"
                : proposal.review.status === "approved"
                  ? "Aprovado pelo especialista"
                  : "Aguardando revisão humana"}
          </p>
          <p className="mt-2 text-xs text-stone-500">
            Origem:{" "}
            {proposal.pedagogyOrigin === "technical_adaptation"
              ? "adaptação técnica de registro anterior, sem nova IA"
              : "IA"}{" "}
            · modelo de origem {proposal.review.model} · versão salva{" "}
            {project.diagnosis?.review?.version ?? 0}
            {proposal.review.editedByHuman ? " · revisado manualmente" : ""}
          </p>
          <label className="mt-5 block text-sm font-semibold">
            Fatos informados pelo especialista
            <p className="my-2 text-xs font-normal text-stone-500">
              Extraídos dos campos da descoberta, sem geração pela IA. Edite
              apenas para corrigir ou esclarecer o que foi informado. Um item
              por linha.
            </p>
            <textarea
              disabled={busy}
              value={proposal.facts.join("\n")}
              onChange={(e) =>
                edit({ ...proposal, facts: e.target.value.split("\n") })
              }
              rows={5}
              maxLength={16000}
              className="w-full rounded-lg border border-stone-300 p-3 text-sm font-normal"
            />
          </label>
          {proposal.pedagogy && rubric ? (
            <StructuredDiagnosisEditor
              analysis={proposal.pedagogy}
              discovery={project.discovery}
              disabled={busy}
              rubric={rubric}
              reviewNote={approvalNote}
              reviewConfirmed={reviewConfirmed}
              onChange={(pedagogy) => edit({ ...proposal, pedagogy })}
              onReject={(section: AnalysisSection, index: number) => {
                const pedagogy = structuredClone(proposal.pedagogy!);
                const data = JSON.stringify(pedagogy[section][index]);
                pedagogy[section].splice(index, 1);
                edit({
                  ...proposal,
                  pedagogy,
                  rejectedItems: [
                    ...(proposal.rejectedItems ?? []),
                    { section, data, rejectedAt: new Date().toISOString() },
                  ],
                });
              }}
              onReview={(note, confirmed) => {
                setApprovalNote(note);
                setReviewConfirmed(confirmed);
                setDirty(true);
                setNotice("");
                setProposal({
                  ...proposal,
                  review: {
                    ...proposal.review!,
                    status: "draft",
                    approvedAt: undefined,
                    editedByHuman: true,
                  },
                });
              }}
            />
          ) : (
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              {groups.map((group) => (
                <label key={group.key} className="block text-sm font-semibold">
                  {group.label}
                  <p className="my-2 text-xs leading-5 font-normal text-stone-500">
                    {group.hint} Um item por linha.
                  </p>
                  <textarea
                    disabled={busy}
                    value={proposal.analysis![group.key].join("\n")}
                    onChange={(e) => {
                      const analysis = {
                        ...proposal.analysis!,
                        [group.key]: e.target.value.split("\n"),
                      };
                      edit({
                        ...proposal,
                        analysis,
                        inferences: [
                          ...analysis.priorKnowledge,
                          ...analysis.assumptions,
                          ...analysis.gaps,
                          ...analysis.barriers,
                          ...analysis.competencies,
                        ],
                        needsValidation: analysis.needsValidation,
                      });
                    }}
                    rows={5}
                    maxLength={5608}
                    className="w-full rounded-lg border border-stone-300 p-3 text-sm leading-6 font-normal"
                  />
                </label>
              ))}
            </div>
          )}
          {!!proposal.rejectedItems?.length && (
            <details className="mt-4 text-sm">
              <summary>
                Itens rejeitados e preservados ({proposal.rejectedItems.length})
              </summary>
              <p className="mt-2">
                Os itens retirados permanecem no registro e na exportação. O
                histórico preserva versões anteriores.
              </p>
            </details>
          )}
          <label className="mt-5 block text-sm font-semibold">
            Justificativa da proposta
            <textarea
              disabled={busy}
              value={
                proposal.pedagogy?.rationale ??
                proposal.analysis?.rationale ??
                proposal.rationale
              }
              onChange={(e) =>
                edit({
                  ...proposal,
                  rationale: e.target.value,
                  ...(proposal.pedagogy
                    ? {
                        pedagogy: {
                          ...proposal.pedagogy,
                          rationale: e.target.value,
                        },
                      }
                    : {
                        analysis: {
                          ...proposal.analysis!,
                          rationale: e.target.value,
                        },
                      }),
                })
              }
              maxLength={1400}
              rows={4}
              className="mt-2 w-full rounded-lg border border-stone-300 p-3 text-sm font-normal"
            />
          </label>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              disabled={
                busy || (!dirty && proposal.review.status === "approved")
              }
              onClick={() => save()}
              className="rounded-lg border border-stone-300 px-4 py-3 text-sm disabled:opacity-50"
            >
              Salvar revisão
            </button>
            <button
              disabled={
                busy ||
                stale ||
                (!!proposal.pedagogy &&
                  (!!rubric?.blocking.length ||
                    !reviewConfirmed ||
                    approvalNote.trim().length < 15)) ||
                (!dirty && proposal.review.status === "approved")
              }
              onClick={() => save(true)}
              className="rounded-lg bg-teal-800 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              Aprovar diagnóstico
            </button>
          </div>
          <p className="mt-3 text-xs leading-5 text-stone-500">
            Editar ou gerar uma nova versão exige nova aprovação. Aprovar
            confirma sua revisão; não converte hipóteses em fatos. Até 10
            versões anteriores ficam no JSON exportado.
          </p>
        </div>
      )}
    </section>
  );
}
