# Execution summary

## Environment and clean install

- Runtime: Node.js 22.13.1 (official Windows binary; SHA-256 verified against the Node.js release checksums)
- SQLite: Node built-in `node:sqlite`, SQLite 3.47.2
- Dependency installation: `npm ci` completed successfully from the lockfile; 6 packages installed and 0 vulnerabilities reported.
- Playwright uses service-level tests; no browser download is required.

Node.js 22.13.1 reports its built-in SQLite module as experimental. The application and tests completed successfully despite that runtime warning.

## Commands executed

- `npm ci` — exit 0
- `npm run build` — exit 0
- `npm run faulty-demo` — exit 1 as expected because it asserts the intentionally faulty result against the correct invariant
- `npm run verify-fix` — exit 0
- `npm test` — exit 0

## Actual results

The faulty retry starts with 70 successful payouts, retries all 100 tasks, and produces 170 payout records, 70 duplicate task IDs, and 1,700 credits. The reproduction is intentionally failing: [logs/faulty-demo.log](./logs/faulty-demo.log).

The corrected retry preserves the original 70 payout records unchanged and creates exactly 30 remaining payouts. Final invariants are 100 payout records, 100 unique task IDs, 0 duplicate task IDs, 1,000 successful credits, and no payout amount other than 10: [logs/verify-fix.log](./logs/verify-fix.log).

The full Playwright run completed with **14 passed**: [logs/playwright.log](./logs/playwright.log).

TypeScript compilation passed: [logs/build.log](./logs/build.log).

## Evidence artifacts

- [Faulty reproduction log](./logs/faulty-demo.log)
- [Corrected verification log](./logs/verify-fix.log)
- [Full Playwright log](./logs/playwright.log)
- [Build log](./logs/build.log)
- [Clean installation log](./logs/npm-ci.log)
- [Playwright HTML report](./test-results/playwright-report/index.html)

The logs are raw command output captured from Node.js 22.13.1. They contain no PowerShell error wrappers or machine-specific paths.
