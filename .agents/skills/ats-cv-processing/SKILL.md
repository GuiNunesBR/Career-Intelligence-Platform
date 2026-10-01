---
name: ats-cv-processing
description: Diretrizes e melhores práticas para processamento, parsing e leitura de Currículos (CVs) focado em compatibilidade com ATS (Applicant Tracking System).
---

# ATS e Processamento de CVs

Sempre que trabalhar na funcionalidade de Leitor/Parser de Currículos, aplique estas regras:

1. **Estrutura de CVs**:
   - Os currículos variam imensamente em formato (cronológico, funcional, híbrido).
   - Elementos visuais complexos (tabelas, colunas duplas, gráficos) muitas vezes quebram a leitura (parsing) linear. A extração deve linearizar o texto da esquerda para a direita, de cima para baixo, lidando com colunas adequadamente.
   - O parser deve ser capaz de identificar seções baseadas em títulos padrão como "Experiência Profissional", "Formação Acadêmica", "Competências/Habilidades", "Resumo Profissional" e "Projetos".

2. **Como o ATS lê os dados (Applicant Tracking System)**:
   - Sistemas ATS avaliam a aderência de um currículo buscando palavras-chave exatas (hard skills, certificações, ferramentas) que constam na descrição da vaga.
   - O leitor deve extrair as habilidades de forma semântica e cruzá-las com a vaga para preencher o array `atsKeywordsMatched`.
   - Datas devem ser tratadas com tolerância (ex: "Jan 2020 - Atual", "01/2020 a 12/2022") e padronizadas para facilitar a filtragem por tempo de experiência no ATS.
   - Dados de contato (Email, Telefone, LinkedIn) localizam-se tipicamente no cabeçalho.

3. **Estratégia de Implementação e Mapeamento de Dados (Schema)**:
   - O fluxo ideal extrai o texto (via OCR ou bibliotecas como pdf-parse) e utiliza um LLM para inferir e estruturar as entidades.
   - A saída do parser deve sempre estar em conformidade com o formato JSON do domínio da aplicação, estruturado da seguinte forma:
     - `headline`: O título atual ou principal foco do candidato extraído do cabeçalho ou resumo.
     - `summary`: O texto do resumo profissional do candidato.
     - `selectedExperiences`: Array contendo as experiências profissionais estruturadas (`company`, `title`, `period`, `bullets` com as descrições/conquistas, e `evidenceCitations`).
     - `selectedSkills`: Array de habilidades extraídas (com `name` e `category`).
     - `selectedProjects`: Array de projetos relevantes (com `name`, `description` e `outcomes`).
     - `atsKeywordsMatched`: Um array simples de strings contendo as palavras-chave críticas identificadas no CV que reforçam o score no ATS.
   - Este formato garante a compatibilidade do currículo processado com os fluxos internos de validação, pontuação e indexação do Career-Lake.
