# Comparação pedagógica — original real e revisão técnica V2

## O que é IA real e o que é correção técnica

O arquivo `diagnosis-original.json` contém o diagnóstico recebido na única geração real autorizada, com o contrato anterior. Seu hash continua conferido por teste. Ele não foi reescrito, completado ou apagado.

`technical-revision-v2.json` foi elaborado nesta implementação a partir desse registro e do relatório crítico. **Não é uma nova resposta da OpenAI.** As sugestões de ação, evidência, critérios e perguntas são uma revisão técnica para teste e para posterior avaliação do responsável pedagógico. Não representam observação de gestores reais. A interface identifica essa origem como adaptação técnica.

Nenhuma nova chamada paga foi realizada. O contrato/instruções novos foram testados com respostas controladas e casos conhecidos, sem afirmar que o modelo já produz essa qualidade consistentemente.

## Antes e depois

| Aspecto                  | Diagnóstico original da IA                                                                    | Revisão técnica estruturada                                                                                     |
| ------------------------ | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Conhecimentos prévios    | “Conhecimento das rotinas” aparece entre possíveis conhecimentos, embora tenha sido informado | Separa informação do especialista de pré-requisito não verificado e exige trecho de origem                      |
| Inferência emocional     | “O medo de conflitos [...] aponta barreiras” na justificativa                                 | Evitação admite causas alternativas; desconforto aparece como inferência fraca e não como fato psicológico      |
| Tempo                    | “Limitação do tempo [...] (60 minutos)” em barreiras de aprendizagem                          | Tempo vai para restrições do planejamento, com efeito sobre a amplitude do objetivo                             |
| Competência              | “Conduzir uma conversa [...] específica e respeitosa”                                         | Ação e condição observáveis, evidência, critério, justificativa, vínculo com objetivo e viabilidade             |
| Amplitude                | “Reconhecer e manejar situações de conflito no ambiente de trabalho”                          | Não presume domínio geral de conflitos numa oficina curta; preserva esse texto no original para revisão         |
| Perguntas                | Expectativas e diversidade sem explicitar efeito na decisão                                   | Cada pergunta indica informação faltante, necessidade, decisão afetada, mudança possível e prioridade           |
| Maldição do conhecimento | Lista de pressupostos sem exemplo ou investigação detalhada                                   | Cinco manifestações possíveis com exemplos vinculados ao conteúdo e motivo para não afirmá-las como comprovadas |
| Avaliação                | Dependia de ler as listas e inferir sua suficiência                                           | Rubrica de sete dimensões com verificações objetivas e limites explícitos do que depende de julgamento humano   |

## Exemplo revisado: competência que pode ser verificada

**Ação:** descrever o atraso com situação e comportamento observáveis, sem atribuir intenção.

**Condição:** durante ensaio em duplas, com o caso fictício de entrega atrasada e roteiro impresso.

**Evidência:** fala na simulação e registro do observador no roteiro.

**Critério:** a descrição identifica o episódio e o comportamento, sem rótulos pessoais ou atribuição de intenção.

**Justificativa:** torna verificável a especificidade e reduz julgamentos sobre a pessoa; não invoca porcentagens nem um padrão científico universal.

**Relação com objetivo:** contribui para uma conversa específica, respeitosa e orientada a acordos.

**Viabilidade proposta:** ação delimitada, observável com os recursos informados. A distribuição do tempo e a adequação ao público ainda exigem julgamento do responsável. “Viável” é aqui uma apreciação técnica de planejamento, não resultado empírico da oficina.

## Exemplo revisado: pergunta que modifica decisão

**Pergunta:** ao reformular um julgamento sobre uma entrega atrasada, que parte os gestores encontram mais difícil?

**Falta saber:** se conseguem distinguir comportamento observado e interpretação.

**Por que importa:** a dificuldade informada não revela qual habilidade intermediária falta.

**Decisão afetada:** pré-requisitos.

**Mudança possível:** se a distinção não estiver disponível, explicitá-la antes de exigir uma conversa completa.

**Prioridade proposta:** alta, pois pode mudar o ponto de partida. Essa prioridade também é editável e deve ser revista pelo especialista.

## Maldição do conhecimento: possibilidades, não ocorrências comprovadas

- Familiaridade: presumir que “feedback construtivo” tem critérios compartilhados.
- Jargão/expressão não explicada: “orientada a acordos” pode exigir exemplos.
- Salto: passar do atraso observado ao acordo sem tornar a escuta explícita.
- Etapa omitida: reformular um julgamento em descrição de comportamento.
- Saber tácito: “respeitosa” pode esconder critérios óbvios para quem já sabe, como ouvir antes de atribuir intenção.

Todos os exemplos derivam de termos/caso informados e incluem incerteza. Não há registro de uma aula dada ou de resposta de aprendiz que comprove essas dificuldades. A rubrica não obriga inventar exemplos se outro projeto não fornecer base.

## Resultado da avaliação offline

O original continua legível. Sua adaptação automática deixa evidências e critérios ausentes em branco e bloqueia aprovação incompleta. A rubrica aponta os problemas conhecidos em vez de preenchê-los como se fossem IA.

A revisão técnica de referência preenche o contrato e passa pelas verificações estruturais. **Isso não é aprovação pedagógica integral.** Correspondência literal de fonte não prova relação causal; campos preenchidos não provam bons critérios; a confirmação da revisão pelo usuário não prova atenção nem qualificação. O arquivo `rubric-comparison-v2.json` registra justificativas e perguntas de revisão humana, sem nota ou previsão de aprendizagem.

## Preparação para o segundo teste

O sistema está preparado tecnicamente para um segundo teste expressamente autorizado, usando o contrato V2 e a mesma descoberta fictícia. Não foi executado. O próximo teste deverá avaliar se o modelo, sem receber a revisão técnica como resposta pronta, produz competências verificáveis, hipóteses calibradas, restrições separadas e perguntas decisivas. Depois será necessário testar revisão, rejeição/complementação, aprovação e persistência com esse resultado efetivamente novo.

Até essa validação, manter o PR em rascunho, a main intacta e a Fase 3 não iniciada. Não há necessidade de o idealizador executar comandos, editar arquivos ou revisar código.

## Verificações executadas nesta revisão

Passaram lint, tipagem, build, 31 testes de domínio/integração e 22 testes de navegador em desktop e celular. A rubrica offline foi regenerada e a auditoria de dependências de produção não reportou vulnerabilidades. Há regressões específicas para o diagnóstico real, fontes inventadas, falsa confirmação por cargo, campos ausentes, números sem fonte, migração de textos longos, legado demonstrativo sem metadados, rejeição/complementação, confirmação humana, persistência e impossibilidade de reutilizar a autorização da primeira análise.

Nenhuma geração nova foi usada para obter esses resultados. A validação do comportamento efetivo do modelo com o contrato V2 continua pendente de autorização e teste real.
