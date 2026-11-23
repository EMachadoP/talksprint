# Arquitetura — TalkSprint

## 1. Visão Geral (Modular Monolith)
O TalkSprint adota um **modular monolith** em Next.js App Router + React 19 + TypeScript, mantendo fronteiras claras entre domínio pedagógico puro, contratos HTTP, persistência e interface:

```text
src/
├── lib/
│   ├── domain/                 # Motor pedagógico puro (100% testado com TDD)
│   │   ├── types.ts            # Contratos de domínio
│   │   ├── curriculum.ts       # 16 semanas TBLT + templates + missões
│   │   ├── placement.ts        # Placement adaptativo + calibração Cambridge
│   │   ├── adaptive-engine.ts  # Prioridade 0.30R+0.25G+0.20C+0.15T+0.10U, SRS 6 níveis, MUT
│   │   ├── pronunciation.ts    # Análise contrastiva PT-BR + política de descarte de áudio
│   │   ├── tutor-orchestrator.ts # Tutor IA vendor-neutral (Coach / Partner / Examiner)
│   │   ├── assessment.ts       # Rubrica CEFR 8D separada de ASR + tarefas inéditas
│   │   └── sync.ts             # Merge idempotente de eventos offline-first
│   ├── db/repository.ts        # Adapter de persistência (PostgreSQL-ready + fallback resiliente)
│   ├── security/rate-limit.ts  # Rate limiting por rota sensível
│   └── client/offline-store.ts # Fila local de eventos imutáveis (localStorage + sync)
├── app/
│   ├── api/                    # Route Handlers validados com Zod
│   └── (pages)/                # Landing, Onboarding, Hoje, SRS, Conversação, Pronúncia, Roadmap, Dashboard, Privacidade
└── components/                 # Design System Editorial Utilitarian (AppShell, MutGauge, PhoneticCard)
```

## 2. Avaliação Técnica: Astryx em React 19+
Avaliamos a adoção do Astryx neste projeto React 19+. Como o TalkSprint utiliza Next.js App Router com fronteiras claras entre Server/Client Components, estado local enxuto e sincronização via fila de eventos imutáveis, manter React 19 nativo reduz dependências, custo de manutenção e tamanho de bundle sem perda de reatividade.

## 3. Banco de Dados & Privacidade (LGPD)
O schema versionado em `db/migrations/0001_init.sql` aplica **Privacy by Design**:
- `users` (PII) é isolado de `learner_profiles`, `competency_nodes` e `learning_events` (chaveados por `pseudonym_id`).
- `pronunciation_features` persiste apenas características derivadas; `raw_audio_retained` é `FALSE` por padrão.
- `learning_events` usa `event_id` (UUID) como chave primária para garantir idempotência na sincronização offline-first.

## 4. Segurança & Hardening
- Headers HTTP de segurança configurados em `next.config.ts` (`CSP`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`).
- Validação de payload com `zod` em 100% das rotas `POST`/`PATCH`.
- Sanitização de entradas do aprendiz contra *prompt injection* no `Tutor Orchestrator`.
- Rate limiting em `/api/conversation`.
