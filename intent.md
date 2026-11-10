# Assessment intent

## Why duplicate payout prevention was selected

The duplicate payout defect is the highest-priority risk because it causes inaccurate credit issuance, financial reconciliation drift and distrust in settlement correctness. It is easy to trigger during retries after partial failure and therefore deserves the primary implementation focus.

## Alternative failures considered

The assessment also prioritised:

- UTC boundary errors that might incorrectly include or exclude tasks.
- Notification failure after successful payout, which should never reverse an already successful settlement.

## Risk prioritisation summary

The highest-ranked risk is duplicate payouts after partial settlement failure because it directly impacts business accuracy and is likely if retry logic is not idempotent.

## Scope

This project covers the fictional rewards settlement domain, a local SQLite persistence layer and a Playwright-based automated QA suite.

## Assumptions

- Settlement executes every Tuesday at 09:00 UTC.
- Tasks are evaluated using a Monday-to-Monday UTC window.
- Each qualifying task earns 10 test credits.
- A task ID can only have one successful payout record.
- Notification issues are logged without mutating prior payout success.

## Success criteria

- Faulty implementation demonstrates the duplicate payout defect.
- Corrected implementation prevents duplicates.
- Automated tests pass consistently.
- Documentation gives a reviewer a clear before-and-after story.
