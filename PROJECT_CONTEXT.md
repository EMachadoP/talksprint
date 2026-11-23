# PROJECT_CONTEXT.md — TalkSprint

## Visão Geral do Projeto
**TalkSprint** é um aplicativo web intensivo (*conversation-first, mastery-driven*) projetado para levar falantes de português (com personalização contrastiva explícita para PT-BR) ao desempenho conversacional funcional equivalente a **CEFR B1** em **16 semanas**, seguindo um plano intensivo calibrado ao nível inicial e à carga horária real (referências Cambridge: 350–400h acumuladas para B1 partindo do zero).

### Promessa Central
> "Alcance desempenho conversacional funcional equivalente a B1 nas situações mais importantes para você em 16 semanas, seguindo o plano intensivo recomendado."

## Estado Atual
- **Fase:** Inicialização de arquitetura, plano de implementação e setup do projeto.
- **Data da sessão:** 2026-11-23
- **Repositório:** Inicializado localmente (`main`), pronto para criação de remote no GitHub (`EMachadoP/talksprint`) e deploy na Vercel.

## Decisões Arquiteturais
1. **Stack Principal:** Next.js (App Router) + React 19 + TypeScript + Tailwind CSS v4 + Vitest + Zod.
   - **Avaliação Astryx:** Avaliada a adoção para React 19+; optou-se por React 19 nativo (Server/Client Components + hooks enxutos + persistência offline-first via event log) para priorizar simplicidade, baixo custo e zero dependências desnecessárias.
2. **Arquitetura Modular Monolith:**
   - Domínio pedagógico puro em `src/lib/domain/` (100% testado via TDD com Vitest):
     - `placement.ts` — Placement adaptativo e cálculo do plano de 16 semanas
     - `adaptive-engine.ts` — Grafo de competências, prioridade determinística (`0.30R + 0.25G + 0.20C + 0.15T + 0.10U`), SRS produtivo (6 estágios) e cálculo de MUT
     - `curriculum.ts` — Currículo TBLT de 16 semanas e templates de aula (45min, 18min pronúncia, 30min conversação)
     - `pronunciation.ts` — Diagnóstico fonético contrastivo PT-BR (epêntese, consoantes finais, `-ed/-s`, `/θ ð/`) + política de extração e descarte de áudio
     - `tutor-orchestrator.ts` — Orquestrador vendor-neutral de conversação IA (modos `coach`, `partner`, `examiner`) com feedback corretivo seletivo (máx. 2 alvos)
     - `assessment.ts` — Rubrica multidimensional CEFR (8 dimensões separadas de ASR) e checkpoints de transferência com tarefas inéditas
     - `sync.ts` — Processamento idempotente de eventos offline-first
   - Persistência & Migrations:
     - `db/migrations/0001_init.sql` — Schema relacional PostgreSQL com separação de PII (`users`) e eventos pseudônimos (`learning_events`), pronto para LGPD.
     - `src/lib/db/repository.ts` — Repositório desacoplado com adapter PostgreSQL (via `DATABASE_URL`) e fallback resiliente para ambientes sem banco provisionado.
3. **Design System (`frontend-design`):**
   - Direção estética: *Editorial Utilitarian — Estúdio de Imersão Linguística* (DFII 15/15).
   - Fontes: `Fraunces` (display), `Plus Jakarta Sans` (corpo), `JetBrains Mono` (IPA/métricas).
   - Paleta: Papel editorial `#F7F4EE`, tinta `#141918`, esmeralda estúdio `#0E6B50`, terracota fonética `#C84B31`.
   - Âncora visual: Passaporte de Capacidade CEFR + Medidor analógico MUT + Cartão de Contraste Fonético IPA.
4. **Privacidade (LGPD) & Segurança:**
   - Separação de PII vs. eventos pseudônimos vs. áudio.
   - Áudio bruto descartado por padrão após extração de features; opt-in explícito para portfólio de pronúncia.
   - Headers de segurança HTTP, validação Zod em todas as APIs, rate limiting e proteção contra prompt injection.

## Skills Utilizadas
- `writing-plans`, `test-driven-development`, `frontend-design`, `lint-and-validate`, `security-auditor` / hardening, `api-patterns`, `ci-cd` (GitHub Actions + Vercel).

## Arquivos Criados / Alterados
- `PROJECT_CONTEXT.md` (criado)
- `docs/superpowers/plans/2026-11-23-talksprint-mvp.md` (em criação)

## Pendências & Próximos Passos
- [ ] Scaffold do projeto Next.js 16 + TypeScript + Tailwind + Vitest + Zod
- [ ] Criar migration SQL (`db/migrations/0001_init.sql`) e camada de repositório
- [ ] Implementar domínio pedagógico com TDD (Red → Green → Refactor)
- [ ] Implementar APIs REST validadas com Zod e rate limiting
- [ ] Implementar interface Editorial Utilitarian (Onboarding/Placement, Hoje, SRS, Conversação IA, Pronúncia PT-BR, Roadmap 16 Semanas, Dashboard MUT/CEFR, Privacidade LGPD)
- [ ] Configurar GitHub Actions CI e documentação (`README.md`, `docs/ARCHITECTURE.md`)
- [ ] Criar repositório GitHub, commits por etapas e push
- [ ] Executar deploy na Vercel e validar fluxos em produção com Agent Browser
