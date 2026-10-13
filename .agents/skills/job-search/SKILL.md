---
name: job-search
description: Como funciona a busca de vagas via prompt (pedido em texto → plano editável → LinkedIn → triagem → fit → CV ATS), com as regras que o código impõe. Use ao mexer na aba "Busca por Vagas", no coletor do LinkedIn, na triagem ou no ranking.
---

# Busca de vagas via prompt

Regra de ouro: etapas baratas e determinísticas primeiro; o LLM só lê e classifica, e toda afirmação dele sobre uma vaga precisa de um trecho literal que o código confere.

## 1. Pedido → plano (`POST /api/job-search/plan`)

`server/ai-search.ts` → `planSearchFromPrompt(prompt, lake)` (modelo rápido) devolve termos, termos sugeridos pelo perfil, locais com modalidades por local, janela de dias, meta de vagas, quantas analisar, termos que excluem pelo título, regras que precisam do texto, exceções, prioridades de nível/setor e se gera CV.
`planFromDraft`/`sanitizePlan` (`server/services/job-search.service.ts`) limitam tudo (`PLAN_LIMITS` em `src/shared/searchPlan.ts`). O usuário revisa e edita o plano na tela antes de rodar; buscas podem ser salvas (`search_agents.prompt/plan`).

## 2. Execução (`POST /api/job-search/run` → worker `job_search_agent`)

`runPlanSearch(plan, lake, existingJobs, deps)`:
1. **Coleta**: termo × local no endpoint público `jobs-guest` (`server/services/job-scraper.service.ts`), com `f_TPR` (dias) e `f_WT` (modalidades). Requisições espaçadas, backoff em 429, orçamento por execução.
2. **Filtros em código** (sem abrir a vaga): duplicadas (id e empresa+título+local), já salvas, termo excluído no título, fora do Brasil (busca no Brasil), título fora da área (`offTopic`: nenhuma palavra de área em comum com os termos nem com os cargos do Lake; "analista", "pleno" etc. não contam).
3. **Ondas de 10**: abre os detalhes por prioridade até bater a meta ou o orçamento. Repostagem = mesmo texto (`textSimilarity` ≥ 0,8).
4. **Triagem** (`screenJobPostings`, 5 vagas por chamada): modalidade, contrato, nível, setor e violações das regras, cada uma com citação. Citação que não está no texto → descartada (modalidade/contrato viram "Não informado"). Cada violação citada passa por uma **segunda leitura** (`verifyRuleClaims`): só descarta se o trecho prova a regra ("desejável" não é obrigatório; espanhol não prova inglês). Sem a segunda leitura disponível, nenhuma regra é aplicada.
5. **Local remoto**: em local só-remoto, o texto precisa dizer remoto.
6. **Ranking**: pré-ranking (área do título vs termos/Lake + skills do Lake no texto) + prioridades (nível ±15, setor +10) + termos que acharam a vaga.
7. **Fit** das `analyzeTop` melhores (`parseJob` + `analyzeFit`, nota calculada em código); falhas por indisponibilidade do modelo têm uma segunda tentativa no fim.
8. **CV**: com `autoTailorCv`, gera CV ATS para as vagas com recomendação "Sim" (até 5).

"Vale a pena?" (`recommend` em `src/shared/searchPlan.ts`): requisito crítico sem evidência → Não; nota ≥ 60 → Sim; ≥ 40 → Talvez; senão Não.

## 3. Resultado (`GET /api/job-search/runs/:id`)

Vagas na ordem do ranking com análise e se já há CV, as que já estavam salvas, e as descartadas com o motivo (inclui o trecho que provou a regra). `job.searchMeta` guarda modalidade/contrato com a citação, setor, candidaturas, data e termos.

## Cuidados

- LinkedIn: uso pessoal e baixo volume (ToS). Não aumentar páginas/limites sem necessidade.
- Testes do pipeline com LinkedIn e IA falsos: `tests/job_search.test.ts`.
