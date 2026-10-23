# Consistência pedagógica e critérios da Fase 2

## Decisão

A consistência passa a ser uma camada independente da geração. Não se acrescentou texto ao prompt do diagnóstico para tentar resolver toda a avaliação. O novo mecanismo combina relações explícitas confirmadas por pessoas, verificações determinísticas e alertas conservadores; uma revisão assistida por IA é opcional e desativada por padrão. Conformidade estrutural não equivale a qualidade pedagógica ou eficácia demonstrada.

## Módulos

- `pedagogical-engine/consistency/contracts.ts`: contratos Zod de capacidades, relações, decisões humanas e propostas assistidas.
- `pedagogical-engine/consistency/engine.ts`: extração de candidatos, cobertura registrada, alertas, investigação contextual e critérios de revisão para piloto. Funções puras, sem rede.
- `modules/diagnosis/components/consistency-panel.tsx`: interface de rastreabilidade, correção orientada e revisão humana.
- `server/pedagogical-review.ts` e `app/api/pedagogical-review/route.ts`: verificação/sugestão opcional, com fronteira de servidor, contrato de saída próprio e limites separados do gerador.

Mapas e entregáveis permanecem separados e não foram desenvolvidos. Este módulo confere o diagnóstico da Fase 2; não implementa a Fase 3 ou o módulo futuro de validação de entregáveis.

## Capacidades expressas no objetivo

A regra propõe candidatos separando orações coordenadas por infinitivos, quebras de linha e ponto e vírgula em português. Qualidades expressas no caso conhecido — específica, respeitosa, orientada a acordos — podem virar capacidades distintas, preservando os demais resultados. Cada candidato conserva um trecho literal do objetivo. Na ausência de uma separação confiável, mantém-se o objetivo inteiro para decomposição manual; mais de vinte partes também usam esse fallback, sem truncar o objetivo.

A interface permite editar, remover e acrescentar capacidades; exige confirmação humana de que a lista contempla o objetivo. Não se afirma extração semântica completa para qualquer assunto ou construção gramatical. A revisão opcional pode ajudar a identificar omissões, sem assumir decisões do especialista.

## O que conta como relação registrada

Cada capacidade relaciona-se a uma competência, a um trecho literal da evidência, a um trecho literal do critério e a uma explicação humana do vínculo. A condição da competência deve estar preenchida. Os trechos precisam existir nos campos correspondentes. Repetir exatamente o objetivo, a capacidade ou a ação como evidência/critério, ou duplicar evidência e critério, não conclui a cobertura.

Mesmo trechos válidos e diferentes só recebem o estado **relação conferida por pessoa** após avaliação explícita e justificativa. Nenhuma interseção de palavras ou limiar de similaridade aprova cobertura. É possível marcar ausência, parcialidade e pendência. A justificativa de manter um diagnóstico não elimina uma capacidade sem relação demonstrada. O motor verifica o registro e suas fontes, não se a pessoa interpretou corretamente o significado.

A descoberta, os fatos e a análise formam um snapshot completo. Mudança de conteúdo invalida relações/decisões para conclusão do piloto, sem apagá-las. Alterar o próprio mapeamento invalida a atualidade de propostas assistidas anteriores. A atualização da conferência é uma ação explícita; a versão salva anterior continua no histórico e o registro inicial fica preservado em `originalRecord`.

## Verificações e limites

| Verificação | Natureza | Limite |
|---|---|---|
| Campo obrigatório, relação ausente, trecho inexistente, objetivo sem descrição | Determinística | Não interpreta o sentido da relação. |
| Evidência idêntica ao objetivo/ação ou ao critério | Determinística conservadora | Pode exigir reformulação de um trecho curto legítimo; não determina qualidade por si só. |
| Duração mencionada na condição maior que duração informada | Comparação numérica | O revisor deve conferir se os períodos se referem à mesma atividade; esclarecer o texto quando forem períodos distintos. |
| Viabilidade sem restrições ou com afirmações genéricas/planejamento não informado | Alerta por padrão de linguagem | Não calcula cronograma nem conhece tamanho da turma; pode gerar falso positivo ou deixar passar outra formulação. |
| Pergunta que pressupõe treinamento/aprendizado anterior não descrito | Alerta por padrão de linguagem | Uma pergunta de sondagem pode ser legítima; falta interpretação contextual. |
| Mediação de conflitos fora do objetivo, restrição digital/grupo inferida, causa emocional apresentada como fato | Casos conhecidos e alertas conservadores | Não cobre toda ampliação de escopo nem toda inferência sem suporte. |
| Qualificadores como claro, adequado, respeitoso, corretamente | Alerta, nunca reprovação automática | Um critério pode conter qualificadores e indicadores concretos ao mesmo tempo. |
| Fatos editados sem correspondência literal na descoberta | Alerta de origem | Uma explicação humana pode ser válida; pede fonte/justificativa. |
| Objetivo com acordos e sem sinais usuais na evidência/critério | Alerta contextual do caso conhecido | Sinais lexicais não provam presença ou ausência semântica. Repetir “acordo” jamais aprova cobertura automaticamente. |

Os alertas têm identificação estável, motivo, distinção entre informação objetiva e heurística e orientação de correção. As regras não são apresentadas como entendimento universal de linguagem ou diagnóstico de pessoas.

## Maldição do conhecimento

A investigação oferece perguntas de familiaridade diante de qualificadores, de termos/siglas presentes na descoberta e de passos, decisões intermediárias e sinais tácitos em ações como configurar, testar, calcular e negociar acordos. Cita o trecho que motivou a investigação. São perguntas para o especialista, não ocorrências comprovadas. Nenhuma categoria é obrigatória e não se inventam jargões ausentes. Outros termos e construções exigem julgamento humano ou ajuda opcional do revisor assistido.

## Correção e aprovação

O usuário pode corrigir os campos normais do diagnóstico, solicitar uma proposta assistida específica, manter um alerta com justificativa ou registrá-lo como pendente de investigação. “Corrigi” não esconde um alerta que a regra ainda encontra: é preciso conferir novamente, corrigir o texto ou registrar decisão explícita. Pendências de cobertura ou estrutura impedem revisão concluída para piloto. Alertas heurísticos podem ser mantidos ou investigados com justificativa, desde que as limitações sejam registradas e o desempenho esteja relacionado.

A aprovação textual anterior do diagnóstico continua compatível e não é promovida automaticamente a revisão para piloto. O novo indicador exige: conferência atual, capacidades confirmadas, relações de desempenho justificadas, ausência de bloqueios objetivos da rubrica, decisões sobre alertas, investigação contextual registrada, aprovação humana do diagnóstico com as sete dimensões e declaração das condições/limitações do piloto. Uma edição retira a aprovação textual e impede a prontidão para piloto até nova revisão. A avaliação do próprio sistema é operacional, não substitui a decisão pedagógica de uma pessoa.

## Compatibilidade e preservação

`Diagnosis.consistency` é opcional no envelope atual de persistência. Registros antigos permanecem legíveis sem migração silenciosa. A conferência pode ser iniciada sem rede; legados sem evidência estruturada precisam de adaptação explícita já existente. `generatedPedagogy` mantém a saída V2 original. `originalRecord` guarda a cópia ao iniciar a conferência e é conservado ao atualizar, independentemente do histórico limitado a dez versões. Ele não reconstrói versões perdidas antes de sua criação. As duas respostas reais do repositório também continuam intactas, com hashes verificados.

No máximo dez propostas assistidas ficam preservadas por diagnóstico; a interface bloqueia novas solicitações ao atingir esse limite em vez de descartar propostas. Não há aplicação automática de sugestões. A persistência continua no navegador; falhas de quota mantêm a edição aberta e informam o problema. Não há sincronização multiusuário ou armazenamento transacional nesta fase.

## Verificação assistida opcional — operação técnica

Não habilitada nem chamada nesta execução. A configuração no servidor usa:

- `PEDAGOGICAL_REVIEW_ENABLED=true` para habilitação explícita; ausente/false mantém indisponível mesmo se o gerador tiver chave.
- `PEDAGOGICAL_REVIEW_ACCESS_TOKEN`, código próprio de pelo menos 32 caracteres, separado do diagnóstico.
- A mesma chave exclusivamente de servidor `AI_PROVIDER_API_KEY`/`OPENAI_API_KEY`, com `OPENAI_REVIEW_MODEL` próprio (padrão gpt-4.1-mini).
- Consentimento explícito de envio e custo para **cada** verificação ou sugestão; é consumido a cada tentativa, sem repetição automática.

Orçamento independente por processo: uma chamada/minuto, três em 24h, uma simultânea, máximo de 2.000 tokens de saída, timeout de 45s e zero retentativas. Verificação e sugestão compartilham esse orçamento próprio. Falhas consomem quota. Limites não são teto financeiro garantido, nem persistem após reiniciar o processo; ainda não servem para serviço público distribuído.

O corpo é limitado a 60.000 bytes durante leitura, validado por Zod, com autenticação de código, JSON e origem exata antes de adquirir quota/chamar o provedor. Envia apenas descoberta, fatos atuais, análise estruturada e relações — nunca histórico, credenciais, mapas ou entregáveis. O conteúdo é dado não confiável em mensagem separada das instruções; não há ferramentas ou execução. Saída estrita inclui alvo, problema, motivo, sugestão e incerteza, validando que o alvo pertence à revisão e, para sugestão específica, ao alvo pedido. Erros não expõem payloads/segredos. `store:false` não equivale a retenção zero pelo provedor.

As propostas são exibidas e persistidas separadamente. A pessoa decide o que copiar/editar e justificar. Não há alteração automática nem aprovação automática. Mesmo outro prompt ou modelo pode compartilhar erros do gerador: “separado” descreve arquitetura e finalidade, não independência epistemológica.

A habilitação é responsabilidade técnica após autorização apropriada; o idealizador não precisa configurar arquivos ou operar comandos. Nesta entrega tudo continua disponível pelo caminho manual sem chave da IA revisora.

## Critérios de conclusão para piloto assistido

1. Funcionamento técnico aprovado nas verificações disponíveis.
2. Diagnóstico e revisão persistentes.
3. Rastreabilidade entre objetivo, competências e evidências/critério.
4. Identificação de lacunas de cobertura nos casos conhecidos.
5. Tratamento explícito de incertezas e informações insuficientes.
6. Revisão humana obrigatória e editável.
7. Ausência de falhas críticas conhecidas na jornada principal testada.
8. Limitações pedagógicas documentadas.

Esses critérios permitem recomendar piloto **assistido**, sem qualidade universal, eficácia de aprendizagem demonstrada ou prontidão comercial. Cada projeto continua exigindo revisão própria. Os diagnósticos reais anteriores não são aprovados retroativamente. O módulo opcional de IA não é pré-requisito do piloto manual e sua integração real permanece não testada.

## Reprodução sem custo

`npm run evaluate:consistency` registra os dois diagnósticos reais e quatro casos adicionais de redes, circuitos elétricos, SQL e leitura crítica em `docs/validation/phase2/consistency-evaluation.json`. A CI confere reprodução exata. Testes de domínio incluem repetição enganosa, evidência inventada, alteração de versão, duração/recurso incompatível, pendências e decisões. Testes de navegador desktop/celular exercitam rastreabilidade, aprovação explícita, invalidação, reabertura e sugestão com transporte controlado. Nenhum desses testes comprova comportamento real da nova integração de IA.
