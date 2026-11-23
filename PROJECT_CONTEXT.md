# PROJECT_CONTEXT.md — TalkSprint

## Visão Geral do Projeto
**TalkSprint** é um aplicativo web intensivo (*conversation-first, mastery-driven*) projetado para levar falantes de português (com personalização contrastiva explícita para PT-BR) ao desempenho conversacional funcional equivalente a **CEFR B1** em **16 semanas**, seguindo um plano intensivo calibrado ao nível inicial e à carga horária real (referências Cambridge: 90–100h A1, 180–200h A2, 350–400h B1).

## Estado Atual (Finalizado — MVP em Produção)
- **Data da sessão:** 2026-11-23
- **Repositório GitHub:** https://github.com/EMachadoP/talksprint (branch `main`)
- **Deploy em Produção (Vercel):** https://talksprint.vercel.app
- **Qualidade & Testes:**
  - `npm run typecheck` — 0 erros
  - `npm run lint` — 0 erros, 0 warnings
  - `npm test` — 8 suites, **26/26 testes passando** (domínio pedagógico + rotas API)
  - `npm run build` — 21 rotas compiladas com sucesso

## O Que Foi Feito Nesta Sessão
1. **Planejamento & Arquitetura:**
   - Plano completo salvo em `docs/superpowers/plans/2026-11-23-talksprint-mvp.md` e documentação arquitetural em `docs/ARCHITECTURE.md` e `README.md`.
   - Avaliação explícita de **Astryx** para React 19+: optou-se por React 19 nativo com Next.js App Router e fila offline-first de eventos imutáveis para priorizar simplicidade, baixo custo e zero dependências desnecessárias.
2. **Banco de Dados & Migrations (LGPD Privacy by Design):**
   - Criada migration SQL versionada em `db/migrations/0001_init.sql` separando `users` (PII) de `learner_profiles`, `competency_nodes`, `learning_events` (idempotente), `pronunciation_features` (áudio bruto descartado por padrão) e `cefr_checkpoints`.
   - Script `scripts/migrate.mjs` (`npm run db:migrate`) + adapter de repositório em `src/lib/db/repository.ts`.
3. **Domínio Pedagógico Implementado com TDD (Red → Green → Refactor):**
   - `src/lib/domain/curriculum.ts` — Currículo completo de 16 semanas (TBLT), template de aula de 45 min (9 etapas) e missões conversacionais.
   - `src/lib/domain/placement.ts` — Placement adaptativo calibrado a Cambridge, variante do português (`pt-BR`, `pt-PT`, `other`) e blocos diários.
   - `src/lib/domain/adaptive-engine.ts` — Fórmula determinística `0.30R + 0.25G + 0.20C + 0.15T + 0.10U`, SRS produtivo em 6 níveis e cálculo de **MUT (Mastery Under Transfer)**.
   - `src/lib/domain/pronunciation.ts` — Diagnóstico contrastivo PT-BR (epêntese, `-ed`, `/θ ð/`) com política LGPD de extração e descarte de áudio.
   - `src/lib/domain/tutor-orchestrator.ts` — Orquestrador vendor-neutral (modos `coach`, `partner`, `examiner`), sanitização contra prompt injection, feedback seletivo (máx. 2 alvos) e Segunda Tentativa.
   - `src/lib/domain/assessment.ts` — Rubrica CEFR de 8 dimensões separada de ASR + seleção automática de tarefas inéditas em checkpoints + relatório semanal orientado a capacidade.
   - `src/lib/domain/sync.ts` — Merge idempotente de eventos offline-first por `eventId`.
4. **APIs REST & Segurança:**
   - 9 Route Handlers em `src/app/api/` validados com Zod (`health`, `onboarding`, `today`, `srs/review`, `conversation`, `pronunciation`, `checkpoint`, `sync`, `privacy`).
   - Headers HTTP de segurança em `next.config.ts` (`CSP`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) e rate limiting em `src/lib/security/rate-limit.ts`.
5. **Interface Editorial Utilitarian (`frontend-design`, DFII 15/15):**
   - Fontes `Fraunces` + `Plus Jakarta Sans` + `JetBrains Mono`, paleta papel editorial `#F7F4EE` + esmeralda `#0E6B50` + terracota `#C84B31`.
   - Componentes âncora: `MutGauge` (Passaporte CEFR + MUT) e `PhoneticCard` (contraste fonético IPA com áudio TTS).
   - 9 páginas funcionais: `/`, `/onboarding`, `/today`, `/srs`, `/conversation`, `/pronunciation`, `/roadmap`, `/dashboard`, `/privacy`.
6. **CI/CD, Git & Deploy:**
   - Template de CI salvo em `docs/ci-github-actions.yml` (e `.github/workflows/ci.yml` local; o push remoto do workflow requer escopo `workflow` no token `gh` se reativado).
   - Commits semânticos por etapa, push para `EMachadoP/talksprint` e deploy em produção na Vercel (`https://talksprint.vercel.app`).

## Pendências & Próximos Passos
- **Validação visual interativa via Agent Browser:** O Chrome local estava sem `DevToolsActivePort` ativo nesta sessão; todos os endpoints e páginas de produção foram validados via smoke test HTTP/JSON. Para rodar o Agent Browser na próxima sessão, abra o Chrome com remote debugging em `chrome://inspect/#remote-debugging`.
- **Persistência PostgreSQL em Produção:** Configurar `DATABASE_URL` (Neon/Supabase/Cloud SQL) nas Environment Variables da Vercel e executar `npm run db:migrate`.
- **Provedores de IA/Speech reais (opcional):** Configurar `OPENAI_API_KEY` ou `GEMINI_API_KEY` para expandir o `Tutor Orchestrator` além do motor determinístico pedagógico.
- **Peer Exchange / Tutor Humano:** Integrar camada WebRTC/agendamento para sessões humanas a partir das Semanas 3–4.
