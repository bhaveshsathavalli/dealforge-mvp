# DealForge — Competitive Intelligence MVP (Doc Pack v0.1)

**Scope:** Vision, PRD, UI flows, data model, API surface, LLM contract, RAG & citations, evals, cost/latency, telemetry, rollout, risks, build checklist. Launch-ready, slightly beyond minimal.

## Locked Decisions
- **Category focus:** Sales enablement / battlecards first.
- **Seed competitors:** Klue, Crayon, Kompyte, Gong (integrations context), Highspot.
- **Tone:** Concise + persuasive (sales-ready).
- **Compliance:** No behind-login scraping or sensitive PII; no false claims.
- **Models:** OpenAI (GPT-4.1 / GPT-4o-mini) to start.
- **Export:** Markdown first.
- **Brand:** DealForge.
- **Citations:** User-added allowed/flagged; **≥2 per bullet**.

## Product Vision (1-pager)
Problem: reps need fast, credible, cited competitive answers. Solution: CI copilot turning public evidence into battlecards/objection counters/pricing deltas, with citations. Outcome: 60–90s actionable bullets you can paste into email/CRM.

## PRD (MVP Scope)
- **Personas:** Founder/AE; BDR.
- **Jobs-to-be-done:** Research a competitor/topic; Compare X vs Y; Generate battlecard; Share outputs.
- **Acceptance:** Answer card → bullets + **2+ citations** each; Compare table → deep-linked primary sources (≥5 rows); Battlecard sections (positioning/strengths/weaknesses/landmines/objections) with citations; History; Copy/Export.
- **Out of scope:** Private uploads, CRM/Slack, voice, team roles.

## UI & Flows (launch = **Option A: Light**)
Nav: **Dashboard, Competitors, Battlecards, Updates Feed, Settings**. Core flow: Results → Compare → Battlecard. Each bullet shows ≥2 citation chips; Compare has ≥5 rows; Battlecard supports **user-added citations** (flagged).

## Data Model (summary)
Core tables: `orgs`, `org_members`, `competitors`, `query_runs`, `raw_hits`, `claims`, `citations`, `evidence`, `battlecards`, `pricing_observations`, `feedback`. **RLS enforced per org**; plan caps via `orgs.max_users`, `orgs.max_competitors`.  
RLS helper + policies are included in the provided SQL (scoped-access patterns).

## API Surface (summary)
- `POST /api/runs/start` (start run)  
- `GET  /api/run/{id}` (status + results)  
- `POST /api/feedback` (rating + note)  
- `GET  /api/history` (list runs)  
- `POST /api/battlecard/build` (from run or competitor)

## LLM Interaction Spec
System: produce concise, persuasive bullets grounded in **primary vendor citations**; if insufficient/conflicting, say so and show both sides; obey JSON schema. Min 3 **unique domains** across answer; no invented URLs; quote deep links. Few-shots: Klue vs Crayon pricing tiers; Crayon "data freshness" objection; Gong free-plan limits.

## RAG & Citations Plan
Live search via SerpAPI; normalize HTML→text; store `raw_hits` + evidence quotes; every bullet references `citation_ids`; modal shows quote + link; user can add citations.

## Evaluation & Ship Gates
Test set: 50 queries; metrics: Faithfulness ≥4.0, Citation validity ≥90%, p95 ≤12s, cost/run ≤$0.15; ship when 10 consecutive cold runs pass.

## Cost & Latency Budget; Telemetry
Search/fetch cap 12 URLs (~8s); generation 1–2 calls (~4s). Daily cap per org (Starter): **200 runs** (alert 80%). Telemetry events: `run_started`, `fetch_result`, `llm_generate`, `answer_ready`, `user_feedback`. RLS enforced for all tables.

## Pricing & GTM (adopted)
Promo: $299/yr (Founding Member) → 5 users, 5 competitors; post-promo Starter $89/mo or $799/yr (5/5), Growth $159/mo or $1,499/yr (15/10), Pro ~$2,999+/yr. **Backend enforces caps**; manual overrides allowed in MVP.

## Build Checklist (order)
1) Supabase tables + **enable RLS**  
2) `/api/runs/start` + `/api/run/{id}` (normalize to `raw_hits`)  
3) Results page (bullets + citation chips)  
4) Compare generator (2-col with deep links)  
5) Battlecard generator + user-added citation flow  
6) History + Copy/Export  
7) Telemetry + Pricing page/promo/referral

## Manual Test Cards (pre-launch)
Cold-run faithfulness, conflict handling, RLS isolation across orgs, caps enforcement, and p95 latency ≤12s.

## Seed Set & Keyword Packs
Add Klue, Crayon, Kompyte, Gong, Highspot + starter keyword packs for testing.
