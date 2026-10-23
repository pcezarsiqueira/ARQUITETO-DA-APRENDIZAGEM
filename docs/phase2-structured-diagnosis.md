# Diagnóstico pedagógico estruturado — Fase 2, contrato 2

## Escopo e estado

Implementação na branch de desenvolvimento, sem alterar main, publicar ou iniciar Fase 3. Não foram feitas novas chamadas pagas. A única resposta real anterior permanece intacta. O novo contrato e as instruções ainda exigem um segundo teste real expressamente autorizado; a revisão técnica de referência não é uma nova resposta da OpenAI.

## Contrato e fundamentação

`pedagogical-analysis.ts` define um JSON Schema estrito para Structured Outputs e um schema de rascunho para edição/persistência. O servidor extrai fatos diretamente da descoberta. O modelo não pode preencher um campo livre de fatos. Todo item interpretativo que exige fundamentação deve citar campo e trecho literal não vazio da descoberta; citações inventadas são rejeitadas antes de entregar a proposta. Uma citação válida não demonstra pertinência causal: isso continua sujeito à revisão humana.

- Conhecimentos prévios: informado pelo especialista ou não verificado. A marca de informado exige citação do campo de conhecimentos prévios, não inferência a partir de cargo/público. Informação do especialista não equivale a observação empírica.
- Hipóteses: pressuposto oculto, lacuna de conhecimento, lacuna de habilidade, barreira cognitiva ou comportamental; sustentação identificada ou inferência fraca; justificativa, incerteza e pergunta de verificação obrigatórias.
- Restrições: tempo, modalidade, recursos e planejamento em grupo próprio, com efeito no planejamento.
- Competências: ação, condição, evidência, critério, justificativa do critério, relação com objetivo, viabilidade e sua justificativa, além da base informada. Falta de evidência ou viabilidade não confirmada impede aprovação, mas não impede salvar rascunho.
- Perguntas: informação faltante, necessidade, decisão afetada, mudança possível e prioridade. A decisão deve se referir a objetivos, pré-requisitos, atividades ou avaliação.
- Maldição do conhecimento: familiaridade, jargões, salto de raciocínio, etapa omitida e conhecimento tácito. Cada manifestação possível exige exemplo ligado ao conteúdo, fundamento, motivo para não tratá-la como comprovada e pergunta de verificação. Não há obrigação de inventar um item de cada tipo.

As listas são limitadas (4 conhecimentos, 6 hipóteses, 4 restrições, 4 competências, 5 perguntas, 5 manifestações). Campos de geração limitados a 700 caracteres, justificativa geral a 1.400; até 6.000 tokens de saída, timeout de 90 segundos, sem retry automático. Esses limites substituem 3.000/45 da versão anterior e devem ser considerados antes de autorizar o próximo teste pago.

## Compatibilidade e autoria

O envelope local `arquiteto.projects.v1` permanece. Diagnósticos anteriores continuam aceitos, exibidos e editáveis no modo anterior; a aplicação não os converte ao carregar nem grava mudanças automaticamente. A função pura `adaptLegacyDiagnosis` é acionada pelo botão “Organizar registro antigo, sem IA”. Ela preserva o texto, deixa evidências/critérios ausentes em branco, identifica sustentação não verificada e marca a origem como adaptação técnica. Campos como decisão/prioridade usam valores iniciais de edição, não conclusões inferidas; os campos explicativos ficam vazios e a aprovação exige revisão.

O rascunho admite itens/textos antigos maiores que o contrato novo, sem truncar nem apagar. A aprovação exige adequação aos limites do novo contrato. A adaptação só se torna o diagnóstico atual quando o especialista salva; o diagnóstico anterior entra no histórico. Mapas e entregáveis não são alterados. O código não inventa critérios para fazer migração parecer completa.

`pedagogy` é a representação estruturada atual. `analysis` permanece como projeção textual de compatibilidade. `pedagogyOrigin` distingue nova geração de adaptação técnica. Para novas gerações V2, `generatedPedagogy` preserva o objeto recebido antes das edições, independentemente da proposta corrente. Rejeições removem o item da proposta, mas preservam seu conteúdo em `rejectedItems`. Nenhuma proposta é salva sobre alterações humanas sem a ação explícita do usuário; a confirmação de descarte anterior permanece.

A aprovação registra revisão dos sete critérios e justificativa humana. Edição ou mudança da descoberta retira aprovação e confirmação anteriores. A revisão é local e declarada pelo usuário; ainda não há identidade individual autenticada. Aprovar não converte hipótese em fato nem comprova aprendizagem.

## Rubrica verificável, sem pontuação de eficácia

| Dimensão            | Verificação automatizada                                                                                                             | Julgamento que continua humano                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Fundamentação       | Campos/trechos presentes e pertencentes à descoberta; justificativa e incerteza registradas                                          | O trecho realmente sustenta a conclusão? Há explicações alternativas?                          |
| Fatos e inferências | Categorias distintas; fonte de conhecimento confirmado; sinais de tempo/recurso em barreiras e de certeza emocional na justificativa | A linguagem respeita a incerteza em todo o texto? A classificação é pertinente?                |
| Observabilidade     | Ação, condição e evidência preenchidas; sinais de verbos mentais/ações amplas                                                        | Uma pessoa conseguiria observar o comportamento sem adivinhar intenção?                        |
| Critérios           | Critério e justificativa presentes; números comparados com tokens numéricos informados, sem confundir 6 com 60                       | O critério distingue desempenho suficiente? Número proposto tem fundamento local justificável? |
| Perguntas           | Informação, necessidade, decisão, mudança e prioridade explícitas                                                                    | A pergunta altera a decisão ou apenas repete algo já conhecido?                                |
| Pressupostos        | Exemplo, base e motivo para não tratar a ocorrência como comprovada                                                                  | O exemplo é plausível, útil e específico, ou é uma inferência indevida?                        |
| Viabilidade         | Relação com objetivo, restrições e situação de viabilidade declaradas                                                                | Cabe no tempo e nos recursos? É adequado ao público, sem ampliar o objetivo?                   |

Os estados são “estrutura conferida” e “revisar”, sempre acompanhados de justificativa e pergunta para revisão humana. Não há porcentagem, nota de qualidade, previsão de retenção ou escore de eficácia. Heurísticas de linguagem podem produzir falsos positivos/negativos. Palavras como medo podem aparecer legitimamente em uma hipótese; a regra exige atenção humana, não diagnóstico automático.

Pendências objetivas (campo obrigatório, trecho inexistente, conhecimento confirmado sem fonte, ausência de competência ou viabilidade pendente) impedem aprovação. Alertas semânticos não se resolvem por uma nota automática: o especialista deve revisar e justificar. O software não consegue verificar se a pessoa de fato realizou uma revisão cuidadosa.

## Validação offline e próxima análise real

`npm run evaluate:pedagogy` gera `docs/validation/phase2/rubric-comparison-v2.json` usando somente os registros preservados. A comparação usa adaptação incompleta do original apenas para aplicar as regras e não modifica o original. O caso revisado é de autoria técnica, identificado no arquivo e no relatório.

Os testes incluem os defeitos reais: medo inferido com certeza, tempo operacional em barreiras, competência ampla sem evidência, critério percentual sem fonte, perguntas sem decisão, citações inventadas, confirmação de conhecimento baseada apenas no cargo e migração sem perda. O SDK é testado com transporte controlado, não com chamadas pagas.

O roteiro `verify-live-diagnosis.mjs` agora exige a autorização operacional específica `one-analysis-v2` e uma marca de tentativa nova para V2. A autorização anterior `one-analysis` não é reutilizável. O registro e a marca da primeira geração são preservados. Sem nova autorização humana explícita, não habilitar essa execução. O roteiro preserva a resposta antes da revisão, não repete chamadas, e testa o mecanismo de aprovação sem substituir a aprovação pedagógica do responsável.

## Evidência real V2 e limites constatados

Uma geração V2 expressamente autorizada foi concluída e preservada em [validation/phase2/v2-real/report.md](validation/phase2/v2-real/report.md). A marca de tentativa foi consumida e não pode ser removida para repetir o teste. A rubrica registrou sete verificações de estrutura, mas a inspeção substantiva encontrou competência sem cobertura de acordos, viabilidade baseada em plano não informado e pergunta que presume treinamento anterior. Esses contraexemplos têm regressões determinísticas; não se apresenta correspondência de palavras como solução geral de compreensão semântica. Aprovação pedagógica integral ainda não recomendada; sem avanço à Fase 3.
