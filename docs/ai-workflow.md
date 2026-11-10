# AI-assisted QA workflow

This project used AI assistance to:

- identify the highest-priority business risk: duplicate payouts after partial settlement failure
- generate deterministic edge-case scenarios for UTC boundary checks
- implement a minimal but credible settlement engine and SQLite persistence layer
- analyse the root cause and design a correction around idempotency and uniqueness
- add regression coverage for retry and notification behaviour
- write review documentation and release-readiness evidence

Human verification remains the final authority for business rules, release decisions and evidence review. AI suggestions were used as an accelerator, not as a substitute for engineering judgment.
