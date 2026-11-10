# MUST Settlement QA — Duplicate Payout Prevention

This project demonstrates settlement QA for a fictional rewards platform. It includes a deliberately faulty implementation that reproduces duplicate payouts after a partial failure, followed by a corrected implementation and regression coverage. The simulated defect is not evidence of an actual MUST production incident.

## What this project demonstrates

- UTC-based settlement boundaries.
- Partial settlement failures with safe retry behaviour.
- Database-level idempotency checks.
- Notification behaviour after successful payout.
- Playwright-based automated QA coverage.

## Prerequisites

- Node.js 22.13.0 or later (the project uses the built-in `node:sqlite` module)
- npm

## Fresh clone installation

```bash
npm ci
```

`package-lock.json` pins the dependency tree. No browser installation is required because the Playwright tests exercise the service and SQLite layer directly.

## Project structure

- `src/` contains the corrected implementation.
- `faulty/` contains the intentionally broken implementation.
- `tests/` contains the regression suite.
- `docs/` contains all QA and release documentation.
- `scripts/` contains reproduction and verification scripts.

## Reproduce the defect

```bash
npm run faulty-demo
```

This intentionally exits with a failing result after demonstrating the simulated duplicate payout. It is not a real production incident.

## Verify the fix

```bash
npm run verify-fix
```

## Run the test suite

```bash
npm test
```

## Type-check

```bash
npm run build
```

See [directive.md](directive.md) for the reviewer guide, implementation details, test evidence, and documentation index.
