# MUST Settlement QA — Reviewer Directive

## Assessment objective

This project is a practical QA assessment for an AI-native product QA engineer. It demonstrates duplicate payout prevention in a fictional settlement engine and documents the failure, fix, and validation evidence.

## Business rules

- Settlement executes every Tuesday at 09:00 UTC.
- Each settlement covers the prior Monday 00:00 UTC through the following Monday 00:00 UTC.
- The lower boundary is inclusive and the upper boundary is exclusive.
- Each qualifying task earns 10 test credits.
- A task ID must only receive one successful payout.
- Retrying a failed settlement must not duplicate payouts.
- Notifications fire only after successful payouts.
- Notification failures must not reverse successful payouts.
- All timestamps are managed in UTC.

## Scope

The project contains:

- a deliberately faulty implementation in [faulty/faulty-settlement.ts](faulty/faulty-settlement.ts)
- a corrected implementation in [src/settlement.ts](src/settlement.ts)
- a SQLite persistence layer in [src/database.ts](src/database.ts)
- UTC helper logic in [src/time-utils.ts](src/time-utils.ts)
- notification behaviour in [src/notification.ts](src/notification.ts)
- automated tests in [tests/settlement.spec.ts](tests/settlement.spec.ts), [tests/retry.spec.ts](tests/retry.spec.ts), [tests/boundary.spec.ts](tests/boundary.spec.ts), and [tests/notification.spec.ts](tests/notification.spec.ts)
- QA documentation in [docs](docs)

## Architecture

The system stores all settlement data in SQLite. Task eligibility is calculated in UTC using Monday-to-Monday settlement windows. Each payout attempts an insert against a unique task identifier and is wrapped in task-level transaction handling. Notification processing is kept independent from payout persistence so notification failures do not mutate payout success.

## Implementation decisions

- The primary defect selected is duplicate payout generation after a partial settlement failure.
- The correction uses database uniqueness, task idempotency checks and transaction boundaries to preserve successful payouts during retries.
- Tests are deterministic and isolate each database instance per test run.

## Defect selected

The primary defect is: duplicate payouts created when a settlement partially succeeds, fails, and is retried without a unique payout guard.

## Automated coverage

The automated suite covers at least the required cases from the specification, including retry safety and notification failure. See [docs/test-cases.md](docs/test-cases.md).

## Before-and-after verification

1. Run `npm run faulty-demo` to reproduce the defect.
2. Run `npm run verify-fix` to confirm the corrected implementation prevents duplication.
3. Run `npm test` for the full QA suite.

## Release-readiness decision

This project is suitable for controlled review and publication as a QA assessment repository, but it is not a production-approval statement for a live financial system. The local implementation is intentionally limited to the assessment domain and demonstrates the exact failure and fix path requested.

## Known gaps

- The implementation is intentionally fictional and does not integrate with any real payment system.
- Admin configuration and account ownership rules are documented as assumptions requiring product-owner confirmation.

## Execution instructions

```bash
npm install
npm run build
npm run faulty-demo
npm run verify-fix
npm test
```

## Results and handoff appendix

- [README.md](README.md)
- [intent.md](intent.md)
- [docs/risk-prioritisation.md](docs/risk-prioritisation.md)
- [docs/defect-report.md](docs/defect-report.md)
- [docs/root-cause-analysis.md](docs/root-cause-analysis.md)
- [docs/release-readiness.md](docs/release-readiness.md)
- [docs/assumptions.md](docs/assumptions.md)
- [evidence/execution-summary.md](evidence/execution-summary.md)
