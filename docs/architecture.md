# Arquitetura e fases

## Fase 1 — Fundação (este bootstrap)

Next.js App Router, TypeScript estrito e Tailwind. Dashboard, criação, edição da descoberta, duplicação, exclusão, exportação e persistência no navegador. Demonstração editorial completa sobre feedback, identificada como exemplo sem inferência de pesquisa real. Modelo central versionado. Testes do domínio e smoke de produção.

## Limites explícitos

Sem autenticação individual ou PostgreSQL nesta fase. Diagnóstico de IA disponível mediante configuração e consentimento. O armazenamento local é por navegador, não por usuário autenticado; não use dados sensíveis em máquinas compartilhadas. Uma chamada externa autenticada depende de chave e orçamento configurados; testes automatizados usam transporte controlado. Os conteúdos demonstrativos são estáticos e precisam de revisão humana. A fundação não satisfaz ainda todos os critérios do MVP.

## Separação

- `app` e `modules/projects/components`: interface e rotas.
- `domain`: entidades, validação e operações puras.
- `pedagogical-engine`: contratos de funções especializadas.
- `integrations/ai`: fronteira exclusivamente de servidor, reservada para Responses API.
- `persistence`: adaptador local validado e versionado.
- `deliverables`: controle de origem dos materiais.

## Fases e critérios atuais

1. Fundação: concluída e publicada no repositório, sem implantação pública.
2. Diagnóstico assistido por IA: implementação e testes locais nesta branch. O primeiro teste e o teste V2 tiveram uma geração real cada, em autorizações distintas, com jornadas de revisão verificadas; encerramento integral ainda não é recomendado pelos achados em `docs/validation/phase2/v2-real/report.md`.
3. Mapa editável: somente após validar a fase 2. Histórico imutável, aprovação humana e rastreabilidade.
4. Arquitetura pedagógica: estratégias justificadas e seleção pelo especialista.
5. Plano de aula e storyboard: edição por cena e atualização seletiva por versão do mapa; demais formatos futuros.
6. Validação pedagógica: justificativas e recomendações distintas de resultados empíricos.

PostgreSQL/Prisma, identidade individual, quotas persistentes e recuperação de dados são requisitos de plataforma antes de uso comercial/multi-instância; não fazem parte da fase 2 de diagnóstico. Essa numeração substitui a sequência inicial de infraestrutura, alinhando os marcos à jornada do produto solicitada pelo responsável.

## Decisões

Persistência local permite validar a fundação sem inventar credenciais ou provisionar infraestrutura não disponível. Migração futura deve preservar IDs e versões e exigir confirmação antes de transferir dados locais ao servidor. Não instalar Prisma sem banco de dados/configuração e fluxo de identidade definidos. Modelos e migrações pertencem à evolução da plataforma, sem implantação ou contratação automática de serviços.

## Diagnóstico de IA — fase implementada nesta branch

O escopo de IA foi antecipado por solicitação, mantendo a persistência local. Não foram implementados banco, geração de imagens ou novos entregáveis. A descoberta validada é enviada por Route Handler protegido para a Responses API; um schema estrito define hipóteses e perguntas. Fatos são montados diretamente da entrada. O especialista edita e aprova explicitamente a proposta; cada salvamento guarda a versão anterior e novas edições retiram a aprovação. Mudanças na descoberta sinalizam desatualização pelo snapshot de origem e impedem nova aprovação até regenerar. Não há atualização automática de mapas ou materiais.

O schema de persistência mantém o envelope `arquiteto.projects.v1` e aceita diagnósticos demonstrativos antigos sem campos novos. Campos opcionais de análise, revisão e histórico permitem evolução sem apagar dados. Código de acesso nunca é persistido junto dos projetos. Não há endpoint que leia projetos locais de outros usuários.

Autorização por código compartilhado e quotas globais em memória atendem à revisão desta fase, sem alegar isolamento autenticado por usuário ou uso público multi-instância. A migração futura para identidade e quotas distribuídas continua necessária. Consulte [ai-diagnosis.md](ai-diagnosis.md) para configuração, contrato, limitações, fontes e validação real.

## Revisão de qualidade da fase 2

- Mudanças na descoberta retiram a aprovação persistida do diagnóstico e preservam a versão anterior, sem alterar mapas e entregáveis.
- Avisos antes de sair/recarregar uma revisão evitam descarte silencioso. Troca de descoberta também exige confirmação quando há revisão não salva.
- Salvamentos comparam a cópia carregada com o armazenamento atual para detectar conflitos já existentes entre abas. Não é uma transação distribuída; corridas simultâneas entre processos ainda exigem futura persistência transacional.
- Categorias de hipótese podem ficar vazias para não incentivar invenções. Linhas vazias são normalizadas ao salvar, sem truncar textos humanos.
- O envio exige consentimento sobre dados e custo. O status local de configuração é consultável sem revelar segredos e sem acionar a OpenAI.
- O código de acesso local é preparado automaticamente em arquivo ignorado e privado, sem substituir configurações existentes. Chave externa e autorização de custo permanecem decisões humanas.

## Contrato pedagógico V2 (continua na Fase 2)

`domain/pedagogical-analysis.ts` separa contrato de geração completa de rascunho editável; `diagnosis-rubric.ts` aplica regras determinísticas sem eficácia numérica; `adapt-diagnosis.ts` adapta explicitamente registros anteriores, sem inventar evidência ou gravar durante leitura. A interface estruturada preserva proposta original da geração V2 e rejeições. Aprovação exige campos completos, fontes válidas, viabilidade e revisão humana justificada dos sete critérios.

Mapas, estratégias e entregáveis permanecem separados e não foram desenvolvidos nesta revisão. A comparação editorial inicial usou uma revisão técnica sem geração. Posteriormente, uma geração V2 expressamente autorizada foi preservada em `validation/phase2/v2-real`, com testes offline de revisão e análise crítica; os dois tipos de registro permanecem distintos. [Detalhes do contrato e limites](phase2-structured-diagnosis.md).

## Camada de consistência e critérios de piloto (Fase 2)

A geração não foi ampliada para assumir toda a validação. `pedagogical-engine/consistency` mantém contratos opcionais e funções puras; `ConsistencyPanel` registra relações e decisões humanas. `server/pedagogical-review` implementa uma revisão/sugestão opcional separada, desativada e com orçamento próprio. Não há equivalência entre verificação estrutural, julgamento semântico e eficácia de aprendizagem. A prontidão para piloto é calculada sobre uma conferência atual, fontes válidas, relações justificadas e revisão humana explícita; aprovações legadas não são promovidas automaticamente. [Detalhes e critérios](pedagogical-consistency.md).

Os oito critérios do responsável permitem piloto assistido do diagnóstico/revisão manual com limites documentados; isso não aprova pedagogicamente os dois registros reais nem inicia a Fase 3. O uso público/multiusuário ainda exige evolução de plataforma.
