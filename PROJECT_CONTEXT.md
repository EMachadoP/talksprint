# PROJECT_CONTEXT.md — TalkSprint

## Visão Geral do Projeto
**TalkSprint** é um aplicativo web intensivo (*conversation-first, mastery-driven*) projetado para levar falantes de português (com personalização contrastiva explícita para PT-BR) ao desempenho conversacional funcional equivalente a **CEFR B1** em **16 semanas**, seguindo um plano intensivo calibrado ao nível inicial e à carga horária real.

## Estado Atual (Produção com Gemini 2.5 Flash + Auth Real + PostgreSQL Ready)
- **Data da sessão:** 2026-11-23
- **Repositório GitHub:** https://github.com/EMachadoP/talksprint (branch `main`)
- **Deploy em Produção (Vercel):** https://talksprint.vercel.app
- **Secrets configurados na Vercel (Production):** `GEMINI_API_KEY` (ativo — `gemini-2.5-flash`) e `AUTH_SECRET` (ativo).
- **Neon PostgreSQL (Project ID `winter-river-14413089`):** Schema e migrations (`0001_init.sql` + `0002_auth_and_sessions.sql`) e repositório `pg` prontos; falta apenas autenticar o `neonctl` ou fornecer a `DATABASE_URL` / `NEON_API_KEY` para aplicar `npm run db:migrate` e ativar `DATABASE_URL` na Vercel.

## O Que Foi Feito Nesta Sessão (Eliminação de Mocks & Integrações Reais)
1. **Gemini 2.5 Flash Real (`src/lib/ai/gemini.ts`):**
   - Integrado ao `Tutor Orchestrator` (`/api/conversation`) para conversação real calibrada ao CEFR nos 3 modos (`coach`, `partner`, `examiner`) com feedback seletivo (máx. 2 erros) e Segunda Tentativa.
   - Integrado ao `Pronunciation Analyzer` (`/api/pronunciation`) com suporte multimodal a **áudio real gravado pelo microfone (`MediaRecorder` → base64)** e descarte imediato do áudio bruto após extração (LGPD).
   - Integrado ao `CEFR 8D Checkpoint Evaluator` (`/api/checkpoint`) com saída JSON estruturada nas 8 dimensões CEFR.
2. **Autenticação Real (`src/lib/auth/session.ts`, `/login`, `/api/auth/*`):**
   - Cadastro e login reais com hash `crypto.scrypt` + salt, sessões assinadas com HMAC-SHA256 em cookies `HttpOnly` (`SameSite=Lax`, `Secure` em produção).
   - Migration `db/migrations/0002_auth_and_sessions.sql` adicionando `password_hash`, `user_sessions`, `conversation_minutes` e `onboarding_completed`.
3. **PostgreSQL Repository Real (`src/lib/db/postgres-repository.ts` & `src/lib/db/repository.ts`):**
   - Implementação completa com `pg.Pool` (SSL Neon) para `users` (PII), `learner_profiles`, `competency_nodes`, `learning_events` (idempotente) e `cefr_checkpoints`.
4. **Remoção Total de Dados Mockados:**
   - Todo aluno novo começa com `MUT = 0%`, `0 min` de conversação, `retention7DayPercent = 0%` (calculado dos `REVIEW_COMPLETED` reais dos últimos 7 dias) e 10 chunks reais das Semanas 1–4 sem domínio pré-marcado.
   - Inputs limpos em `/onboarding`, `/pronunciation` (com gravador real de microfone) e `/dashboard`.

## Pendência Única para Persistência Permanente no Neon
- Fornecer a `DATABASE_URL` do projeto Neon `winter-river-14413089` (ou uma `NEON_API_KEY` para consulta via `neonctl`) → gravar em `vercel env add DATABASE_URL production` → executar `npm run db:migrate` → redeploy.
