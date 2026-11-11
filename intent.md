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

This project uses synthetic users, account IDs, tasks, timestamps and test credits in a fictional rewards settlement domain. The local SQLite store and notification provider are simulations; no customer, employer, production, financial, wallet, blockchain or API data or systems are involved.

The duplicate-payout defect is deliberately implemented for reproduction and is not an actual MUST production incident.

## Assumptions

- Settlement executes every Tuesday at 09:00 UTC.
- Tasks are evaluated using a Monday-to-Monday UTC window.
- Each qualifying task earns 10 test credits.
- A task ID can only have one successful payout record.
- Notification issues are logged without mutating prior payout success.
- A settlement uses the latest credit configuration effective at or before its run time.
- Payout account ownership comes from the task/account snapshot provided to the settlement run.

The configuration timing and account ownership assumptions require product-owner confirmation; they are not established MUST policies. See [docs/assumptions.md](docs/assumptions.md).

## AI assistance and human review

AI assistance supported risk analysis, scenario drafting, implementation, failure analysis, regression development and documentation. The actual implementation and command execution in this assessment session were performed with AI assistance; AI suggestions are not independent correctness evidence.

The assessment owner supplied the assessment requirements and remains responsible for personally reviewing the final changes, confirming business assumptions, deciding whether the public submission is ready, and making any release decision. This record does not claim the owner manually authored every line or personally executed the recorded commands. The actual command output is available in [evidence/execution-summary.md](evidence/execution-summary.md).

## Limitations

- This is a local assessment implementation, not a production financial settlement system.
- Node.js 22.13.x marks `node:sqlite` as experimental.
- Process-crash atomicity across payout persistence and settlement-run status updates has not been verified.
- The configuration and account ownership assumptions remain subject to product-owner confirmation.

## Success criteria

- Faulty implementation demonstrates the duplicate payout defect.
- Corrected implementation prevents duplicates.
- Automated tests pass consistently.
- Documentation gives a reviewer a clear before-and-after story.
