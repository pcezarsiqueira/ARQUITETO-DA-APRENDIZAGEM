# Arquiteto da Aprendizagem

Transforme conhecimento especializado em experiências de aprendizagem estruturadas. O ponto de partida é o que o aprendiz precisa conseguir fazer, compreender ou decidir.

## Fase 1: fundação implementada

- Next.js App Router, TypeScript estrito, Tailwind CSS e validação Zod.
- Dashboard responsivo em português, criação e edição da descoberta com oito perguntas opcionais (apenas assunto obrigatório).
- Persistência validada no navegador, reabertura, duplicação, exclusão com confirmação e exportação JSON.
- Exemplo fictício completo sobre feedback construtivo: diagnóstico editorial, mapa, estratégia, plano de aula, storyboard e revisão pedagógica.
- Entidades tipadas e contratos separados para domínio, motor pedagógico, integração de IA, persistência e entregáveis.
- Regra de identificação de materiais desatualizados por versão do mapa, com editor visual implementado na Fase 3.

**Este projeto ainda não é o MVP completo.** O diagnóstico assistido por IA está implementado. PostgreSQL/Prisma, autenticação individual, geração/edição de entregáveis e validação dos entregáveis ainda não estão implementados. O mapa visual é editável e versionado; os materiais editoriais continuam somente leitura e não são regenerados automaticamente. Os dados ficam no navegador atual e não são sincronizados entre dispositivos. Não use informações sensíveis em computadores compartilhados. A exportação gera um backup JSON; importação ainda não disponível.

## Diagnóstico assistido por IA

- Responses API e Structured Outputs com validação Zod.
- Fatos derivados da entrada, hipóteses por categoria e perguntas para esclarecimento.
- Revisão editável, aprovação humana, aviso de desatualização e histórico de até 10 versões anteriores.
- Consentimento explícito de envio e custo, código de acesso, limites de uso/tokens e tratamento de falhas sem substituir dados salvos.
- Persistência local preservada; nenhuma geração de imagens ou novos entregáveis.

## Executar

Requer Node.js >=22 (validado em 24.19.0) e npm. Não há credenciais ou serviços externos obrigatórios nesta fase.

```sh
npm ci
npm run setup:local
npm run dev
```

O servidor usa a porta 3000. `.env.example` documenta a configuração atual. Nunca versione chaves. Para habilitar o diagnóstico, configure a chave e o código de acesso exclusivamente no servidor conforme [docs/ai-diagnosis.md](docs/ai-diagnosis.md). Sem configuração, os demais fluxos continuam disponíveis.

## Verificar

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Playwright inicia e encerra seu próprio servidor de produção, portanto execute o build antes. Para instalar um navegador em uma máquina comum: `npx playwright install chromium`. Nesta máquina em nuvem, Chromium já está disponível:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e
```

Os testes de navegador cobrem desktop e celular: criação, edição, reabertura, duplicação, exclusão e exemplo demonstrativo. Para executar produção manualmente: `npm start`.

## Arquitetura e evolução

Veja [docs/architecture.md](docs/architecture.md) para decisões, módulos, limites e fases verificáveis. `src/domain` contém as entidades; `src/modules/projects` a interface; `src/persistence` o adaptador local; `src/pedagogical-engine` os contratos; `src/deliverables` a regra de versões. A descoberta só é enviada à OpenAI quando o usuário autoriza explicitamente uma análise. Veja [configuração e testes de IA](docs/ai-diagnosis.md).

## Estado da fase 2

A primeira análise real autorizada pela Responses API foi concluída, e edição, salvamento, aprovação de teste e reabertura funcionaram com o resultado. A avaliação encontrou limitações de especificidade e de linguagem de incerteza; recomendo aprovação técnica, mas a aprovação pedagógica integral da fase permanece pendente. Veja o [relatório com o diagnóstico original](docs/validation/phase2/report.md). A aplicação continua utilizável sem chave. A equipe técnica conduz instalação, testes e integração; o responsável de produto fornece apenas credenciais em canal seguro e autorização de gasto quando necessária. Nenhuma implantação pública está autorizada.

Veja [docs/operations.md](docs/operations.md) para o procedimento operacional e critérios de integração.

## Aperfeiçoamento pedagógico da Fase 2

O novo contrato distingue bases informadas, hipóteses, inferências fracas, restrições e possíveis pressupostos ocultos. Competências têm condição, evidência e critério; perguntas explicitam a decisão que podem mudar. A interface permite revisar, rejeitar, complementar e justificar a aprovação usando uma rubrica sem nota artificial de aprendizagem. Registros antigos continuam legíveis e podem ser adaptados sem IA, sem apagar o original.

Veja a [comparação entre o diagnóstico real e a revisão técnica](docs/validation/phase2/pedagogical-refinement-v2.md) e o [contrato, compatibilidade e rubrica](docs/phase2-structured-diagnosis.md). A revisão V2 foi elaborada tecnicamente com os dados preservados: não é uma segunda geração de IA. O teste real posterior do motor V2 foi concluído com uma geração adicional expressamente autorizada. Veja o [relatório V2 com a resposta efetiva e avaliação crítica](docs/validation/phase2/v2-real/report.md): a estrutura melhorou, mas a aprovação pedagógica integral ainda não é recomendada. Não há nova geração autorizada.

Verificação adicional sem custo de API: `npm run evaluate:pedagogy`.

## Conferência independente e piloto assistido

A Fase 2 agora oferece rastreabilidade entre capacidades do objetivo, competências, evidências e critérios, com correção manual e decisões justificadas sobre alertas. Uma aprovação anterior do texto não equivale à nova revisão para piloto. A verificação/sugestão opcional por IA tem autorização e orçamento separados, permanece desativada e não foi chamada nesta revisão.

Veja o [relatório executivo e critérios de aceite](docs/validation/phase2/consistency-executive-report.md) e a [arquitetura da consistência](docs/pedagogical-consistency.md). O responsável aprovou a Fase 2 para piloto assistido com revisão humana obrigatória, e o PR nº 1 foi integrado à main após os checks. Isso não alega qualidade universal ou eficácia nem aprova retroativamente os diagnósticos reais. A Fase 3 foi autorizada separadamente; não houve publicação. Avaliação sem custo: `npm run evaluate:consistency`.

## Fase 3 — Mapa de Transformação

Editor espacial com cartões e conexões tipadas, arraste, teclado, lista acessível no celular, zoom e organização por etapas. Permite criar a partir do diagnóstico aprovado, começar manualmente ou adaptar explicitamente um mapa editorial anterior. Mostra fonte e natureza de cada elemento; hipóteses não se tornam fatos ao aceitar a proposta.

Salva conteúdo, posições, conexões, enquadramento e revisões imutáveis; restauração cria outra versão. Mudanças na descoberta/diagnóstico sinalizam desatualização sem substituir decisões. A aprovação requer revisão humana, desempenho relacionado e justificativa. Os mapas editoriais originais e entregáveis continuam preservados. Não há novas chamadas de IA ou geradores nesta fase.

Veja [arquitetura e limites](docs/phase3/architecture.md), [relatório e capturas reais](docs/phase3/delivery.md) e [aprovação restrita da Fase 2](docs/validation/phase2/assisted-pilot-approval.md). A Fase 4 não está autorizada.
