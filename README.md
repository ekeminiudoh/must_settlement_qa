# MUST Settlement QA — Duplicate Payout Prevention

This project demonstrates a settlement system for a fictional rewards platform and intentionally reproduces a duplicate payout bug before fixing it.

## What this project demonstrates

- UTC-based settlement boundaries.
- Partial settlement failures with safe retry behaviour.
- Database-level idempotency checks.
- Notification behaviour after successful payout.
- Playwright-based automated QA coverage.

## Prerequisites

- Node.js 20+
- npm

## Installation

```bash
npm install
```

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

This should fail because the faulty implementation creates duplicate payouts after a simulated partial failure.

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
