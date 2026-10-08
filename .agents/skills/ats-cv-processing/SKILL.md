---
name: ats-cv-processing
description: Como o Career Lake lê currículos (PDF → Career Lake) e gera CVs ATS sob medida (Lake + vaga → PDF), com as regras anti-alucinação que o código impõe. Use ao mexer no upload/parse de CV, no import do Lake, no tailoring ou na exportação/checagem ATS.
---

# Leitura e geração de CVs (ATS)

Regra de ouro: toda afirmação vem de um registro do Career Lake. O LLM extrai, classifica e redige; o código valida e calcula. Sem modelo disponível, a operação falha com `AIError` (server/ai-provider.ts) — nunca há fallback heurístico que invente dados.

## 1. Leitura do PDF (CV do usuário → texto)

`server/services/pdf-extract.service.ts` → `extractResumeText(buffer)`
- Rejeita não-PDF (magic `%PDF-`) e PDF sem camada de texto (escaneado) com `PdfExtractionError` (422) e mensagem para o usuário. Limite de upload: 5 MB (rota `/lake/upload-cv`).
- Ordem de leitura por coordenadas: detecta duas colunas por página e lê em faixas (linhas de largura total no lugar; dentro da faixa, coluna esquerda e depois a direita).
- Normaliza: NFC, hifenização, bullets, remove cabeçalho/rodapé repetido em todas as páginas.
- Importar `pdf-parse/lib/pdf-parse.js`, nunca `pdf-parse` (o index roda um autoteste sob ESM).

## 2. Parse para o Career Lake (texto → registros)

`server/ai.ts` → `parseResumeToLake(text)` devolve `ParsedResume` (validado por Zod):
- `contact` (nome, e-mail, telefone, LinkedIn, links, cidade/UF/país, disponibilidade, CNH) — nunca na headline.
- `profile` (headline curta, summary, location, targetRoles = só cargos, education, languages `{language, proficiency}`, certifications).
- `experiences[]` com `achievements[]`: `excerpt` COPIADO LITERALMENTE do CV, action, result, metric (como escrito), tools, competency.
- `projects[]`, `skills[]`.

`server/services/resume-import.service.ts` → `buildResumeImport(parsed, text)` aplica checagens em código:
- excerpt encontrado no texto → confiança high/medium; senão low (e aviso).
- métrica só fica se seus números estão no próprio excerpt.
- headline sem e-mail/URL/telefone/nome, ≤120 caracteres; targetRoles sem o nome da pessoa.
- experiência sem cargo ou empresa é ignorada (com aviso), nunca preenchida com placeholder.

`SqliteCareerLakeRepository.importResume` mescla no Lake (transação): casa experiência por empresa+cargo+mês de início (mantém o id), troca só evidências com `source = 'Currículo importado'`, remove registros `origin = 'cv'` que saíram do CV (exceto se tiverem evidência manual). Registros `origin = 'manual'` nunca são removidos pelo import.

## 3. Geração do CV sob medida (Lake + vaga → conteúdo)

`server/ai.ts` → `generateTailoredCVContent` recebe o Lake com ids, a vaga e a Evidence Matrix. Cada bullet vem como `{ text, evidenceIds }`.

`server/services/cv-grounding.service.ts` → `groundTailoredCV` (fact-checker em código):
- bullet precisa citar evidência da própria experiência (ou o id da experiência = sua descrição); senão é removido.
- todo número do bullet tem que existir, como número inteiro, nas fontes citadas (`ungroundedNumbers` em src/shared/text.ts; "B2B" não conta como 2).
- empresa, cargo e período sempre vêm do Lake; skills e projetos só se existirem no Lake.
- resumo/headline: frases com números sem fonte são removidas (anos de experiência derivados das datas são permitidos).
- `TailoringService` faz no máximo uma nova tentativa com o motivo das rejeições; o que for removido fica em `groundingIssues` e aparece para o usuário.
- Idioma do CV = idioma da vaga (`detectLanguage`), salvo escolha do usuário.

## 4. Arquivo e checagem ATS

`server/services/cv-render.service.ts`:
- `buildCvHtml`: coluna única, Arial 10.5pt, sem tabelas/ícones/colunas, contato no corpo (não em header/footer), títulos padrão por idioma (Resumo Profissional, Experiência Profissional, Formação Acadêmica, Habilidades, Idiomas, Certificações, Projetos), experiência como `Cargo | Empresa | MM/AAAA – Atual`.
- `renderPdf` (Puppeteer) gera PDF com camada de texto real. Rota: `GET /api/jobs/:jobId/cv/pdf`.
- `atsCheck` relê o PDF gerado com o mesmo extrator e reporta seções detectadas e ordem, contato, páginas, cobertura das palavras-chave da vaga que o Lake comprova e as que o Lake não comprova. Rota: `GET /api/jobs/:jobId/cv/ats-check`. Não existe "nota ATS universal": apresentar como checklist.
