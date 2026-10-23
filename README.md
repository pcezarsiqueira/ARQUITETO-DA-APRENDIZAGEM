# Arquiteto da Aprendizagem

Transforme conhecimento especializado em experiências de aprendizagem estruturadas. O ponto de partida é o que o aprendiz precisa conseguir fazer, compreender ou decidir.

## Fase 1: fundação implementada

- Next.js App Router, TypeScript estrito, Tailwind CSS e validação Zod.
- Dashboard responsivo em português, criação e edição da descoberta com oito perguntas opcionais (apenas assunto obrigatório).
- Persistência validada no navegador, reabertura, duplicação, exclusão com confirmação e exportação JSON.
- Exemplo fictício completo sobre feedback construtivo: diagnóstico editorial, mapa, estratégia, plano de aula, storyboard e revisão pedagógica.
- Entidades tipadas e contratos separados para domínio, motor pedagógico, integração de IA, persistência e entregáveis.
- Regra de identificação de materiais desatualizados por versão do mapa, coberta por testes; o editor visual será implementado em fase posterior.

**Este bootstrap não é o MVP completo.** IA, PostgreSQL/Prisma, autenticação, mapa editável com aprovação, geração/edição de entregáveis e validação automatizada ainda não estão implementados. O exemplo é somente leitura; a descoberta pode ser editada, sem regenerar os materiais demonstrativos. Os dados ficam no navegador atual e não são sincronizados entre dispositivos. Não use informações sensíveis em computadores compartilhados. A exportação gera um backup JSON; importação ainda não disponível.

## Executar

Requer Node.js >=22 (validado em 24.19.0) e npm. Não há credenciais ou serviços externos obrigatórios nesta fase.

```sh
npm ci
npm run dev
```

O servidor usa a porta 3000. `.env.example` documenta a configuração atual. Nunca versione chaves; futuras integrações usarão variáveis exclusivas do servidor.

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

Veja [docs/architecture.md](docs/architecture.md) para decisões, módulos, limites e fases verificáveis. `src/domain` contém as entidades; `src/modules/projects` a interface; `src/persistence` o adaptador local; `src/pedagogical-engine` os contratos; `src/deliverables` a regra de versões. Nenhuma informação é enviada à OpenAI nesta fase.
