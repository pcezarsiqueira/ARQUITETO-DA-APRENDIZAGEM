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

## Fases seguintes e critérios

2. PostgreSQL + Prisma + autenticação: migrações, isolamento por usuário no servidor, testes de acesso cruzado e restauração persistente.
3. IA: consultar documentação oficial atual de Responses API/Structured Outputs; validar entrada/saída com Zod, limites de tamanho/tokens/custos, rate limiting e consentimento explícito. Tratar texto fornecido como dados não confiáveis. Guardar credenciais exclusivamente no servidor. Requisições especializadas com origem, justificativa e versão; nenhuma proposta sobrescreve edição manual automaticamente.
4. Mapa editável: histórico imutável, aprovação humana e até três estratégias justificadas; testes de mudança de versão e invalidação seletiva.
5. Plano de aula e storyboard com edição por cena, atualização seletiva e rastreabilidade; demais formatos apenas como futuros.
6. Validação pedagógica fundamentada e testes ponta a ponta de todo o fluxo; análise de planejamento distinta de resultados reais.

## Decisões

Persistência local permite validar a fundação sem inventar credenciais ou provisionar infraestrutura não disponível. Migração futura deve preservar IDs e versões e exigir confirmação antes de transferir dados locais ao servidor. Não instalar Prisma sem banco de dados/configuração e fluxo de identidade definidos. Modelos e migrações serão implementados na fase 2.

## Diagnóstico de IA — fase implementada nesta branch

O escopo de IA foi antecipado por solicitação, mantendo a persistência local. Não foram implementados banco, geração de imagens ou novos entregáveis. A descoberta validada é enviada por Route Handler protegido para a Responses API; um schema estrito define hipóteses e perguntas. Fatos são montados diretamente da entrada. O especialista edita e aprova explicitamente a proposta; cada salvamento guarda a versão anterior e novas edições retiram a aprovação. Mudanças na descoberta sinalizam desatualização pelo snapshot de origem e impedem nova aprovação até regenerar. Não há atualização automática de mapas ou materiais.

O schema de persistência mantém o envelope `arquiteto.projects.v1` e aceita diagnósticos demonstrativos antigos sem campos novos. Campos opcionais de análise, revisão e histórico permitem evolução sem apagar dados. Código de acesso nunca é persistido junto dos projetos. Não há endpoint que leia projetos locais de outros usuários.

Autorização por código compartilhado e quotas globais em memória atendem à revisão desta fase, sem alegar isolamento autenticado por usuário ou uso público multi-instância. A migração futura para identidade e quotas distribuídas continua necessária. Consulte [ai-diagnosis.md](ai-diagnosis.md) para configuração, contrato, limitações, fontes e validação real.
