# Fase 2 — relatório executivo da camada de consistência

## Resultado

O sistema ganhou uma conferência independente do gerador. O usuário pode identificar os resultados esperados no objetivo e mostrar, para cada um, a competência, a evidência e o critério que o tornam verificável. A aplicação pede que a pessoa explique a relação; repetir palavras não aprova a cobertura.

No exemplo de feedback, “ser específico”, “ser respeitoso” e “orientar a conversa a acordos” aparecem separadamente. A omissão de acordos no segundo diagnóstico real passa a gerar um alerta próprio e uma pendência de relação. Não foi necessário gerar outra resposta para descobrir ou registrar esse problema.

## O que funciona para a pessoa

- Conferir e ajustar a separação do objetivo em resultados esperados.
- Relacionar cada resultado ao desempenho e explicar por que a relação faz sentido.
- Ver lacunas, informações insuficientes, critérios vagos e possíveis exageros ou pressuposições.
- Corrigir o diagnóstico, manter uma interpretação com justificativa ou registrar o que precisa investigar.
- Examinar o que pode parecer óbvio para quem já sabe: termos, etapas, decisões intermediárias e sinais tácitos, somente quando pertinentes.
- Salvar, reabrir e revisar decisões; mudanças no conteúdo exigem nova conferência.
- Registrar revisão para piloto assistido após a revisão humana do diagnóstico e das relações. Aprovações antigas não recebem esse estado automaticamente.

Os textos originais permanecem preservados. A aprovação não afirma que o público aprendeu: apenas registra que uma pessoa conferiu o planejamento e suas limitações.

## O que a conferência encontrou nos registros reais

| Registro | Problemas sinalizados |
|---|---|
| Primeiro diagnóstico real | Ausência de evidências estruturadas/rastreabilidade; explicação emocional com certeza indevida; tempo da oficina misturado com barreira do aprendiz. |
| Segundo diagnóstico real V2 | Acordos sem demonstração explícita; viabilidade apoiada em planejamento não informado; pergunta presumindo treinamento anterior; expansão para mediação; qualificadores de sucesso a esclarecer; restrição de recursos/grupos inferida sem base suficiente. |

Alguns são alertas conservadores, não veredictos automáticos. Por exemplo, um critério pode conter “respeitoso” e também ser concreto; cabe ao revisor conferir os indicadores. Também não se conclui cobertura por encontrar a palavra “acordo”. O detalhe reproduzível está em [consistency-evaluation.json](consistency-evaluation.json).

## Critérios de aceite e evidências

| Critério solicitado | Evidência disponível nesta entrega |
|---|---|
| 1. Funcionamento técnico | Lint, tipagem, build e testes automatizados; regressões da jornada existente preservadas. |
| 2. Persistência | Conferência, decisões e propostas controladas salvas e reabertas em desktop e celular. |
| 3. Rastreabilidade | Cada capacidade tem fonte no objetivo, competência, trechos de evidência/critério, justificativa e julgamento humano. |
| 4. Lacunas conhecidas | Os dois diagnósticos reais preservados foram avaliados offline; há casos para ausência de relação, repetição enganosa e omissão de acordos. |
| 5. Incertezas | Alertas distinguem comparação objetiva de suspeita por linguagem; pendências de investigação são explícitas. |
| 6. Revisão humana | Decomposição, relações, pressupostos, decisões e condições de piloto exigem confirmação editável; a revisão textual também permanece obrigatória. |
| 7. Jornada principal | Testes de navegador verificam aprovação, bloqueios, persistência e retirada de aprovação após edição; nenhuma falha crítica conhecida permanece nos fluxos testados. Isso não garante ausência de todo defeito. |
| 8. Limitações | Documentadas neste relatório e em [pedagogical-consistency.md](../../pedagogical-consistency.md). |

Além do feedback, os testes usam redes de computadores, circuitos elétricos, consultas SQL e leitura crítica. Foram exercitadas evidências diferentes do objetivo, critérios, fontes, prazos incompatíveis e conhecimentos implícitos. Esses casos são construídos offline: não são pesquisas nem novos resultados de IA.

## Verificação opcional por IA

Há uma etapa separada para pedir revisão de significado ou uma sugestão específica. Tem código de acesso, consentimento de custo e orçamento próprios. Continua **desativada**. O caminho manual funciona integralmente sem ela.

Nesta execução foram usados somente respostas gravadas e transportes controlados. **Nenhuma chamada real nova foi feita.** Logo, a conectividade e a qualidade real do novo revisor assistido ainda não foram validadas; os testes não são apresentados como validação externa. Uma autorização futura seria necessária para testá-lo com custo.

O revisor assistido também pode errar. O módulo não usa sua resposta como aprovação final e não substitui alterações humanas.

## Recomendação de conclusão da Fase 2

Recomendo considerar a Fase 2 **tecnicamente preparada para piloto assistido do diagnóstico e da revisão manual**, conforme os oito critérios definidos pelo responsável. Essa recomendação é restrita à aplicação local, com acompanhamento e conferência humana de cada projeto. Os resultados reais anteriores continuam contendo lacunas e não estão pedagogicamente aprovados por essa mudança.

Não se afirma qualidade universal, eficácia de aprendizagem demonstrada ou prontidão comercial. A separação automática de objetivos e os alertas têm limites linguísticos; a pessoa precisa conferir significado e completude. Persistência continua local ao navegador, sem sincronização e sem autenticação individual.

A decisão não autoriza publicar, integrar à main, contratar serviços, fazer outra chamada paga ou iniciar a Fase 3. Nenhuma dessas ações foi realizada.

## Verificações finais

Lint, tipagem, build, 44 testes de domínio/integração e 30 testes de navegador em desktop e celular passaram. As avaliações pedagógica e de consistência foram executadas offline e são reproduzíveis. Os testes do revisor opcional usam transporte controlado, sem custo. A evidência dos dois testes reais permanece nos respectivos arquivos originais, sem alterações.
