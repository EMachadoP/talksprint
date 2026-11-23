# TalkSprint MVP Implementation Plan

> **For agentic workers:** Execute task-by-task following strict TDD (RED → GREEN → REFACTOR) and semantic commits per milestone.

**Goal:** Build and deploy TalkSprint, an intensive 16-week conversation-first, mastery-driven English learning web app tailored for Portuguese (especially PT-BR) speakers aiming for functional CEFR B1 performance.

**Architecture:** Modular monolith in Next.js (App Router, React 19, TypeScript) with a pure, deterministic pedagogical domain engine (`src/lib/domain/`), versioned SQL migrations (`db/migrations/0001_init.sql`) separating PII from pseudonymous learning events (LGPD), vendor-neutral AI Tutor Orchestrator with deterministic fallback, offline-first idempotent event sync, and an Editorial Utilitarian UI.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Tailwind CSS v4, Zod, Vitest, Lucide React, PostgreSQL (`pg` optional adapter) + local/tmp resilient store, GitHub Actions CI, Vercel deployment.

## Global Constraints
- Honest, measurable CEFR promise calibrated to Cambridge guided learning hours (A0→B1: 22–25h/wk, A1→B1: 16–20h/wk, A2→B1+: 10–14h/wk, B1→B2: 8–12h/wk).
- Conversation-first, mastery-driven (MUT = novel-context unaided correct / evaluated); streak/XP never replace proficiency evidence.
- Explicit Portuguese variety selection (`pt-BR`, `pt-PT`, `other`); PT-BR phonetic targets applied only when diagnosed/applicable.
- Selective corrective feedback: max 2 priority targets per turn, followed by mandatory second attempt.
- Separation of ASR from CEFR proficiency rubric (8 dimensions, novel tasks on checkpoints).
- LGPD Privacy by Design: PII separated from learning events; raw audio discarded by default after feature extraction.
- No Inter/Roboto/system fonts or generic purple SaaS UI; use Fraunces + Plus Jakarta Sans + JetBrains Mono on warm editorial palette.

---

### Task 1: Project Scaffold, Config, Security Headers & SQL Migrations
**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `postcss.config.mjs`, `src/app/globals.css`, `src/app/layout.tsx`
- Create: `db/migrations/0001_init.sql`, `scripts/migrate.mjs`
- Commit: `chore: scaffold Next.js 19 app, Vitest, security headers and SQL schema`

### Task 2: Domain Types, Curriculum (16 Weeks TBLT) & Placement Engine (TDD)
**Files:**
- Create: `src/lib/domain/types.ts`, `src/lib/domain/curriculum.ts`, `src/lib/domain/placement.ts`
- Test: `tests/domain/placement.test.ts`, `tests/domain/curriculum.test.ts`
- Commit: `feat(domain): add 16-week TBLT curriculum and adaptive placement engine`

### Task 3: Adaptive Priority Engine, 6-Stage Productive SRS & MUT Calculator (TDD)
**Files:**
- Create: `src/lib/domain/adaptive-engine.ts`
- Test: `tests/domain/adaptive-engine.test.ts`
- Commit: `feat(domain): add deterministic priority scheduler, 6-stage SRS and MUT`

### Task 4: PT-BR Contrastive Pronunciation Pipeline & LGPD Audio Policy (TDD)
**Files:**
- Create: `src/lib/domain/pronunciation.ts`
- Test: `tests/domain/pronunciation.test.ts`
- Commit: `feat(domain): add PT-BR contrastive pronunciation analyzer with audio discard policy`

### Task 5: Vendor-Neutral AI Tutor Orchestrator, CEFR 8D Assessment & Offline Sync (TDD)
**Files:**
- Create: `src/lib/domain/tutor-orchestrator.ts`, `src/lib/domain/assessment.ts`, `src/lib/domain/sync.ts`
- Test: `tests/domain/tutor-orchestrator.test.ts`, `tests/domain/assessment.test.ts`, `tests/domain/sync.test.ts`
- Commit: `feat(domain): add AI tutor orchestrator, 8D CEFR assessment and idempotent sync`

### Task 6: Repository Layer, Zod API Routes & Rate Limiting (TDD)
**Files:**
- Create: `src/lib/db/repository.ts`, `src/lib/security/rate-limit.ts`, `src/lib/security/sanitize.ts`
- Create: `src/app/api/health/route.ts`, `src/app/api/onboarding/route.ts`, `src/app/api/today/route.ts`, `src/app/api/srs/review/route.ts`, `src/app/api/conversation/route.ts`, `src/app/api/pronunciation/route.ts`, `src/app/api/checkpoint/route.ts`, `src/app/api/sync/route.ts`, `src/app/api/privacy/route.ts`
- Test: `tests/api/routes.test.ts`
- Commit: `feat(api): implement validated API routes, repository and security controls`

### Task 7: Editorial Utilitarian UI — Core Layout, Landing, Onboarding & Placement
**Files:**
- Create: `src/components/AppShell.tsx`, `src/components/MutGauge.tsx`, `src/components/PhoneticCard.tsx`, `src/lib/client/offline-store.ts`
- Create: `src/app/page.tsx`, `src/app/onboarding/page.tsx`
- Commit: `feat(ui): build Editorial Utilitarian design system, landing and adaptive placement`

### Task 8: Interactive Learning Studios — Today, SRS, AI Conversation, Pronunciation, Roadmap, Dashboard & Privacy
**Files:**
- Create: `src/app/today/page.tsx`, `src/app/srs/page.tsx`, `src/app/conversation/page.tsx`, `src/app/pronunciation/page.tsx`, `src/app/roadmap/page.tsx`, `src/app/dashboard/page.tsx`, `src/app/privacy/page.tsx`
- Commit: `feat(ui): implement Today studio, 6-stage SRS, AI tutor, pronunciation lab and CEFR dashboard`

### Task 9: CI/CD Pipeline, Documentation, Full Verification, GitHub Push & Production Deploy
**Files:**
- Create: `.github/workflows/ci.yml`, `README.md`, `docs/ARCHITECTURE.md`, `.env.example`
- Update: `PROJECT_CONTEXT.md`
- Verify: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`
- Deploy: `gh repo create`, `git push`, `vercel --prod --yes`, live E2E verification with Agent Browser.
