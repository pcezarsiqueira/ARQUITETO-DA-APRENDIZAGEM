# Operação e revisão da fase 2

## Responsabilidades

A equipe técnica prepara ambiente, protege credenciais, testa, corrige, cria branches e integra quando os critérios estiverem cumpridos. O responsável de produto decide conteúdo, método, aprovação pedagógica, autorização de gastos e publicação. Não solicitar execução de comandos ou edição de arquivos ao idealizador.

## Preparação local

Usar checkout existente e branch de desenvolvimento. `npm ci` instala o lockfile. `npm run setup:local` prepara somente um arquivo local ausente, com permissão 0600 e código criptograficamente aleatório, sem imprimir o código. Não altera arquivo humano existente. Nunca registrar esse arquivo no Git, logs, capturas ou relatórios. A chave externa não é inventada. Em ambiente já configurado, reutilizar variáveis existentes sem imprimir valores.

## Verificações sem custo externo

Executar lint, typecheck, testes Node, build e Playwright com Chromium disponível. O runner de navegador zera chaves do provedor no processo do servidor e usa respostas interceptadas quando testa IA. O restante da aplicação e a resposta de indisponibilidade são testados de verdade em servidor de produção local. O SDK real é exercitado com transporte controlado; isso valida o contrato HTTP, não o serviço externo.

Conferir também: preservação de dados anteriores, cancelamento de saída com revisão pendente, edição com linhas vazias, categorias sem hipóteses, invalidação de aprovação, conflitos entre abas, ausência de códigos no armazenamento/exportação e resposta sem dados confidenciais em erros. Nenhuma evidência de navegador deve conter segredo real.

## Teste real (bloqueado até autorização)

1. Confirmar presença e binding da chave, sem imprimir o valor, e domínio `api.openai.com` permitido.
2. Obter autorização explícita para o custo de uma única análise, sem contratar plano, aumentar saldo ou habilitar cobrança recorrente. Uma chave presente não significa autorização de gasto.
3. Iniciar servidor local e navegador isolado com um projeto fictício de feedback construtivo. Preencher descoberta, autenticar usando o código local sem exibi-lo e autorizar envio/custo na interface.
4. Executar apenas uma geração. Conferir categorias, fatos da descoberta, perguntas, justificativa e ausência de alegações empíricas inventadas. Registrar resultado sanitizado e modelo, sem chave/código/textos privados.
5. O responsável pedagógico revisa o resultado. Exercitar editar, salvar, aprovar e reabrir no navegador de validação. Uma aprovação em teste é somente evidência de funcionamento do mecanismo, não aprovação editorial do produto em nome do idealizador.
6. Se houver erro de autorização, saldo, acesso ao modelo ou conectividade, registrar a causa sanitizada e não repetir chamadas pagas indiscriminadamente.

## Integração e implantação

Só integrar à `main` depois de todas as verificações exigidas, teste externo autorizado e ausência de revisão/decisão humana pendente. Preparar comparação e verificar conflitos sem alterar `main` enquanto houver bloqueio. Se a API do GitHub estiver proibida, preservar branch remota e disponibilizar um único link direto de revisão; não extrair tokens nem publicar para contornar a restrição.

Integração de código e publicação são operações distintas. Não criar aplicação pública, serviços pagos ou custos recorrentes sem autorização. O estágio atual continua com armazenamento no navegador, acesso compartilhado e quotas por processo; autenticação individual, persistência transacional e quotas compartilhadas são pré-requisitos de uso comercial multi-instância.

## Aperfeiçoamento pedagógico V2

A avaliação offline usa `npm run evaluate:pedagogy` e a suíte de regressão, sem chave ou chamadas pagas. O contrato V2 ainda não foi validado em geração real. O próximo roteiro exige autorização operacional `one-analysis-v2` após consentimento humano novo; não apagar a marca da análise anterior nem reutilizar sua autorização. Preservar resultado antes de qualquer edição. Avaliar campos e semântica pela rubrica, sem tratar verificações de estrutura como prova de qualidade. Continuar sem integrar main, publicar ou avançar à Fase 3 enquanto a validação estiver pendente.
