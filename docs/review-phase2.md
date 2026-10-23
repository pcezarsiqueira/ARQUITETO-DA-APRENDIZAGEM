# Revisão da fase 2 — diagnóstico assistido por IA

## Resultado

Implementação revisada e verificações locais aprovadas. A fase 2 NÃO está encerrada: faltam uma chamada real autorizada e a revisão humana do resultado. A fase 3 não foi iniciada. A aplicação não foi publicada. Nenhum recurso pago, cobrança recorrente ou chamada de geração paga foi criado.

## Correções realizadas

| Problema identificado                                              | Correção                                                                                            | Evidência                                                                   |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Sair da tela podia descartar revisão sem aviso                     | Confirmação ao navegar e proteção ao recarregar                                                     | Testes de navegador, desktop e celular                                      |
| Aprovação anterior permanecia registrada após mudar a descoberta   | Retirada da aprovação persistida, retenção da versão anterior e bloqueio de aprovação desatualizada | Testes de domínio e navegador                                               |
| Abas com cópia antiga podiam substituir dados mais recentes        | Verificação do snapshot antes de salvar; preservação do formulário e dos dados da outra aba         | Testes de persistência e navegador                                          |
| Listas obrigatórias incentivavam preenchimento sem hipótese válida | Categorias podem ficar vazias; linhas vazias normalizadas ao salvar                                 | Testes de domínio e navegador                                               |
| Ausência de IA só ficava evidente após tentar uma chamada          | Status local sem segredo e aviso; restante do aplicativo disponível                                 | Testes do endpoint e navegador                                              |
| Consentimento não explicitava custo no contrato                    | Autorização explícita de dados e custo, renovada a cada tentativa                                   | Validação do endpoint e testes de navegador                                 |
| Erros não JSON/de rede podiam aparecer de forma técnica            | Mensagens compreensíveis e preservação do diagnóstico salvo                                         | Revisão do fluxo e regressões de falha                                      |
| Configuração exigia geração manual de acesso                       | Preparação local idempotente, privada e sem exibição de segredo                                     | Teste automatizado de permissões, repetição e preservação de arquivo humano |

## Verificações executadas

- Instalação limpa com `npm ci` e lockfile existente.
- Lint, TypeScript e build de produção aprovados.
- 15 testes de domínio/integração aprovados, sem falhas ou testes ignorados.
- 14 testes de navegador aprovados, desktop e celular, sem falhas ou testes ignorados. Incluem criar projeto, preencher oito campos, solicitar diagnóstico controlado, revisar, editar, salvar, aprovar e reabrir; legado demonstrativo; falha de IA; ausência de configuração e conflito entre abas.
- SDK oficial exercitado com transporte controlado: `/v1/responses`, JSON Schema estrito, `store:false`, limite de tokens, recusas e saídas inválidas. Isso NÃO comprova uma chamada externa autenticada nem a qualidade pedagógica de uma geração real.
- Auditoria das dependências de produção: nenhuma vulnerabilidade reportada.
- Código local ausente dos arquivos JavaScript públicos; arquivo de configuração ignorado pelo Git e criado com permissão 0600.
- Consulta sem credencial ao endpoint de modelos da OpenAI respondeu HTTP 401: comprova alcance de rede e ausência de autenticação naquela consulta, não acesso ao modelo nem autorização para gerar conteúdo. Nenhuma chamada à Responses API foi feita pela rede.

## Bloqueios externos

A chave `AI_PROVIDER_API_KEY` não está presente no processo e seu requisito no ambiente não possui binding salvo. O acesso local foi preparado automaticamente sem exibir o segredo. O responsável precisa cadastrar a chave no campo seguro do ambiente e autorizar expressamente o custo de uma única análise de teste. Não é necessário editar código, executar comandos ou transmitir segredos pelo chat.

API REST e alternativa GraphQL do GitHub retornaram `Forbidden`. A alternativa web está acessível, mas sem sessão autenticada. Não foram extraídas credenciais do proxy. O envio Git continua disponível; a branch remota preserva as alterações. A integração à `main` fica retida pelo critério de teste real/autorização pendente, independentemente da possibilidade de abrir um PR.

## Limitações preservadas

Persistência é local ao navegador, não sincronizada. Detecção de conflito entre abas não substitui transação de banco. Acesso por código compartilhado e quotas em memória são controles de revisão desta fase, não infraestrutura comercial multiusuário. Quotas reiniciam com o processo. Aprovação do mecanismo em teste não aprova decisões pedagógicas em nome do idealizador. Mapas e materiais demonstrativos continuam separados e não são gerados nem alterados pelo diagnóstico.
