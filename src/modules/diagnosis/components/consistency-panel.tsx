"use client";
import { useEffect, useRef, useState } from "react";
import type { Diagnosis } from "@/domain/diagnosis";
import type { Discovery } from "@/domain/models";
import {
  assistedOutputSchema,
  type ConsistencyReview,
} from "@/pedagogical-engine/consistency/contracts";
import {
  assistedSnapshot,
  checkConsistency,
  coverageFor,
  investigateKnowledgeCurse,
  pilotReadiness,
  reviewIsCurrent,
  startConsistencyReview,
} from "@/pedagogical-engine/consistency/engine";
const inputClass =
  "mt-1 block w-full rounded border border-stone-300 bg-white p-2 text-sm";
export function ConsistencyPanel({
  diagnosis,
  discovery,
  disabled,
  onChange,
  onBusy,
}: {
  diagnosis: Diagnosis;
  discovery: Discovery;
  disabled: boolean;
  onChange: (review: ConsistencyReview) => void;
  onBusy: (busy: boolean) => void;
}) {
  const review = diagnosis.consistency,
    current = reviewIsCurrent(diagnosis, discovery);
  const findings = checkConsistency(diagnosis, discovery),
    readiness = pilotReadiness(diagnosis, discovery);
  const investigation = investigateKnowledgeCurse(diagnosis, discovery);
  const [available, setAvailable] = useState(false),
    [access, setAccess] = useState(""),
    [consent, setConsent] = useState(false),
    [target, setTarget] = useState("objective"),
    [message, setMessage] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    const c = new AbortController();
    fetch("/api/pedagogical-review", { signal: c.signal, cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setAvailable(d.configured === true))
      .catch(() => {});
    return () => {
      c.abort();
      controller.current?.abort();
    };
  }, []);
  function change(next: ConsistencyReview) {
    onChange({
      ...next,
      pilotReview: { ...next.pilotReview, confirmed: false },
    });
  }
  async function request(purpose: "verify" | "suggest") {
    if (
      !review ||
      review.aiReports.length >= 10 ||
      !diagnosis.pedagogy ||
      !current ||
      !consent ||
      !access
    )
      return;
    const snapshot = assistedSnapshot(diagnosis, discovery),
      abort = new AbortController();
    controller.current = abort;
    onBusy(true);
    setConsent(false);
    setMessage("");
    const timer = setTimeout(() => abort.abort(), 50_000);
    try {
      const response = await fetch("/api/pedagogical-review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${access}`,
        },
        body: JSON.stringify({
          purpose,
          target,
          discovery,
          pedagogy: diagnosis.pedagogy,
          facts: diagnosis.facts,
          capabilities: review.capabilities,
          links: review.links,
          consent: true,
          costConsent: true,
        }),
        signal: abort.signal,
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(
          typeof body.error === "string" ? body.error : "A verificação falhou.",
        );
      const output = assistedOutputSchema.parse(body.output);
      change({
        ...review,
        aiReports: [
          ...review.aiReports,
          {
            purpose,
            target,
            sourceSnapshot: snapshot,
            createdAt: new Date().toISOString(),
            model: String(body.model).slice(0, 100),
            output,
          },
        ],
      });
      setMessage(
        "Proposta de revisão recebida. Nenhum texto foi substituído; salve para preservar e avalie cada sugestão.",
      );
    } catch (error) {
      if (!abort.signal.aborted)
        setMessage(
          error instanceof Error &&
            error.name !== "ZodError" &&
            error.name !== "TypeError"
            ? error.message
            : "Não foi possível concluir. O diagnóstico foi preservado.",
        );
      else
        setMessage(
          "Verificação interrompida; o diagnóstico foi preservado. Não houve repetição automática.",
        );
    } finally {
      clearTimeout(timer);
      onBusy(false);
    }
  }
  return (
    <section
      aria-label="Conferência de consistência pedagógica"
      className="mt-6 space-y-4 rounded-xl border border-indigo-200 bg-indigo-50/30 p-4"
    >
      <h3 className="text-lg font-semibold">
        Conferência de consistência pedagógica
      </h3>
      <p className="text-sm leading-6">
        Esta conferência é separada da geração. Campos preenchidos e palavras
        repetidas não comprovam cobertura, qualidade ou aprendizagem. Relacione
        o objetivo ao que será observado e registre as dúvidas.
      </p>
      <p className="text-sm font-semibold">
        {readiness.ready
          ? "Revisão registrada para piloto assistido, com limites — sem garantia de eficácia."
          : "Ainda não está revisado para piloto assistido."}
      </p>
      {readiness.reasons.length > 0 && (
        <details>
          <summary>O que falta para a revisão de piloto</summary>
          <ul className="ml-5 list-disc text-sm">
            {readiness.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </details>
      )}
      {(!review || !current) && (
        <div className="rounded bg-amber-50 p-3 text-sm">
          <p>
            {review
              ? "O diagnóstico mudou. As relações e decisões anteriores estão preservadas, mas precisam de nova conferência."
              : "Este registro ainda não tem conferência de cobertura. Aprovações anteriores do texto não equivalem à revisão para piloto."}
          </p>
          <button
            type="button"
            disabled={disabled}
            className="mt-2 font-semibold text-indigo-800"
            onClick={() => {
              if (
                review &&
                !confirm(
                  "Iniciar nova conferência? Salve antes se deseja preservar as anotações atuais no histórico. A versão salva anterior e as propostas de IA serão mantidas.",
                )
              )
                return;
              const next = startConsistencyReview(diagnosis, discovery);
              onChange({ ...next, aiReports: review?.aiReports ?? [] });
            }}
          >
            {review
              ? "Atualizar conferência para esta versão"
              : "Iniciar conferência sem IA"}
          </button>
        </div>
      )}
      {review && (
        <fieldset disabled={disabled || !current} className="space-y-4">
          <legend className="font-semibold">
            Objetivo → competência → evidência → critério
          </legend>
          <p className="text-sm">
            Objetivo original: {discovery.teach || "Ainda não informado."} A
            separação abaixo é uma proposta por regras de linguagem; confirme,
            ajuste ou complemente sem omitir resultados esperados.
          </p>
          {review.capabilities.map((cap, index) => {
            const link = review.links.find((l) => l.capabilityId === cap.id),
              c = link
                ? diagnosis.pedagogy?.competencies[link.competencyIndex]
                : undefined;
            const update = (patch: object) =>
              change({
                ...review,
                links: [
                  ...review.links.filter((l) => l.capabilityId !== cap.id),
                  {
                    capabilityId: cap.id,
                    competencyIndex: link?.competencyIndex ?? 0,
                    evidenceQuote: link?.evidenceQuote ?? "",
                    criterionQuote: link?.criterionQuote ?? "",
                    explanation: link?.explanation ?? "",
                    judgment: link?.judgment ?? "pending",
                    ...patch,
                  },
                ],
              });
            return (
              <fieldset
                key={cap.id}
                className="space-y-2 rounded border border-stone-200 bg-white p-3"
              >
                <legend>Capacidade {index + 1}</legend>
                <label className="block text-sm">
                  Resultado esperado
                  <input
                    className={inputClass}
                    maxLength={2000}
                    value={cap.label}
                    onChange={(e) =>
                      change({
                        ...review,
                        decompositionConfirmed: false,
                        links: review.links.map((l) =>
                          l.capabilityId === cap.id
                            ? { ...l, judgment: "pending" }
                            : l,
                        ),
                        capabilities: review.capabilities.map((v) =>
                          v.id === cap.id
                            ? { ...v, label: e.target.value, origin: "human" }
                            : v,
                        ),
                      })
                    }
                  />
                </label>
                <label className="block text-sm">
                  Trecho literal do objetivo
                  <input
                    className={inputClass}
                    maxLength={2000}
                    value={cap.sourceQuote}
                    onChange={(e) =>
                      change({
                        ...review,
                        decompositionConfirmed: false,
                        links: review.links.map((l) =>
                          l.capabilityId === cap.id
                            ? { ...l, judgment: "pending" }
                            : l,
                        ),
                        capabilities: review.capabilities.map((v) =>
                          v.id === cap.id
                            ? {
                                ...v,
                                sourceQuote: e.target.value,
                                origin: "human",
                              }
                            : v,
                        ),
                      })
                    }
                  />
                </label>
                <p className="text-sm">
                  {coverageFor(diagnosis, discovery, cap).reason}
                </p>
                <label className="block text-sm">
                  Competência relacionada
                  <select
                    className={inputClass}
                    value={link?.competencyIndex ?? ""}
                    onChange={(e) => {
                      if (e.target.value === "") {
                        change({
                          ...review,
                          links: review.links.filter(
                            (l) => l.capabilityId !== cap.id,
                          ),
                        });
                        return;
                      }
                      update({
                        competencyIndex: Number(e.target.value),
                        evidenceQuote: "",
                        criterionQuote: "",
                        judgment: "pending",
                      });
                    }}
                  >
                    <option value="">Escolha uma competência</option>
                    {diagnosis.pedagogy?.competencies.map((v, i) => (
                      <option key={i} value={i}>
                        {i + 1}. {v.action}
                      </option>
                    ))}
                  </select>
                </label>
                {c && (
                  <details className="text-sm">
                    <summary>Consultar desempenho proposto</summary>
                    <p>Condição: {c.condition}</p>
                    <p>Evidência: {c.performanceEvidence}</p>
                    <p>Critério: {c.successCriterion}</p>
                  </details>
                )}
                <label className="block text-sm">
                  Trecho da evidência que demonstra esta capacidade
                  <textarea
                    className={inputClass}
                    rows={2}
                    maxLength={2000}
                    value={link?.evidenceQuote ?? ""}
                    onChange={(e) =>
                      update({
                        evidenceQuote: e.target.value,
                        judgment: "pending",
                      })
                    }
                  />
                </label>
                <label className="block text-sm">
                  Trecho do critério que permite julgar o desempenho
                  <textarea
                    className={inputClass}
                    rows={2}
                    maxLength={2000}
                    value={link?.criterionQuote ?? ""}
                    onChange={(e) =>
                      update({
                        criterionQuote: e.target.value,
                        judgment: "pending",
                      })
                    }
                  />
                </label>
                <label className="block text-sm">
                  Por que esses trechos demonstram o resultado?
                  <textarea
                    className={inputClass}
                    rows={2}
                    maxLength={2000}
                    value={link?.explanation ?? ""}
                    onChange={(e) =>
                      update({
                        explanation: e.target.value,
                        judgment: "pending",
                      })
                    }
                  />
                </label>
                <label className="block text-sm">
                  Minha avaliação da relação
                  <select
                    className={inputClass}
                    value={link?.judgment ?? "pending"}
                    onChange={(e) => update({ judgment: e.target.value })}
                  >
                    <option value="pending">Ainda preciso avaliar</option>
                    <option value="absent">Ausente</option>
                    <option value="partial">Parcial</option>
                    <option value="supported_by_human">
                      Conferi a relação e consigo justificá-la
                    </option>
                  </select>
                </label>
                <button
                  type="button"
                  className="text-sm text-red-800"
                  onClick={() =>
                    change({
                      ...review,
                      decompositionConfirmed: false,
                      capabilities: review.capabilities.filter(
                        (v) => v.id !== cap.id,
                      ),
                      links: review.links.filter(
                        (l) => l.capabilityId !== cap.id,
                      ),
                    })
                  }
                >
                  Remover capacidade {index + 1}
                </button>
              </fieldset>
            );
          })}
          <button
            type="button"
            disabled={review.capabilities.length >= 20}
            className="text-sm font-semibold text-indigo-800"
            onClick={() =>
              change({
                ...review,
                decompositionConfirmed: false,
                capabilities: [
                  ...review.capabilities,
                  {
                    id: crypto.randomUUID(),
                    label: "",
                    sourceQuote: "",
                    origin: "human",
                  },
                ],
              })
            }
          >
            Acrescentar capacidade do objetivo
          </button>
          <label className="flex gap-2 text-sm">
            <input
              type="checkbox"
              checked={review.decompositionConfirmed}
              onChange={(e) =>
                change({ ...review, decompositionConfirmed: e.target.checked })
              }
            />
            Conferi que a lista contempla os resultados expressos no objetivo.
          </label>
          <h4 className="font-semibold">Lacunas e decisões</h4>
          <p className="text-sm">
            Corrija nos campos do diagnóstico acima. Se não puder resolver
            agora, registre o que falta investigar. Uma justificativa de
            manutenção não elimina uma lacuna objetiva de cobertura.
          </p>
          {findings.map((f) => {
            const decision = review.dispositions.find(
              (v) => v.findingId === f.id,
            );
            return (
              <fieldset
                key={f.id}
                className="space-y-2 rounded border border-amber-200 bg-white p-3"
              >
                <legend className="text-sm font-semibold">{f.title}</legend>
                <p className="text-xs">
                  {f.certainty === "objective_check"
                    ? "Verificação objetiva da informação/relação registrada"
                    : "Alerta por padrão de linguagem — pode exigir interpretação"}
                </p>
                <p className="text-sm">{f.detail}</p>
                <p className="text-sm">Como corrigir: {f.correction}</p>
                <label className="block text-sm">
                  Decisão sobre este alerta
                  <select
                    className={inputClass}
                    value={decision?.status ?? "pending"}
                    onChange={(e) =>
                      change({
                        ...review,
                        dispositions: [
                          ...review.dispositions.filter(
                            (v) => v.findingId !== f.id,
                          ),
                          {
                            findingId: f.id,
                            status: e.target.value as
                              "pending" | "investigate" | "keep" | "corrected",
                            justification: decision?.justification ?? "",
                          },
                        ],
                      })
                    }
                  >
                    <option value="pending">Ainda vou revisar</option>
                    <option value="investigate">
                      Pendente de investigação
                    </option>
                    <option value="keep">Manter com justificativa</option>
                    <option value="corrected">
                      Corrigi — conferir novamente
                    </option>
                  </select>
                </label>
                <label className="block text-sm">
                  Justificativa ou informação a investigar
                  <textarea
                    className={inputClass}
                    maxLength={2000}
                    rows={2}
                    value={decision?.justification ?? ""}
                    onChange={(e) =>
                      change({
                        ...review,
                        dispositions: [
                          ...review.dispositions.filter(
                            (v) => v.findingId !== f.id,
                          ),
                          {
                            findingId: f.id,
                            status: decision?.status ?? "pending",
                            justification: e.target.value,
                          },
                        ],
                      })
                    }
                  />
                </label>
              </fieldset>
            );
          })}
          {!findings.length && (
            <p className="text-sm">
              Nenhum alerta nas regras atuais. Isso não comprova qualidade
              integral; conclua a revisão humana.
            </p>
          )}
          <h4 className="font-semibold">
            O que pode parecer óbvio para quem já sabe
          </h4>
          <p className="text-sm">{investigation.limitation}</p>
          {investigation.prompts.map((p) => (
            <div key={p.kind} className="rounded bg-white p-3 text-sm">
              <strong>{p.kind}</strong>
              <p>Base: {p.basis}</p>
              <p>{p.question}</p>
            </div>
          ))}
          <label className="block text-sm">
            O que investiguei e o que ainda não sabemos
            <textarea
              className={inputClass}
              rows={3}
              maxLength={2000}
              value={review.knowledgeReview.note}
              onChange={(e) =>
                change({
                  ...review,
                  knowledgeReview: { note: e.target.value, reviewed: false },
                })
              }
            />
          </label>
          <label className="flex gap-2 text-sm">
            <input
              type="checkbox"
              checked={review.knowledgeReview.reviewed}
              onChange={(e) =>
                change({
                  ...review,
                  knowledgeReview: {
                    ...review.knowledgeReview,
                    reviewed: e.target.checked,
                  },
                })
              }
            />
            Revisei os pressupostos pertinentes ao conteúdo, sem forçar
            categorias.
          </label>
          <label className="block text-sm">
            Limitações e condições para o piloto assistido
            <textarea
              className={inputClass}
              rows={3}
              maxLength={2000}
              value={review.pilotReview.justification}
              onChange={(e) =>
                change({
                  ...review,
                  pilotReview: {
                    confirmed: false,
                    justification: e.target.value,
                  },
                })
              }
            />
          </label>
          <label className="flex gap-2 text-sm">
            <input
              type="checkbox"
              checked={review.pilotReview.confirmed}
              onChange={(e) =>
                onChange({
                  ...review,
                  pilotReview: {
                    ...review.pilotReview,
                    confirmed: e.target.checked,
                  },
                })
              }
            />
            Revisei a rastreabilidade e as decisões para uso em piloto
            assistido, com as limitações registradas.
          </label>
        </fieldset>
      )}
      <details>
        <summary className="cursor-pointer font-semibold">
          Verificação ou sugestão opcional com IA
        </summary>
        <div className="mt-3 space-y-3 text-sm">
          <p>
            Etapa separada, sem aprovação automática. Envia descoberta,
            diagnóstico estruturado e relações atuais à OpenAI. Orçamento
            próprio: 1 chamada/minuto, 3 em 24 horas, uma simultânea, até 2.000
            tokens, sem repetição. Pode gerar custo mesmo se falhar. O mesmo
            modelo pode compartilhar erros do gerador.
          </p>
          {(review?.aiReports.length ?? 0) >= 10 && (
            <p>
              Este diagnóstico já preserva dez propostas assistidas. Novas
              solicitações estão bloqueadas para evitar descarte de registros.
            </p>
          )}
          {!available && (
            <p>
              Desativada neste ambiente. A conferência e a correção manual
              funcionam sem IA.
            </p>
          )}
          <label className="block">
            Código de acesso à verificação
            <input
              type="password"
              autoComplete="off"
              maxLength={256}
              className={inputClass}
              value={access}
              onChange={(e) => setAccess(e.target.value)}
              disabled={disabled}
            />
          </label>
          <label className="block">
            Onde preciso de uma sugestão?
            <select
              className={inputClass}
              value={target}
              disabled={disabled}
              onChange={(e) => setTarget(e.target.value)}
            >
              <option value="objective">Cobertura do objetivo</option>
              {diagnosis.pedagogy?.competencies.map((_, i) => (
                <option key={i} value={`competencies.${i}`}>
                  Competência {i + 1}
                </option>
              ))}
              {diagnosis.pedagogy?.questions.map((_, i) => (
                <option key={i} value={`questions.${i}`}>
                  Pergunta {i + 1}
                </option>
              ))}
              <option value="hypotheses">Hipóteses</option>
              <option value="constraints">Restrições</option>
              <option value="knowledgeCurse">Pressupostos ocultos</option>
            </select>
          </label>
          <label className="flex gap-2">
            <input
              type="checkbox"
              disabled={disabled}
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            Autorizo o envio dos dados desta revisão e o custo de uma única
            chamada de verificação ou sugestão.
          </label>
          <div className="flex flex-wrap gap-3">
            {(
              [
                ["verify", "Verificar consistência com IA"],
                ["suggest", "Solicitar sugestão de melhoria"],
              ] as const
            ).map(([purpose, label]) => (
              <button
                key={purpose}
                type="button"
                disabled={
                  disabled ||
                  !available ||
                  !current ||
                  !diagnosis.pedagogy ||
                  (review?.aiReports.length ?? 0) >= 10 ||
                  !consent ||
                  !access.trim()
                }
                onClick={() => request(purpose)}
                className="rounded border border-indigo-300 p-2 disabled:opacity-50"
              >
                {label}
              </button>
            ))}
          </div>
          {message && <p>{message}</p>}
        </div>
      </details>
      {!!review?.aiReports.length && (
        <details>
          <summary>
            Propostas de verificação preservadas ({review.aiReports.length})
          </summary>
          {review.aiReports.map((r, i) => (
            <article key={i} className="mt-3 rounded bg-white p-3 text-sm">
              <p>
                Proposta assistida {i + 1} · {r.model} ·{" "}
                {r.sourceSnapshot === assistedSnapshot(diagnosis, discovery)
                  ? "mesma versão do diagnóstico"
                  : "versão anterior — revisar novamente"}
              </p>
              {r.output.findings.map((f, j) => (
                <div key={j}>
                  <strong>{f.issue}</strong>
                  <p>{f.reason}</p>
                  <p>Sugestão: {f.suggestion}</p>
                  <p>Incerteza: {f.uncertainty}</p>
                </div>
              ))}
              <p>Limitações: {r.output.limitations}</p>
            </article>
          ))}
        </details>
      )}
      <p className="text-sm">
        O registro ao iniciar a conferência permanece preservado, além da
        proposta original do modelo quando disponível. Use “Salvar revisão” para
        preservar esta conferência. Após conferir também a rubrica do
        diagnóstico, use a aprovação humana. A revisão para piloto é um registro
        adicional e não uma garantia de eficácia.
      </p>
    </section>
  );
}
