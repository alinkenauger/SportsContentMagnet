# Changelog

All notable changes to VidMagnet are documented in this file.

## [1.1.0.0] - 2026-08-14

### Added

- Create personalized Outcome Quizzes from existing content, publish a recipient experience, capture a lead, and reveal a scored result with a relevant free gift and call to action.
- Build a brand-scoped Benefit Library and Brand Studio so each personal or team workspace can reuse its own identity, gifts, and calls to action safely.
- Generate richer Guides with source-grounded steps, checklists, worksheets, scorecards, templates, troubleshooting, and action plans instead of a light video summary.
- Preserve richer Guide blocks through generation and editing while retaining legacy-compatible fields for existing public and delivery renderers.
- Run ordered, checksummed database migrations automatically before every production start, with migration and container release checks.
- Cover the release with contract, security, scoring, content, migration, and responsive browser regression suites.

### Changed

- Rebuilt the VidMagnet sales page around one clear source-to-Guide-or-Quiz artifact, five buyer questions, truthful source support, and a focused signup path.
- Split public, authentication, creator, and admin routes into lazy-loaded client chunks to reduce the anonymous initial download.
- Made branding, Guide creation, Quiz authoring, assets, listings, and public projections consistently respect the active personal or brand workspace.
- Standardized the immediate signup, recovery email, account completion, login, and logout journey around the VidMagnet name and typed response contracts.

### Fixed

- Bound pending-account completion to a saved session or hashed, expiring, single-use email proof; made subscription setup idempotent and external CRM work non-blocking.
- Unified password-session and OIDC identity for protected routes, destroyed the full authenticated session on logout, and protected all privileged admin operations with the canonical super-admin role.
- Prevented draft Quiz source material, private Guide fields, cross-brand assets, pending brand memberships, and internal benefit metadata from leaking through public endpoints.
- Preserved direct access to unlisted Guides while keeping public discovery limited to published Guides.
- Snapshotted completed Quiz outcomes and attached offers so an existing result link cannot be rewritten by later Quiz or Benefit Library edits.
- Made Guide and Quiz transfers draft and re-scope related records atomically, clearing benefit assignments that belong to another workspace.
- Added bounded auth, password-recovery, Quiz-generation, and public-Quiz rate limits without repeated full-map sweeps at capacity.
- Removed the production debug-email trigger and restricted its local replacement to authenticated super administrators.
- Escaped recipient-controlled inline email content and stripped header-breaking characters from dynamic subject text.
- Made public Quiz analytics claims concurrency-safe and added indexes for view deduplication, attempt throttling, and stale-attempt cleanup.

### Removed

- Removed the now-unneeded Framer Motion dependency from the shipped application.
