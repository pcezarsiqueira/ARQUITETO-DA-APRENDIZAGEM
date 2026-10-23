# Fase 3 — arquitetura e implementação verificável

## Decisões antes da implementação

O editor usa cartões HTML posicionados e conexões SVG, sem serviços externos ou nova dependência. O navegador oferece arraste por alça, movimento por teclado, controles de posição, rolagem e zoom; no celular, edição por lista evita depender exclusivamente do arraste. A posição espacial organiza o pensamento e não determina causalidade pedagógica.

`Project.visualMap` será opcional, preservando o envelope local v1 e os mapas editoriais anteriores em `Project.maps`. Revisões do grafo serão imutáveis, numeradas acima das versões legadas, com nós, conexões, posições, enquadramento, origem, snapshot da descoberta/diagnóstico e aprovação humana. Restaurar significará criar uma nova revisão, sem apagar a história. O limite de revisões impedirá novas gravações ao atingir a capacidade, sem descartar as primeiras.

Nós representam estados, conhecimento, habilidade, decisão, pré-requisito, barreira, lacuna, pressuposto, competência, evidência e critério. Conteúdo atual e origem literal são separados. A revisão de um nó não altera sua natureza epistemológica automaticamente. Importar diagnóstico requer aprovação atual; importar um mapa editorial antigo é explícito e resulta em rascunho para revisão. Sem diagnóstico aprovado é possível começar manualmente, sem inventar conteúdo.

Conexões tipadas representam dependência, contribuição, demonstração, avaliação, superação de barreira e progressão. Competências exigem condição, evidência e critério relacionados. Quando não há dependência adicional pedagogicamente necessária, registra-se justificativa em vez de forçar nós artificiais. Checagens estruturais não comprovam aprendizagem ou adequação semântica universal.

Mudança na descoberta ou no diagnóstico sinaliza desatualização; nenhuma atualização substitui o mapa humano. A pessoa pode criar nova proposta separada ou comparar a origem e confirmar a revisão do mapa existente, registrando justificativa e nova versão. Aprovação é retirada após edição; entregáveis legados ficam sinalizados quando sua versão de origem difere da nova versão do mapa.

## Fases verificáveis desta execução

1. Contratos, criação/importação e rastreabilidade, com testes de domínio e compatibilidade.
2. Editor visual, controles acessíveis, persistência e histórico, com testes desktop/celular.
3. Verificação de mudança de diagnóstico, regressões, capturas reais e relatório de entrega/PR próprio.

Não haverá geração paga, implantação pública, novos geradores ou início da Fase 4. Formatos futuros consumirão o contrato versionado do mapa; não serão apresentados botões de geração fictícios.

## Contratos finais e limites operacionais

Até 200 elementos, 600 conexões e 100 revisões por mapa. O limite do histórico bloqueia gravações adicionais, sem apagar versões antigas. Texto de elemento e origem têm até 20.000 caracteres; posições, zoom e rolagem são validados. O canvas cresce com a organização e preserva enquadramento no salvamento; a seleção de inspeção é temporária. Não há sincronização ou banco novo: exportação JSON existente inclui o grafo e todo seu histórico. Falha de armazenamento/conflito mantém a edição aberta.

`saveMapRevision` numera acima de mapas legados e revisões existentes; rascunhos também recebem versão de conteúdo, de modo que entregáveis antigos são sinalizados conservadoramente mesmo se uma versão mudar só a organização. Não há atualização seletiva de entregáveis implementada. `projectMapContract` fornece projeção compatível do estado aprovado/rascunho, objetivos e desempenho para futuros consumidores; o grafo completo conserva conhecimento, habilidade, decisão e origem. Formatos futuros deverão referenciar mapId, versão e schemaVersion, sem gerar a partir de um rascunho sem decisão humana.

A restauração sempre exige nova revisão de todos os elementos. Mudanças no conteúdo de um elemento retiram sua aceitação; mudanças de posição/conexão retiram a aprovação do mapa, preservando a aceitação textual dos nós. Alterar um tipo com relações incompatíveis exige desconexão explícita antes. Remover um elemento remove suas conexões somente da proposta atual; versões salvas conservam ambos.

A importação não infere novas competências, decisões ou conhecimentos ausentes. Diagnósticos legados podem não conter condição/evidência/critério; esses campos ficam pendentes. No exemplo editorial, barreiras são tratadas como hipóteses não comprovadas. Uma revisão da origem não reescreve títulos, fontes nem conexões: atualiza o snapshot após justificativa e exige nova revisão dos elementos. O registro original permanece junto das versões anteriores.

A aprovação exige estados atual/desejado, competência com condição, evidência e critério relacionados, dependência pertinente ou justificativa de dispensa, todos os elementos revisados, origem atual e justificativa geral. Esses são controles de coerência registrada; a qualidade dos significados ainda depende do especialista. Informação marcada como hipótese continua com esse rótulo, a menos que uma pessoa altere explicitamente seu tratamento, preservando o rótulo e trecho originais.

`approvedMapContract(project, version)` fornece o grafo completo e imutavelmente copiado — schemaVersion, mapId, versão, nós, conexões, origem e aprovação — para futuros consumidores. Recusa rascunhos, mapas estruturalmente pendentes ou desatualizados. Não gera conteúdo, não envia dados e não implementa nenhuma das saídas futuras. A projeção legada `projectMapContract` é somente uma ponte de compatibilidade e não substitui o grafo completo.
