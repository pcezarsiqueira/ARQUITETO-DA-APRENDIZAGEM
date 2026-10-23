# Diagnóstico assistido por IA

## Configuração

A aplicação continua utilizável sem IA. Para habilitar apenas o diagnóstico:

1. Na preparação técnica, execute `npm run setup:local`: ele cria um arquivo local privado com código aleatório somente se não existir configuração. Se já houver arquivo ou variável de acesso, preserva a configuração. Esses procedimentos são responsabilidade técnica, não tarefas do idealizador.
2. Configure `AI_PROVIDER_API_KEY` com uma chave OpenAI válida, ou `OPENAI_API_KEY` como alternativa. Nunca use `NEXT_PUBLIC_` e nunca compartilhe a chave no chat ou no navegador.
3. O código aleatório já é criado automaticamente para uma instalação local vazia. Em implantação gerenciada, configure `DIAGNOSIS_ACCESS_TOKEN` com ao menos 32 caracteres aleatórios. Entregue esse código por canal seguro apenas aos revisores autorizados. É uma barreira de acesso para esta fase sem login, não autenticação individual.
4. Configure `OPENAI_DIAGNOSIS_MODEL` com modelo compatível com Responses API e JSON Schema estrito; padrão `gpt-4.1-mini`. Confirme disponibilidade e orçamento na sua conta. Ajustar o modelo pode mudar custo, latência e qualidade.
5. Defina `APP_ORIGIN` com a origem pública exata, incluindo protocolo e porta quando houver, sem barra final. Localmente: `http://localhost:3000`. Em proxy reverso é especialmente importante configurar o endereço externo correto. Use HTTPS ao disponibilizar externamente.
6. Reinicie `npm run dev` ou `npm start`. Os segredos são lidos em runtime no servidor; não são exigidos durante o build.

No ambiente cloud, a chave pode ser um binding de segredo chamado `AI_PROVIDER_API_KEY` autorizado exclusivamente para `api.openai.com`. `OPENAI_API_KEY` é um nome reservado da plataforma de onboarding, por isso o nome alternativo. O código de acesso precisa existir como valor real de variável no processo ou em `.env.local`; um placeholder substituído somente no proxy HTTPS não funciona para comparação local. A revisão prepara automaticamente um código local aleatório quando não há configuração local existente. Esse código não é impresso nem versionado. A chave OpenAI continua sendo fornecida exclusivamente pelo responsável por meio seguro.

## Como verificar uma chamada real

Crie ou abra um projeto, revise os oito campos da descoberta e remova informações confidenciais. Na seção de diagnóstico, digite o **código de acesso do aplicativo**, nunca a chave OpenAI, autorize o envio e o custo da análise e clique em “Analisar com IA”. Essa ação pode gerar custo. Uma configuração ausente retorna indisponibilidade; não é usado conteúdo fictício como fallback.

Verifique os cinco grupos de hipóteses, as perguntas e a justificativa. Os fatos são extraídos dos campos do especialista no servidor, não inventados pelo modelo. É possível corrigir os fatos e os demais campos; edições são identificadas como humanas. “Salvar revisão” mantém o rascunho; “Aprovar diagnóstico” registra sua decisão. Reabra o projeto após atualizar a página para confirmar a persistência. Altere a descoberta e confirme o aviso de desatualização e o bloqueio de nova aprovação até gerar uma proposta atual. Projetos e materiais existentes são preservados.

Gerar uma proposta não substitui o diagnóstico salvo. O especialista deve salvar ou aprovar explicitamente. Uma nova geração pede confirmação se há revisão ainda não salva. O histórico preserva até 10 versões anteriores no projeto e na exportação JSON; ainda não há interface para restaurar versões. Uma edição volta ao estado de revisão. Alterar a descoberta também retira a aprovação no dado persistido e preserva a versão anterior no histórico. Aprovação humana não transforma hipóteses em evidência empírica.

## Limites e privacidade

- Entrada validada por Zod: assunto obrigatório, demais campos opcionais, limites individuais da descoberta e corpo de no máximo 24.000 bytes, inclusive sem `Content-Length`.
- Código de acesso obrigatório com comparação segura, origem exata e JSON obrigatório antes de chamar o provedor. O código fica apenas na memória da interface e não no armazenamento/exportação dos projetos.
- Por processo/instância: no máximo 5 chamadas por minuto, 20 em janela móvel de 24 horas e 2 simultâneas. Tentativas que falham também consomem o limite. Reiniciar o processo reinicia esses contadores. Não há quota confiável por usuário nem orçamento distribuído nesta fase.
- Até 3.000 tokens de saída por chamada, timeout de 45 segundos, sem repetição automática. O SDK pode consumir tokens mesmo em respostas incompletas ou falhas de rede. Os limites reduzem uso, não constituem teto financeiro garantido: configure orçamento e alertas no provedor. Antes de escalar para múltiplas réplicas, implemente autenticação individual e quota persistente/compartilhada.
- Apenas a descoberta do projeto selecionado é enviada após autorização explícita. Não são enviados outros projetos, entregáveis ou histórico. O servidor não persiste projetos nem registra entrada, resposta ou credenciais em logs da aplicação.
- `store: false` desabilita armazenamento da resposta para recuperação via Responses API; não implica retenção zero. Consulte as políticas e controles de dados da sua conta OpenAI antes de enviar dados privados.
- O texto do especialista é tratado como dado não confiável em uma mensagem separada das instruções. Não há ferramentas, busca, execução, upload de documentos ou imagens. O modelo pode ainda produzir hipóteses erradas; revisão humana continua necessária. A interface renderiza texto, sem HTML arbitrário.

## Contrato e fontes

`src/domain/diagnosis.ts` define o schema estrito da análise e o schema compatível com diagnósticos antigos. `src/integrations/ai/diagnosis.ts` usa o SDK oficial, `client.responses.parse()` e `zodTextFormat()` para `text.format` com JSON Schema estrito, seguido de validação local. Recusas, respostas incompletas e conteúdo inválido são rejeitados. `src/server` aplica autenticação, limites e erros sanitizados. O Route Handler usa `server-only` e runtime Node.js. Credenciais não atravessam essa fronteira.

Referências oficiais consultadas: [SDK Node](https://github.com/openai/openai-node), [helper Zod](https://github.com/openai/openai-node/blob/master/src/helpers/zod.ts), [tipos Responses](https://github.com/openai/openai-node/blob/master/src/resources/responses/responses.ts). O site de documentação retornou 403 neste ambiente; o contrato foi conferido nas fontes oficiais do SDK e no pacote instalado, com teste do JSON de requisição real do SDK.

## Testes

```sh
npm run lint
npm run typecheck
npm test
npm run build
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e
```

Os testes usam o SDK real com transporte HTTP controlado e a interface com respostas interceptadas. Cobrem o contrato `/v1/responses`, Structured Outputs, isolamento do texto não confiável, fatos derivados da entrada, revisão/aprovação, persistência antiga/nova, invalidação após mudança da descoberta, autorização, consentimento, limites, recusas e falhas. Eles não gastam créditos nem comprovam qualidade pedagógica do modelo. O script de testes usa a condição `react-server` para testar os módulos protegidos por `server-only` em Node.js.

Uma chamada autenticada à OpenAI só pode ser declarada validada após configurar credenciais e executar o fluxo real acima. Sem chave disponível, essa validação externa fica pendente, mesmo com o build e os testes passando.

## Operação pela equipe técnica

O idealizador não precisa administrar arquivos, branches ou testes. O responsável técnico prepara o ambiente, gera o acesso local, executa as verificações e conduz o teste real após autorização. A única credencial que não pode ser fabricada é a chave da conta OpenAI: deve ser cadastrada no campo seguro `AI_PROVIDER_API_KEY` nas configurações do ambiente, nunca no chat. Não publicar a aplicação nem contratar serviços sem autorização explícita.

O endpoint de status apenas informa configuração local; não comprova conectividade, saldo, acesso ao modelo ou qualidade da resposta. Quando a IA está ausente, o aplicativo informa a indisponibilidade e mantém criação/edição/persistência disponíveis. O endpoint de análise rejeita requisições sem `consent: true` e `costConsent: true`, mesmo que a chave exista. A autorização na interface é desmarcada a cada tentativa; nova tentativa exige novo consentimento. Testes automatizados usam valores controlados, não constituem autorização de gasto real.

Antes de integrar à `main`: passar verificações, confirmar ausência de alterações humanas conflitantes e concluir teste real autorizado com revisão humana. Enquanto faltar chave/autorização/validação externa, manter a branch para revisão. O acesso Git via proxy não garante acesso à API do GitHub; uma recusa na API impede criação automática de PR, mas permite preservar trabalho na branch remota. Não extrair credenciais do proxy para contornar a restrição.

## Transporte no ambiente em nuvem

O cliente de servidor utiliza `undici` com `EnvHttpProxyAgent` quando `HTTPS_PROXY`/`HTTP_PROXY` (ou variantes minúsculas) estão configuradas. O `fetch` e seu dispatcher pertencem à mesma biblioteca, conforme orientação do SDK. Isso corrige a falha de resolução direta de DNS observada neste ambiente, preservando as autoridades certificadoras configuradas e a verificação TLS. Sem proxy, mantém o transporte padrão. Nenhum endereço de proxy ou credencial é registrado.

Na continuação da preparação, a chave fornecida foi armazenada somente em arquivo local privado e ignorado pelo Git. Uma consulta autenticada de leitura confirmou acesso ao modelo usando o próprio cliente do aplicativo. Esse teste não gerou conteúdo e não valida a Responses API. A análise real continua bloqueada até autorização explícita de custo.

A equipe técnica dispõe de `scripts/verify-live-diagnosis.mjs` para conduzir uma única tentativa no navegador isolado com o exemplo fictício. O script exige uma autorização operacional explícita (`LIVE_DIAGNOSIS_COST_AUTHORIZED=one-analysis`), cria uma marca de tentativa antes do envio e recusa repetições automáticas. Não deve ser executado com essa autorização sem consentimento expresso do responsável. Não imprime credenciais nem habilita publicação. Sua edição/aprovação de teste verifica o mecanismo, sem aprovar pedagogicamente o produto em nome do idealizador.

## Resultado do teste real autorizado

Foi executada uma única geração via Responses API com o exemplo fictício de feedback construtivo. Edição, salvamento, aprovação de teste e reabertura funcionaram com a resposta real. O original e a cópia revisada foram preservados em `docs/validation/phase2/`, sem credenciais. O [relatório](validation/phase2/report.md) reproduz o diagnóstico e distingue texto da IA de avaliação/revisão técnica.

A avaliação recomenda aprovação técnica do mecanismo, mas não aprovação pedagógica integral: competências amplas sem evidências explícitas e algumas inferências redigidas com certeza excessiva precisam de revisão. Não houve nova geração para corrigir o resultado. A marca de tentativa permanece ativa; o roteiro recusa repetição. Qualquer novo teste pago exige nova autorização expressa. O PR permanece em rascunho, sem integração à main ou início da Fase 3.
