# TODOS

## Release QA

### Capture production-like release evidence

**What:** Run the migration, signup/recovery/completion, Guide delivery, and public Quiz journey against a production-like environment; record LCP, CLS, and a short human five-second comprehension check.

**Why:** Local contract and browser suites are green, but they do not prove the deployed database, email provider, session store, or field performance.

**Context:** Start from `VIDMAGNET-SALES-PAGE-CLARITY-RESET.md` T7. Verify migration journal rows for 0001 then 0002, same-browser completion, emailed-token completion, logout, an unlisted Guide direct link, a published Quiz result, and required environment variables without recording credentials.

**Effort:** M
**Priority:** P1
**Depends on:** A production-like deployment with email and Postgres access

## Infrastructure

### Upgrade Drizzle ORM past the identifier-escaping advisory

**What:** Upgrade `drizzle-orm` to at least 0.45.2 with a focused schema/query regression pass.

**Why:** The current dependency audit reports CVE-2026-39356 even though the reviewed code does not pass attacker-controlled runtime identifiers or aliases into the affected APIs.

**Context:** Treat the current source audit as a temporary applicability exception, not a permanent waiver. Re-run all release tests, migrations, public Guide/Quiz queries, brand scoping, and Stripe-related TypeScript checks during the upgrade.

**Effort:** M
**Priority:** P1
**Depends on:** None

## Testing

### Add database-backed tenant and concurrency integration tests

**What:** Exercise Quiz CRUD, completion claiming, result-view analytics, Guide/Quiz transfer, pending brand membership, and asset isolation against disposable Postgres databases.

**Why:** Pure contracts and mocked browser journeys cannot prove transaction isolation, foreign keys, concurrent claims, or cross-tenant query boundaries.

**Context:** Prioritize simultaneous Quiz completion and result-view requests, normal and admin transfers, personal-to-brand asset scope, stale-attempt cleanup, migration replay, and rejected pending invite access.

**Effort:** L
**Priority:** P1
**Depends on:** Disposable Postgres test harness

## Benefit Library

### Paginate and index large benefit libraries

**What:** Add cursor pagination, a bounded page size, incremental loading, and an index aligned with brand scope and update order.

**Why:** The current endpoint and client load, filter, sort, and render the entire asset library, which will degrade as the intended reusable library grows.

**Context:** Begin at `listBenefitAssetsForUser`, `/api/benefit-assets`, and `benefit-library.tsx`. Preserve brand-aware cache isolation and archived-item behavior.

**Effort:** M
**Priority:** P2
**Depends on:** Product decision on page size and search semantics

## Architecture

### Consolidate Quiz DTOs and Guide transfer invariants

**What:** Export canonical serialized Quiz/editor DTOs and move normal/admin Guide transfer behavior into one transaction-level service.

**Why:** Client contract copies and duplicated transfer controllers can drift, silently discard supported settings, or apply tenant invariants inconsistently.

**Context:** Preserve defensive normalization for legacy lead-capture fields. The shared transfer operation must draft Quizzes, update all ownership/scope rows, and clear cross-brand gift/CTA assignments atomically.

**Effort:** M
**Priority:** P2
**Depends on:** Database integration test harness

## Performance

### Reduce rich Guide and public Quiz repeated work

**What:** Localize worksheet/checklist state in the Guide renderer and reuse a single published-Quiz lookup when recording a public view.

**Why:** Large interactive Guides currently rerender every block per keystroke, and each public Quiz page view repeats the same multi-table lookup.

**Context:** Add a render-count benchmark for a large valid Guide and a query-count regression for public Quiz retrieval before refactoring.

**Effort:** M
**Priority:** P2
**Depends on:** Test instrumentation for React renders and database queries

## AI Quality

### Add grounded Guide and Quiz generation evals

**What:** Build an eval set for source fidelity, usefulness, unsupported claims, prompt-injection resistance, format compliance, and deterministic schema validity.

**Why:** Contract tests prove structure and safeguards but do not measure the quality of actual model outputs across representative content.

**Context:** Cover Guide formats, Interactive Quiz reachability, unsupported timestamps/facts, full-source grounding, and hostile source text. Keep fixtures free of customer-sensitive content.

**Effort:** L
**Priority:** P2
**Depends on:** Curated evaluation sources and an approved model-cost budget

## Marketing

### Build verified proof and activation measurement

**What:** Add consented customer examples and a privacy-reviewed funnel from CTA placement through first publish and first captured lead.

**Why:** The artifact-led page is clear and truthful, but it cannot establish conversion impact or customer outcomes without verified evidence.

**Context:** Preserve synthetic-example labeling until real proof is approved. Test expert/coach, sports/video, and agency positioning before changing the durable product narrative; finish the remaining ConvertMag-to-VidMagnet vocabulary migration separately.

**Effort:** L
**Priority:** P2
**Depends on:** Customer consent, analytics architecture, and privacy decision

## Completed

### Ship the VidMagnet clarity and product-depth release

**What:** Deliver Interactive Quizzes, richer Guides, brand-scoped appearance and benefits, secure onboarding, the artifact-led sales page, and release regression gates.

**Why:** Visitors and recipients needed a clearer product promise, genuinely useful lead magnets, consistent brand control, and a safe path from signup through delivery.

**Context:** The shipped slice includes automatic ordered migrations, immutable Quiz result snapshots, canonical admin/session authorization, rate limits, responsive browser QA, and preserved direct access for unlisted Guides.

**Effort:** XL
**Priority:** P0
**Depends on:** None
**Completed:** v1.1.0.0 (2026-08-14)
