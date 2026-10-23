"use client";
import { useEffect, useRef, useState } from "react";
import {
  approveDiagnosis,
  diagnosisSchema,
  discoveryChanged,
  type Diagnosis,
  type DiagnosisOutput,
} from "@/domain/diagnosis";
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
}: {
  project: Project;
  onSave: (diagnosis: Diagnosis) => boolean;
}) {
  const [proposal, setProposal] = useState<Diagnosis | undefined>(
    project.diagnosis?.source === "ai" ? project.diagnosis : undefined,
  );
  const [token, setToken] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dirty, setDirty] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const stale = proposal?.review
    ? discoveryChanged(proposal.review.sourceDiscovery, project.discovery)
    : false;
  function edit(next: Diagnosis) {
    setProposal({
      ...next,
      review: next.review
        ? {
            ...next.review,
            status: "draft",
            approvedAt: undefined,
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
    setError("");
    setNotice("");
    const abort = new AbortController();
    controller.current = abort;
    const timer = setTimeout(() => abort.abort(), 55_000);
    try {
      const response = await fetch("/api/diagnosis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ discovery: project.discovery, consent }),
        signal: abort.signal,
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Não foi possível concluir a análise.",
        );
      const parsed = diagnosisSchema.parse(data.diagnosis);
      if (
        parsed.source !== "ai" ||
        !parsed.analysis ||
        !parsed.review ||
        discoveryChanged(parsed.review.sourceDiscovery, project.discovery)
      )
        throw new Error("A resposta não corresponde à descoberta atual.");
      setProposal(parsed);
      setDirty(true);
      setNotice(
        "Proposta recebida. Revise e salve ou aprove; o diagnóstico anterior ainda está preservado.",
      );
    } catch (error) {
      if (!abort.signal.aborted)
        setError(error instanceof Error ? error.message : "Falha na análise.");
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
      const next = diagnosisSchema.parse({
        ...proposal,
        review: { ...proposal.review, version },
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
        "Confira os campos (até 8 itens de 700 caracteres por grupo). Atualize o diagnóstico se a descoberta mudou.",
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
      <details className="mt-4 rounded-lg bg-stone-50 p-4 text-sm">
        <summary className="cursor-pointer font-medium">
          Configuração e limites
        </summary>
        <p className="mt-2 leading-6">
          O administrador configura a chave exclusivamente no servidor e fornece
          um código de acesso. Limites por instância: 5 chamadas/minuto, 20 em
          24 horas e 2 simultâneas. Cada resposta tem limite de 3.000 tokens.
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
        esta análise. Revise e remova dados pessoais ou confidenciais antes de
        enviar. Outros projetos e entregáveis não serão enviados.
      </label>
      <button
        disabled={busy || !consent || !token.trim()}
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
      {proposal?.analysis && proposal.review && (
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
            Origem: IA · modelo {proposal.review.model} · versão salva{" "}
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
          <label className="mt-5 block text-sm font-semibold">
            Justificativa da proposta
            <textarea
              disabled={busy}
              value={proposal.analysis.rationale}
              onChange={(e) =>
                edit({
                  ...proposal,
                  rationale: e.target.value,
                  analysis: {
                    ...proposal.analysis!,
                    rationale: e.target.value,
                  },
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
