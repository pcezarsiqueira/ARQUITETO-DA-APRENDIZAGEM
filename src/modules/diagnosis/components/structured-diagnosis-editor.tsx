"use client";
import type { Discovery } from "@/domain/models";
import {
  analysisSections,
  discoveryFields,
  pedagogicalDraftSchema,
  type PedagogicalAnalysis,
  type AnalysisSection,
} from "@/domain/pedagogical-analysis";
import { rubricLabels, type RubricReport } from "@/domain/diagnosis-rubric";
type Field = { key: string; label: string; options?: [string, string][] };
const common: Field[] = [
  { key: "rationale", label: "Por que essa ideia faz sentido?" },
];
const definitions: Record<
  AnalysisSection,
  {
    title: string;
    singular: string;
    hint: string;
    fields: Field[];
    empty: object;
    max: number;
  }
> = {
  priorKnowledge: {
    title: "O que o público já sabe",
    singular: "Conhecimento prévio",
    hint: "Informado pelo especialista não significa observado em alunos reais. O que não foi informado continua a verificar.",
    max: 4,
    fields: [
      { key: "statement", label: "Conhecimento ou habilidade anterior" },
      {
        key: "status",
        label: "Como sabemos disso?",
        options: [
          ["reported_by_specialist", "Informado pelo especialista"],
          ["unverified", "Ainda não verificado"],
        ],
      },
      ...common,
      { key: "validationQuestion", label: "Como confirmar esse conhecimento?" },
    ],
    empty: {
      statement: "",
      status: "unverified",
      basis: [],
      rationale: "",
      validationQuestion: "",
    },
  },
  hypotheses: {
    title: "Ideias a verificar sobre a aprendizagem",
    singular: "Hipótese",
    hint: "Uma hipótese tem base e incerteza. Uma inferência fraca precisa de mais cuidado; evitar uma conversa não comprova medo.",
    max: 6,
    fields: [
      { key: "statement", label: "Ideia a verificar" },
      {
        key: "category",
        label: "Que tipo de dificuldade ou pressuposto?",
        options: [
          ["hidden_assumption", "Algo que estamos presumindo"],
          ["knowledge_gap", "Possível lacuna de conhecimento"],
          ["skill_gap", "Possível habilidade a desenvolver"],
          ["cognitive_barrier", "Possível dificuldade para compreender"],
          ["behavioral_barrier", "Possível dificuldade para agir"],
        ],
      },
      {
        key: "support",
        label: "Força da sustentação",
        options: [
          ["grounded_hypothesis", "Hipótese com base identificada"],
          ["weak_inference", "Inferência com pouca sustentação"],
        ],
      },
      ...common,
      { key: "uncertainty", label: "O que ainda não podemos afirmar?" },
      { key: "validationQuestion", label: "Que pergunta ajuda a verificar?" },
    ],
    empty: {
      statement: "",
      category: "hidden_assumption",
      support: "weak_inference",
      basis: [],
      rationale: "",
      uncertainty: "",
      validationQuestion: "",
    },
  },
  constraints: {
    title: "Limites do planejamento",
    singular: "Restrição",
    hint: "Tempo, modalidade e recursos limitam a oficina. Não são características psicológicas de quem aprende.",
    max: 4,
    fields: [
      { key: "statement", label: "Limite informado" },
      {
        key: "kind",
        label: "Tipo de limite",
        options: [
          ["time", "Tempo"],
          ["modality", "Modalidade"],
          ["resources", "Recursos"],
          ["planning", "Planejamento"],
        ],
      },
      {
        key: "effectOnPlanning",
        label: "O que esse limite muda no planejamento?",
      },
    ],
    empty: { statement: "", kind: "planning", basis: [], effectOnPlanning: "" },
  },
  competencies: {
    title: "O que o aprendiz precisa demonstrar",
    singular: "Competência",
    hint: "Exemplo: descrever um atraso sem rotular a pessoa. Evidência: fala na simulação. Critério: a descrição contém situação e comportamento observáveis, sem atribuir intenção.",
    max: 4,
    fields: [
      { key: "action", label: "Ação observável" },
      { key: "condition", label: "Quando e em que situação?" },
      { key: "performanceEvidence", label: "Como observar o desempenho?" },
      { key: "successCriterion", label: "O que conta como sucesso?" },
      {
        key: "criterionRationale",
        label: "Por que esse critério faz sentido?",
      },
      { key: "objectiveRelation", label: "Relação com o objetivo principal" },
      {
        key: "feasibility.status",
        label: "Cabe no contexto informado?",
        options: [
          ["feasible", "Viável, com justificativa"],
          ["needs_validation", "Precisa ser verificado"],
          ["not_feasible", "Não é viável neste contexto"],
        ],
      },
      { key: "feasibility.rationale", label: "Justificativa de viabilidade" },
    ],
    empty: {
      action: "",
      condition: "",
      performanceEvidence: "",
      successCriterion: "",
      criterionRationale: "",
      objectiveRelation: "",
      feasibility: { status: "needs_validation", rationale: "" },
      basis: [],
    },
  },
  questions: {
    title: "Perguntas que mudam decisões",
    singular: "Pergunta",
    hint: "Priorize perguntas cuja resposta altere objetivos, conhecimentos prévios necessários, atividades ou avaliação.",
    max: 5,
    fields: [
      { key: "question", label: "Pergunta ao especialista ou ao público" },
      { key: "missingInformation", label: "Qual informação falta?" },
      { key: "whyNeeded", label: "Por que precisamos saber?" },
      {
        key: "decisionImpact",
        label: "Qual decisão pode mudar?",
        options: [
          ["objectives", "Objetivos"],
          ["prerequisites", "Conhecimentos prévios necessários"],
          ["activities", "Atividades"],
          ["assessment", "Avaliação"],
        ],
      },
      { key: "decisionChange", label: "Como a resposta mudaria a decisão?" },
      {
        key: "priority",
        label: "Prioridade",
        options: [
          ["high", "Alta"],
          ["medium", "Média"],
          ["low", "Baixa"],
        ],
      },
    ],
    empty: {
      question: "",
      missingInformation: "",
      whyNeeded: "",
      decisionImpact: "objectives",
      decisionChange: "",
      priority: "medium",
    },
  },
  knowledgeCurse: {
    title: "O que pode parecer óbvio para quem já sabe",
    singular: "Pressuposto possível",
    hint: "Possível maldição do conhecimento: algo óbvio para o especialista pode precisar de explicação. Não é uma dificuldade comprovada do público.",
    max: 5,
    fields: [
      {
        key: "kind",
        label: "O que pode estar escondido?",
        options: [
          ["familiarity", "Familiaridade presumida"],
          ["jargon", "Termo sem explicação"],
          ["reasoning_jump", "Salto no raciocínio"],
          ["omitted_step", "Etapa omitida"],
          ["tacit_knowledge", "Conhecimento tácito"],
        ],
      },
      { key: "example", label: "Exemplo concreto ligado ao conteúdo" },
      ...common,
      {
        key: "whyUnconfirmed",
        label: "Por que isso ainda não está comprovado?",
      },
      {
        key: "clarifyingQuestion",
        label: "Como investigar sem presumir a resposta?",
      },
    ],
    empty: {
      kind: "familiarity",
      example: "",
      basis: [],
      rationale: "",
      whyUnconfirmed: "",
      clarifyingQuestion: "",
    },
  },
};
const sourceLabels: Record<keyof Discovery, string> = {
  subject: "Assunto",
  teach: "Objetivo informado",
  audience: "Público",
  priorKnowledge: "Conhecimentos prévios informados",
  difficulties: "Dificuldades informadas",
  experiences: "Exemplos",
  modality: "Modalidade",
  constraints: "Restrições",
};
function getValue(item: object, key: string): string {
  return key
    .split(".")
    .reduce<unknown>(
      (value, key) => (value as Record<string, unknown>)[key],
      item,
    ) as string;
}
function setValue(item: object, key: string, value: string): object {
  const clone = structuredClone(item) as Record<string, unknown>;
  const keys = key.split(".");
  const last = keys.pop()!;
  const target = keys.reduce(
    (target, k) => target[k] as Record<string, unknown>,
    clone,
  );
  target[last] = value;
  return clone;
}
export function StructuredDiagnosisEditor({
  analysis,
  discovery,
  disabled,
  onChange,
  onReject,
  rubric,
  reviewNote,
  reviewConfirmed,
  onReview,
}: {
  analysis: PedagogicalAnalysis;
  discovery: Discovery;
  disabled: boolean;
  onChange: (a: PedagogicalAnalysis) => void;
  onReject: (section: AnalysisSection, index: number) => void;
  rubric: RubricReport;
  reviewNote: string;
  reviewConfirmed: boolean;
  onReview: (note: string, confirmed: boolean) => void;
}) {
  function update(section: AnalysisSection, index: number, item: object) {
    const next = structuredClone(analysis);
    (next[section] as object[])[index] = item;
    onChange(pedagogicalDraftSchema.parse(next));
  }
  return (
    <div className="mt-5 space-y-6">
      {analysisSections.map((section) => {
        const def = definitions[section];
        return (
          <section
            key={section}
            aria-label={def.title}
            className="rounded-xl border border-stone-200 p-4"
          >
            <details
              open={section === "competencies" || section === "questions"}
            >
              <summary className="cursor-pointer font-semibold">
                {def.title} ({analysis[section].length})
              </summary>
              <p className="mt-2 text-sm leading-6 text-stone-500">
                {def.hint}
              </p>
              {analysis[section].length === 0 && (
                <p className="mt-3 text-sm text-stone-500">
                  Nenhum item proposto. Não preencha sem fundamento.
                </p>
              )}
              {analysis[section].map((item, index) => (
                <fieldset
                  key={index}
                  disabled={disabled}
                  className="mt-5 rounded-lg bg-stone-50 p-4"
                >
                  <legend className="text-sm font-semibold">
                    {def.singular} {index + 1}
                  </legend>
                  <div className="grid gap-4 md:grid-cols-2">
                    {def.fields.map((field) => (
                      <label key={field.key} className="block text-sm">
                        {field.label}
                        {field.options ? (
                          <select
                            value={getValue(item, field.key)}
                            onChange={(e) =>
                              update(
                                section,
                                index,
                                setValue(item, field.key, e.target.value),
                              )
                            }
                            className="mt-2 w-full rounded-lg border border-stone-300 bg-white p-2"
                          >
                            {field.options.map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <textarea
                            rows={3}
                            value={getValue(item, field.key)}
                            maxLength={700}
                            onChange={(e) =>
                              update(
                                section,
                                index,
                                setValue(item, field.key, e.target.value),
                              )
                            }
                            className="mt-2 w-full rounded-lg border border-stone-300 bg-white p-2"
                          />
                        )}
                      </label>
                    ))}
                  </div>
                  {"basis" in item && (
                    <div className="mt-4">
                      <p className="text-sm font-medium">
                        Trechos usados como base
                      </p>
                      <p className="mt-1 text-xs text-stone-500">
                        Um trecho dá contexto; você ainda precisa conferir se
                        ele sustenta a ideia.
                      </p>
                      {item.basis.map((ref, refIndex) => (
                        <fieldset
                          key={refIndex}
                          className="mt-3 rounded border border-stone-200 bg-white p-3"
                        >
                          <legend className="text-xs">
                            Trecho {refIndex + 1}
                          </legend>
                          <label className="block text-sm">
                            Origem do trecho
                            <select
                              value={ref.field}
                              onChange={(e) => {
                                const field = e.target.value as keyof Discovery;
                                const basis = [...item.basis];
                                basis[refIndex] = {
                                  field,
                                  quote: discovery[field].slice(0, 700),
                                };
                                update(section, index, { ...item, basis });
                              }}
                              className="mt-2 w-full rounded border border-stone-300 p-2"
                            >
                              {discoveryFields.map((field) => (
                                <option key={field} value={field}>
                                  {sourceLabels[field]}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="mt-3 block text-sm">
                            Trecho literal informado
                            <textarea
                              value={ref.quote}
                              rows={3}
                              maxLength={700}
                              onChange={(e) => {
                                const basis = [...item.basis];
                                basis[refIndex] = {
                                  ...ref,
                                  quote: e.target.value,
                                };
                                update(section, index, { ...item, basis });
                              }}
                              className="mt-2 w-full rounded border border-stone-300 p-2"
                            />
                          </label>
                          <details className="mt-2 text-xs text-stone-500">
                            <summary>Consultar conteúdo original</summary>
                            <p className="mt-2 whitespace-pre-wrap">
                              {discovery[ref.field] || "Não informado."}
                            </p>
                          </details>
                          <button
                            type="button"
                            onClick={() =>
                              update(section, index, {
                                ...item,
                                basis: item.basis.filter(
                                  (_, i) => i !== refIndex,
                                ),
                              })
                            }
                            className="mt-2 text-xs text-red-700"
                          >
                            Remover trecho {refIndex + 1}
                          </button>
                        </fieldset>
                      ))}
                      <button
                        type="button"
                        disabled={disabled || item.basis.length >= 3}
                        onClick={() =>
                          update(section, index, {
                            ...item,
                            basis: [
                              ...item.basis,
                              { field: "subject", quote: discovery.subject },
                            ],
                          })
                        }
                        className="mt-3 text-sm text-teal-800"
                      >
                        Adicionar trecho da descoberta
                      </button>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => onReject(section, index)}
                    className="mt-4 text-sm text-red-700"
                  >
                    Rejeitar {def.singular.toLowerCase()} {index + 1}
                  </button>
                </fieldset>
              ))}
              <button
                type="button"
                disabled={disabled || analysis[section].length >= def.max}
                onClick={() =>
                  onChange(
                    pedagogicalDraftSchema.parse({
                      ...analysis,
                      [section]: [
                        ...analysis[section],
                        structuredClone(def.empty),
                      ],
                    }),
                  )
                }
                className="mt-4 rounded-lg border border-stone-300 px-3 py-2 text-sm disabled:opacity-50"
              >
                Complementar: {def.singular.toLowerCase()}
              </button>
            </details>
          </section>
        );
      })}
      <section
        aria-label="Verificação pedagógica"
        className="rounded-xl bg-teal-50 p-5"
      >
        <h3 className="font-semibold">Conferência antes de aprovar</h3>
        <p className="mt-2 text-sm leading-6">
          As regras conferem estrutura e sinais de risco. Elas não provam a
          qualidade pedagógica nem a aprendizagem. Cada dimensão exige seu
          julgamento.
        </p>
        <ul className="mt-4 space-y-3">
          {rubric.findings.map((f) => (
            <li key={f.criterion} className="rounded-lg bg-white p-3 text-sm">
              <strong>
                {rubricLabels[f.criterion]} ·{" "}
                {f.status === "needs_review"
                  ? "Revisar"
                  : "Estrutura conferida"}
              </strong>
              <p className="mt-2">{f.justification}</p>
              <p className="mt-2 text-stone-600">
                Sua revisão: {f.humanJudgment}
              </p>
            </li>
          ))}
        </ul>
        {rubric.blocking.length > 0 && (
          <details className="mt-4 text-sm text-amber-900">
            <summary>
              Pendências que impedem aprovação ({rubric.blocking.length})
            </summary>
            <ul className="mt-2 list-disc pl-5">
              {rubric.blocking.map((text, i) => (
                <li key={i}>{text}</li>
              ))}
            </ul>
            <p className="mt-2">
              Você pode salvar o rascunho e completar depois.
            </p>
          </details>
        )}
        <label className="mt-4 block text-sm font-medium">
          Justificativa da sua revisão
          <textarea
            rows={3}
            disabled={disabled}
            value={reviewNote}
            maxLength={1400}
            onChange={(e) => onReview(e.target.value, reviewConfirmed)}
            placeholder="Explique por que as propostas atendem ao objetivo ou como você resolveu as ressalvas."
            className="mt-2 w-full rounded-lg border border-stone-300 bg-white p-3"
          />
        </label>
        <label className="mt-4 flex gap-3 text-sm leading-6">
          <input
            type="checkbox"
            disabled={disabled}
            checked={reviewConfirmed}
            onChange={(e) => onReview(reviewNote, e.target.checked)}
            className="mt-1"
          />
          Revisei as sete dimensões acima, incluindo as ressalvas, e registrei
          minha justificativa. Não estou confirmando aprendizagem real.
        </label>
      </section>
    </div>
  );
}
