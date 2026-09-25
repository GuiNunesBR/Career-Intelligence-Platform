# Career Lake — Career Intelligence Platform

Plataforma de inteligência de carreira orientada a evidências (*evidence-first*), projetada sob a premissa de que o histórico profissional auditado é a única fonte da verdade e o currículo é uma projeção contextualizada para uma oportunidade específica.

---

## Princípio Arquitetural: Evidence-First

O Career Lake impede a invenção de qualificações ou inflação de competências por modelos de linguagem. Toda afirmação, pontuação de aderência ou documento gerado deriva exclusivamente de fatos estruturados com métricas, contextos e fontes auditáveis.

```text
               ┌────────────────────────────────────────────────────────┐
               │              Career Lake (Ground Truth)                │
               │  - Experiências com métricas e contexto de negócio     │
               │  - Projetos com tecnologias e entregáveis mensurados   │
               │  - Competências categorizadas por proficiência e tempo │
               │  - Repositório de evidências diretas e transferíveis   │
               └───────────────────────────┬────────────────────────────┘
                                           │
                                           ▼
      Requisitos da Vaga ──► [ Matriz Probatória / Fit ] ◄── Evidências Auditadas
                                           │
                                           ▼
       ┌─────────────────────────────────────────────────────────────────────────┐
       │                       Documentos Direcionados                           │
       │  - Currículo Sob Medida (Modos: Conservador, Equilibrado, Agressivo)     │
       │  - Carta de Apresentação fundamentada em entregas reais                 │
       │  - Relatório de Auditoria e Proveniência com citações de evidências      │
       └─────────────────────────────────────────────────────────────────────────┘

```

---

## Funcionalidades Principais

* **Repositório Centralizado (Career Lake):** Cadastro e governança de experiências profissionais, escopos de projetos, inventário de competências técnicas/funcionais e banco de evidências com métricas auditáveis e grau de confiança (`high`, `medium`, `low`).


* **Job Intelligence & Evidence Matrix:** Parser estruturado de descrições de vagas com extração de requisitos por categoria e criticidade. Mapeia cada requisito contra evidências reais, classificando como *Direta*, *Derivada*, *Transferível* ou *Gap explícito*.


* **Geração de CV & Tailoring com Anti-Alucinação:** Projeção direcionada do perfil profissional para a vaga. Suporta modos de personalização (Conservador, Equilibrado e Agressivo) com auditoria de integridade e notas de proveniência.


* **Pipeline de Candidaturas (Kanban / ATS Tracker):** Gestão visual do funil seletivo (desde *Saved* e *Ready to Apply* até *Interview*, *Offer* ou *Rejected*), com linha do tempo de eventos, notas e alvos salariais.


* **Automações Recorrentes & Timezones:** Configuração de rotinas periódicas (diárias ou semanais) vinculadas ao fuso horário do usuário (ex.: `America/Sao_Paulo`).


* **Fila Assíncrona & Background Worker:** Processamento em segundo plano desacoplado da navegação, com estados formais (`queued`, `running`, `completed`, `failed`, `cancelled`), chaves determinísticas de idempotência e política de retentativas.


* **Isolamento Multiusuário Estrito:** Particionamento integral de dados por usuário, autenticação criptográfica de senhas via Bcrypt, gerenciamento de sessões via hash SHA-256 e resolução exclusiva do contexto via token Bearer.



---

## Stack Tecnológica

| Camada | Tecnologias Utilizadas |
| --- | --- |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React, Motion

 |
| **Backend** | Node.js, Express, TypeScript (`tsx`)

 |
| **Validação** | Zod (schemas HTTP e contratos de saída de IA)

 |
| **Inteligência Artificial** | Google GenAI SDK (`@google/genai` / Gemini 2.5/Flash)

 |
| **Segurança & Criptografia** | Bcryptjs, SHA-256 token hashing, security headers, rate limiting

 |
| **Persistência Atual** | File-system repository em JSON particionado por usuário (`data/user_${userId}/`)

 |

---

## Estrutura do Projeto

```text
career-lake/
├── data/                                 # Repositório de dados particionado por usuário[cite: 1, 2]
│   ├── users.json                        # Cadastro de usuários locais e hashes de senha[cite: 1, 2]
│   └── user_<userId>/                    # Diretórios isolados por usuário[cite: 1, 2]
│       ├── lake.json                     # Perfil, experiências, projetos, skills e evidências[cite: 1, 2]
│       ├── jobs.json                     # Vagas salvas e cadastradas[cite: 1, 2]
│       ├── analyses.json                 # Análises de fit e matrizes probatórias[cite: 1, 2]
│       ├── cvs.json                      # Currículos customizados gerados[cite: 1, 2]
│       ├── cover_letters.json            # Cartas de apresentação geradas[cite: 1, 2]
│       ├── applications.json             # Pipeline de candidaturas[cite: 1, 2]
│       ├── automations.json              # Configurações de agendamentos recorrentes[cite: 1, 2]
│       └── background_jobs.json          # Histórico e logs de jobs do worker[cite: 1, 2]
├── docs/                                 # Documentação técnica e arquitetural[cite: 1, 2]
│   └── ARCHITECTURE_CURRENT.md           # Visão detalhada do estado da arquitetura[cite: 1, 2]
├── server/                               # Camada de backend e serviços de inteligência[cite: 1, 2]
│   ├── middleware/                       # Autenticação, rate limiting e segurança[cite: 1, 2]
│   ├── repositories/                     # Interfaces e implementações de acesso a dados[cite: 1, 2]
│   ├── scheduler/                        # Agendador de automações por timezone[cite: 1, 2]
│   ├── services/                         # Regras de negócio, grounding e sanitização[cite: 1, 2]
│   ├── validation/                       # Schemas Zod de API e IA[cite: 1, 2]
│   ├── ai.ts                             # Wrapper e integração com Google GenAI / Gemini[cite: 1, 2]
│   ├── app.ts                            # Configuração da aplicação Express[cite: 1, 2]
│   ├── db.ts                             # Gerenciador de persistência e sessões[cite: 1, 2]
│   ├── routes.ts                         # Endpoints da API REST[cite: 1, 2]
│   └── worker.ts                         # Motor de processamento da fila de tarefas[cite: 1, 2]
├── src/                                  # Aplicação cliente (Single Page Application)[cite: 1, 2]
│   ├── components/                       # Visões de Dashboard, Lake, Analyzer, Tailoring, etc.[cite: 1, 2]
│   ├── lib/                              # Client HTTP e controle de sessão (`api.ts`)[cite: 1, 2]
│   ├── shared/                           # Interfaces e contratos TypeScript compartilhados[cite: 1, 2]
│   ├── App.tsx                           # Componente raiz e gerenciador de estado global[cite: 1, 2]
│   └── main.tsx                          # Ponto de entrada React[cite: 1, 2]
├── server.ts                             # Servidor de produção Node.js[cite: 1, 2]
├── package.json                          # Dependências e scripts de execução[cite: 1, 2]
└── vite.config.ts                        # Configuração do Vite e Tailwind CSS[cite: 1, 2]

```

---

## Como Executar

### Pré-requisitos

* **Node.js**: versão 20.x ou superior.


* **Chave da API Gemini**: obtenha em [Google AI Studio](https://aistudio.google.com/?utm_source=gemini).



### 1. Clonar o repositório e instalar dependências

```bash
git clone <url-do-repositorio>
cd career-lake
npm install

```

### 2. Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
PORT=3000
GEMINI_API_KEY=sua_chave_gemini_aqui

```

### 3. Modo de Desenvolvimento

Inicie a aplicação completa (frontend Vite com middleware Express integrado):

```bash
npm run dev

```

Acesse a aplicação no navegador em `http://localhost:3000`.

### 4. Execução dos Testes Automatizados

Execute a suíte de testes de isolamento, autenticação e validação de grounding:

```bash
npm test

```

### 5. Verificação de Tipos e Build de Produção

```bash
# Checagem de tipagem estrita
npm run lint

# Build dos assets do frontend
npm run build

# Execução em ambiente de produção
npm start

```

---

## Regras de Governança e Anti-Alucinação

1. **Separação entre Domínio e Competência Funcional:** Se uma vaga exige competência em setor específico (ex.: *Cosméticos* ou *Capex Industrial*) e o candidato possui apenas competências de liderança ou gestão genéricas, o motor classifica a exigência como competência transferível ou ausência de evidência, sem gerar falsos positivos.


2. **Grounding Estrito de Identificadores:** Identificadores de experiências (`experienceId`), projetos (`projectId`) ou evidências (`evidenceId`) retornados pela IA passam por filtro de pertinência no backend. IDs inexistentes ou de contas terceiras são eliminados antes de qualquer escrita no banco de dados.


3. **Imutabilidade da Evidência Comprovada:** Os textos gerados em cartas de apresentação e currículos mantêm links diretos de auditoria para os relatórios, atas e contratos cadastrados no Career Lake.
