# PROJECT_CONTEXT.md — TalkSprint

## Visão Geral do Projeto
**TalkSprint** é um aplicativo web intensivo (*conversation-first, mastery-driven*) projetado para levar falantes de português (com personalização contrastiva explícita para PT-BR) ao desempenho conversacional funcional equivalente a **CEFR B1** em **16 semanas**, seguindo um plano intensivo calibrado ao nível inicial e à carga horária real.

## Estado Atual (100% Operacional em Produção — Auditado Visualmente & Hardened)
- **Data da última atualização:** 2026-11-23
- **URL de Produção (Vercel):** https://talksprint.vercel.app
- **Repositório GitHub:** https://github.com/EMachadoP/talksprint (branch `main`)
- **Banco de Dados (Neon PostgreSQL — `winter-river-14413089`):** Conectado em produção (`storage: "neon-postgresql"`), migrations `0001_init.sql` e `0002_auth_and_sessions.sql` aplicadas e validadas.
- **IA & Áudio (Gemini API):** Ativa em produção (`aiProvider: "gemini-3.1-flash-lite"`, fallback `gemini-3-flash-preview`).
- **Secrets de Produção (Vercel):** `DATABASE_URL`, `GEMINI_API_KEY` e `AUTH_SECRET` configurados exclusivamente em Production.

## Auditoria Visual, Responsiva, Acessibilidade e Segurança (2026-11-23)
### Problemas Comprovados e Corrigidos
1. **Overflow horizontal em `360px` e `390px` (Landing, Hoje, Conversação, Privacidade):**
   - Cabeçalho da Landing (`src/app/page.tsx`) e do `AppShell` (`src/components/AppShell.tsx`) excediam 360px/390px, cortando botões (`Placement`, `Entrar`) e empurrando títulos e cards para fora da tela. Corrigido com header mobile compacto, badges `hidden sm:inline-block`, `min-w-0` e `whitespace-nowrap`.
2. **Estouro de navegação em `1024px` (`today-1024.png`):**
   - A barra inline de 7 links em `lg:flex` (1024px) quebrava em duas linhas e empurrava os botões de status/auth para fora da margem direita. Movido o menu inline para `xl:flex` (`1280px+`) e mantida barra horizontal limpa (`no-scrollbar`) para `< 1280px`.
3. **Acessibilidade WCAG 2.2:**
   - Adicionados `:focus-visible` global de alto contraste, link "Pular para o conteúdo principal", `aria-current="page"` nos links ativos, `role="progressbar"` no `MutGauge`, suporte a `prefers-reduced-motion` e contraste reforçado em `--ink-muted`, `--accent-emerald` e `--accent-terracotta`.
4. **Remoção de resquícios de fallback/mock:**
   - Removido fallback hardcoded de ditado em `src/app/conversation/page.tsx` e fallback `0.33`/`A1+` em `src/app/srs/page.tsx`.
5. **Segurança & Hardening:**
   - Removido reuso de `GEMINI_API_KEY` como fallback de `AUTH_SECRET` em `src/lib/auth/session.ts` (agora exige `AUTH_SECRET` em produção).
   - Rate-limiting atualizado para chaveamento por IP (`getClientIp`) e estendido para `/api/auth/login` (15 req/min) e `/api/auth/register` (10 req/min) contra brute-force.
   - `AbortController` adicionado ao `fetch("/api/auth/me")` no `AppShell`.

## Auditoria de Segurança Profunda (`security/audit-2026-11-23` — Mesclada em `main` e Deployada em Produção)
- **Branch:** `security/audit-2026-11-23` mesclada em `main` e publicada em produção (`https://talksprint.vercel.app`).
- **Achados corrigidos e retestados (35/35 testes passando):**
  - `SEC-001` (Alta): Autenticação obrigatória (`401`) nas rotas de IA e mutação (`/api/conversation`, `/api/pronunciation`, `/api/checkpoint`, `/api/srs/review`, `/api/sync`, `/api/onboarding`, `/api/privacy`) + rate-limit por usuário/IP + allowlist de `audioMimeType` (cap 2 MB).
  - `SEC-002` (Alta): `ssl: { rejectUnauthorized: true }` restaurado no pool PostgreSQL Neon (`src/lib/db/postgres-repository.ts`).
  - `SEC-003` (Média): `Cache-Control: no-store, private, max-age=0` em `/api/*`, HSTS e remoção de `'unsafe-eval'` da CSP em produção (`next.config.ts`).
  - `SEC-004` (Média): Proteção CSRF (`verifyCsrfOrigin` validando `Sec-Fetch-Site` e `Origin`/`Host`) em todas as rotas mutáveis (`src/lib/security/csrf.ts`).
  - `SEC-005` (Média): Proteção contra timing side-channel no login (hash `scrypt` dummy em tempo constante) + rate-limit por conta além do IP.
  - `SEC-006` (Média): Validação estrita com schemas `zod` na saída JSON do Gemini (`tutor-orchestrator.ts`, `pronunciation.ts`).
  - `SEC-007` (Média): `jti` + revogação server-side de sessões via `user_sessions` no Neon e cache de revogação no logout e `DELETE /api/privacy`.
  - `SEC-009` (Baixa): Audit logging estruturado (`src/lib/security/audit-log.ts`) sem vazar senhas, cookies ou tokens.
- **Suíte de regressão criada:** `tests/security/security-regression.test.ts` (6 testes).
- **Decisão de Release:** `RELEASE WITH CONDITIONS` após merge/deploy desta branch + rotação preventiva da `GEMINI_API_KEY` (enviada em texto claro no chat).

## Riscos Residuais & Próximos Passos
- Rate limiting atual é em memória por instância serverless; em escala maior, migrar para Redis/Upstash.
- Expandir banco de conteúdo com pacotes completos das Semanas 5–16 e camada de Peer Exchange / Tutor Humano.
