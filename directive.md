# MUST Settlement QA — Reviewer Directive

## Assessment objective

This assessment demonstrates risk-based QA for a fictional rewards settlement system. It intentionally reproduces duplicate payouts after a partial settlement failure, then verifies a corrected implementation. The simulated defect is not an actual MUST incident and makes no claim about MUST production systems.

## Business rules and scope

- Settlement runs on Tuesday at 09:00 UTC and covers the previous Monday 00:00 UTC through the following Monday 00:00 UTC.
- The lower UTC boundary is inclusive; the upper boundary is exclusive.
- Each eligible task earns 10 integer test credits and may be paid only once.
- Retries must not duplicate payouts.
- Notifications happen after successful payout persistence. A notification failure must not roll back a successful payout.
- All settlement timestamps use UTC. No real financial system, wallet, blockchain, or production API is connected.

## Risk prioritisation

Duplicate payouts were selected as the primary implementation because they directly compromise credit integrity after retry. Timezone boundary errors and post-payout notification failures were also assessed. Likelihood values are estimates for this assessment, not MUST incident history. See [docs/risk-prioritisation.md](docs/risk-prioritisation.md) and [intent.md](intent.md).

## Architecture and implementation

- The corrected TypeScript implementation uses Node's built-in SQLite module: [src/database.ts](src/database.ts), [src/settlement.ts](src/settlement.ts), [src/time-utils.ts](src/time-utils.ts), [src/notification.ts](src/notification.ts), and [src/types.ts](src/types.ts).
- The deliberately faulty implementation is isolated in [faulty/faulty-settlement.ts](faulty/faulty-settlement.ts). It omits idempotency and the task uniqueness constraint so its retry defect can be demonstrated.
- The corrected database enforces unique task payouts; application logic skips already-paid tasks. Successful payout statements persist independently in SQLite autocommit mode. Explicit atomicity across payout rows and settlement-run status updates remains a documented limitation.
- Configuration effective time and payout account ownership are assumptions requiring product-owner confirmation: [docs/assumptions.md](docs/assumptions.md).

## Defect and root cause

The simulated defect processes 100 eligible tasks, preserves the first 70 payouts, fails at task 71, then incorrectly reissues the first 70 on retry. The corrected retry skips those existing task IDs and pays only the remaining 30. The scenario and impact are documented in [docs/defect-report.md](docs/defect-report.md); technical analysis is in [docs/root-cause-analysis.md](docs/root-cause-analysis.md).

## Automated coverage

Playwright Test exercises the service and SQLite layer without a browser UI. The test cases are documented in [docs/test-cases.md](docs/test-cases.md) and implemented in [tests/settlement.spec.ts](tests/settlement.spec.ts), [tests/boundary.spec.ts](tests/boundary.spec.ts), [tests/retry.spec.ts](tests/retry.spec.ts), and [tests/notification.spec.ts](tests/notification.spec.ts). Deterministic task data is in [tests/fixtures/data.ts](tests/fixtures/data.ts).

The retry regression verifies the first 70 records remain unchanged, the retry adds exactly 30 records, there are exactly 100 records and unique task IDs, no task is paid more than once, and successful payout value is exactly 1,000 credits.

## Before-and-after execution

Use Node.js 22.13.0 or later. A fresh clone can install locked dependencies and run all checks with:

```bash
npm ci
npm run build
npm run faulty-demo
npm run verify-fix
npm test
```

`npm run faulty-demo` intentionally exits nonzero after reporting the reproduced defect. `npm run verify-fix` must pass. Captured command output and the generated Playwright report are in [evidence/execution-summary.md](evidence/execution-summary.md), [evidence/logs](evidence/logs), and [evidence/test-results/playwright-report/index.html](evidence/test-results/playwright-report/index.html).

## AI assistance and human verification

AI assistance supported risk analysis, scenario drafting, implementation, failure analysis, regression work, and documentation. These suggestions are not MUST policy or independent proof. The assessment owner remains responsible for confirming business assumptions, reviewing the code and actual execution evidence, and making any release decision. Details are in [docs/ai-workflow.md](docs/ai-workflow.md).

## Release readiness and limitations

This repository is suitable for assessment review, not production release. The simulated providers do not contact external systems. Effective-configuration and account-ownership behavior require product-owner confirmation. Process-crash behavior between payout persistence and run-status updates has not been tested; production readiness would require further transaction/recovery, operational, security, and compliance review. See [docs/release-readiness.md](docs/release-readiness.md).

## Reviewer file index

- Project setup: [README.md](README.md), [package.json](package.json), [package-lock.json](package-lock.json), [tsconfig.json](tsconfig.json), [playwright.config.ts](playwright.config.ts), [.env.example](.env.example), [.gitignore](.gitignore)
- Assessment intent and AI workflow: [intent.md](intent.md), [docs/ai-workflow.md](docs/ai-workflow.md)
- Implementation: [src/](src), [faulty/faulty-settlement.ts](faulty/faulty-settlement.ts)
- Execution scripts: [scripts/reproduce-defect.ts](scripts/reproduce-defect.ts), [scripts/verify-fix.ts](scripts/verify-fix.ts)
- Automated tests: [tests/](tests), [docs/test-cases.md](docs/test-cases.md)
- QA documentation: [docs/risk-prioritisation.md](docs/risk-prioritisation.md), [docs/defect-report.md](docs/defect-report.md), [docs/root-cause-analysis.md](docs/root-cause-analysis.md), [docs/release-readiness.md](docs/release-readiness.md), [docs/assumptions.md](docs/assumptions.md)
- Results and evidence: [evidence/execution-summary.md](evidence/execution-summary.md), [evidence/logs/](evidence/logs), [evidence/test-results/playwright-report/index.html](evidence/test-results/playwright-report/index.html)
