# TalkSprint

**Aplicativo intensivo, adaptativo e *conversation-first* para levar falantes de português ao inglês conversacional equivalente a CEFR B1 em 16 semanas.**

> *"Alcance desempenho conversacional funcional equivalente a B1 nas situações mais importantes para você em 16 semanas, seguindo o plano intensivo recomendado."*

## Princípios Pedagógicos & Científicos
- **Transparência de Carga Horária (Cambridge CEFR):** A0→B1 (22–25h/sem), A1→B1 (16–20h/sem), A2→B1+ (10–14h/sem), B1→B2 (8–12h/sem).
- **TBLT (Task-Based Language Teaching):** 16 semanas organizadas em torno de missões reais (hotel, restaurante, reuniões, aeroporto, reparo conversacional).
- **SRS Produtivo em 6 Níveis + MUT:** `recognize → complete → cued_recall → intent_to_english → sentence_use → unpredictable_conversation`, com fórmula auditável `Prioridade = 0.30R + 0.25G + 0.20C + 0.15T + 0.10U` e **Mastery Under Transfer (MUT)**.
- **Pronúncia Contrastiva PT-BR sem Estereótipos:** Pergunta a variante do português (`pt-BR`, `pt-PT`, `other`) e atua em epêntese, consoantes finais, `-ed` e `/θ ð/` apenas quando diagnosticados.
- **Tutor IA Vendor-Neutral (Coach / Partner / Examiner):** Feedback corretivo seletivo (máx. 2 erros por turno) + etapa obrigatória de **Segunda Tentativa**.
- **Avaliação Multidimensional CEFR:** Rubrica de 8 dimensões separada do ASR, avaliada em **tarefas inéditas** nos checkpoints (Semanas 1, 4, 8, 12 e 16).
- **LGPD Privacy by Design:** Separação entre PII e eventos pseudônimos, política de **extração e descarte** de áudio bruto por padrão e fila offline-first idempotente.

## Stack
- **Next.js 15 (App Router) + React 19 + TypeScript 5 + Tailwind CSS v4**
- **Zod** (validação estrita de contratos API)
- **Vitest** (suíte TDD para domínio e APIs)
- **PostgreSQL** (`db/migrations/0001_init.sql` + `scripts/migrate.mjs`) com fallback resiliente em memória para operação zero-config.

## Comandos
```bash
npm install
npm run dev        # Servidor local http://localhost:3000
npm run typecheck  # Verificação TypeScript estrita
npm run lint       # ESLint Next.js
npm test           # Suíte Vitest (domínio + rotas API)
npm run build      # Build de produção
npm run db:migrate # Executa migrations SQL quando DATABASE_URL está configurada
```

Consulte [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) para detalhes arquiteturais completos.
