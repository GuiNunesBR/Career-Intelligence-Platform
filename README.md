# Career Lake — Plataforma de Inteligência de Carreira

Sistema de gestão e análise de percurso profissional baseado em evidências. O histórico registado atua como fonte central de verdade, sendo as versões de currículo geradas como projeções para vagas específicas.

---

## Modelo de Funcionamento

A aplicação não permite a introdução de competências ou métricas sem suporte factual. Os requisitos de cada oportunidade são comparados diretamente com o repositório estruturado do utilizador, gerando uma matriz de correspondência antes de qualquer documento ser elaborado.

```text
               +--------------------------------------------------------+
               |               Career Lake (Dados Reais)                |
               |  - Experiências profissionais com contexto de negócio  |
               |  - Projetos com tecnologias e entregas mensuráveis     |
               |  - Competências categorizadas por tempo e nível        |
               |  - Banco de evidências diretas e transferíveis         |
               +---------------------------+----------------------------+
                                           |
                                           v
      Requisitos da Vaga ---> [ Matriz de Evidências / Fit ] <--- Evidências
                                           |
                                           v
       +----------------------------------------------------------------+
       |                     Documentos Gerados                         |
       |  - Currículo adaptado (Modos: Conservador, Equilibrado,        |
       |    Agressivo)                                                  |
       |  - Carta de apresentação fundamentada em factos documentados   |
       |  - Relatório de proveniência com citações de evidências        |
       +----------------------------------------------------------------+

```

---

## Funcionalidades

* **Repositório Estruturado (Career Lake):** Registo de experiências, projetos, competências funcionais/técnicas e catálogo de evidências com métricas e graus de confiança declarados.


* **Processamento de Vagas e Matriz de Evidências:** Extração de requisitos e classificação por criticidade. Cruzamento de cada requisito com as evidências do perfil, identificando correspondências diretas, derivadas, transferíveis ou ausência de dados.


* **Geração de Currículos e Cartas:** Criação de documentos direcionados sob três modos de formulação textual, mantendo a rastreabilidade das afirmações através de identificadores de evidências.


* **Gestão de Candidaturas:** Acompanhamento do ciclo de processos seletivos por etapas (quadro Kanban e vista em lista), com anotações e registo de expetativas salariais.


* **Tarefas em Segundo Plano e Agendamento:** Fila de execução assíncrona com estados (`queued`, `running`, `completed`, `failed`, `cancelled`), gestão de tentativas, chaves de idempotência e agendamento recorrente com fuso horário.


* **Isolamento de Utilizadores:** Separação física de ficheiros por utilizador, armazenamento de palavras-passe através de dispersão com bcrypt e validação de sessões via hash SHA-256.



---

## Pilha Tecnológica

| Componente | Tecnologias |
| --- | --- |
| **Interface** | React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React, Motion

 |
| **Servidor** | Node.js, Express, TypeScript via `tsx`<br> |
| **Validação** | Zod

 |
| **Modelos de IA** | SDK Google GenAI (`@google/genai`)

 |
| **Segurança** | Bcryptjs, SHA-256 para sessões, cabeçalhos de segurança HTTP, limitador de taxa

 |
| **Armazenamento** | Ficheiros JSON particionados por diretoria de utilizador (`data/user_${userId}/`)

 |

---

## Estrutura do Diretório

```text
career-lake/
├── data/                                 # Dados persistidos em disco[cite: 1, 2]
│   ├── users.json                        # Utilizadores registados e hashes de palavra-passe[cite: 1, 2]
│   └── user_<userId>/                    # Diretoria dedicada por conta[cite: 1, 2]
│       ├── lake.json                     # Histórico profissional e evidências[cite: 1, 2]
│       ├── jobs.json                     # Vagas guardadas[cite: 1, 2]
│       ├── analyses.json                 # Análises de aderência e matrizes[cite: 1, 2]
│       ├── cvs.json                      # Versões de currículos geradas[cite: 1, 2]
│       ├── cover_letters.json            # Cartas de apresentação geradas[cite: 1, 2]
│       ├── applications.json             # Histórico de candidaturas[cite: 1, 2]
│       ├── automations.json              # Configuração de agendamentos[cite: 1, 2]
│       └── background_jobs.json          # Registo e registos de execução de tarefas[cite: 1, 2]
├── docs/                                 # Documentação de arquitetura[cite: 1, 2]
├── server/                               # Servidor e lógica de negócio[cite: 1, 2]
│   ├── middleware/                       # Autenticação, limitação de taxa e cabeçalhos[cite: 1, 2]
│   ├── repositories/                     # Camada de abstração de acesso a dados[cite: 1, 2]
│   ├── scheduler/                        # Verificação de agendamentos temporais[cite: 1, 2]
│   ├── services/                         # Regras de negócio e validação de propriedade[cite: 1, 2]
│   ├── validation/                       # Esquemas Zod[cite: 1, 2]
│   ├── ai.ts                             # Chamadas à API Gemini[cite: 1, 2]
│   ├── app.ts                            # Inicialização da aplicação Express[cite: 1, 2]
│   ├── db.ts                             # Gestão de ficheiros e sessões em memória[cite: 1, 2]
│   ├── routes.ts                         # Definição das rotas REST[cite: 1, 2]
│   └── worker.ts                         # Processamento de tarefas assíncronas[cite: 1, 2]
├── src/                                  # Código-fonte do cliente[cite: 1, 2]
│   ├── components/                       # Painéis e formulários da aplicação[cite: 1, 2]
│   ├── lib/                              # Cliente HTTP e controlo de sessão local[cite: 1, 2]
│   ├── shared/                           # Definições de tipos comuns[cite: 1, 2]
│   ├── App.tsx                           # Gestão de estado principal e navegação[cite: 1, 2]
│   └── main.tsx                          # Arranque do cliente React[cite: 1, 2]
├── server.ts                             # Ponto de entrada de produção[cite: 1, 2]
├── package.json                          # Scripts e dependências[cite: 1, 2]
└── vite.config.ts                        # Configuração do empacotador Vite[cite: 1, 2]

```

---

## Execução

### Requisitos Prévios

* Node.js versão 20 ou superior.


* Chave de API Google Gemini.



### 1. Instalação de Dependências

```bash
git clone <url-do-repositorio>
cd career-lake
npm install

```

### 2. Variáveis de Ambiente

Criar um ficheiro `.env` na raiz:

```env
PORT=3000
GEMINI_API_KEY=sua_chave_aqui

```

### 3. Modo de Desenvolvimento

Inicia o cliente Vite e o servidor Express integrado:

```bash
npm run dev

```

Aceder através de `http://localhost:3000`.

### 4. Execução de Testes

```bash
npm test

```

### 5. Compilação e Produção

```bash
# Verificação de tipos
npm run lint

# Compilação dos ficheiros de frontend
npm run build

# Arranque do servidor compilado
npm start

```

---

## Regras de Validação e Grounding

1. **Separação de Domínio Técnico:** A posse de competências de gestão ou processos genéricos não valida requisitos específicos de áreas como farmacêutica ou indústria pesada. Nesses casos, o sistema sinaliza transferência funcional ou ausência de histórico direto.


2. **Validação de Identificadores:** Identificadores retornados pelos modelos de linguagem (`experienceId`, `projectId`, `evidenceId`) são filtrados face aos registos associados ao identificador do utilizador autenticado. Dados sem correspondência são descartados antes da escrita em disco.


3. **Auditabilidade de Conteúdo:** Parágrafos e pontos de currículo gerados mantêm registo interno do documento ou métrica de origem introduzida no Career Lake.
