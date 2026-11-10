# Release-readiness checklist

## Business rule verification
- Settlement window rules are validated.
- Duplicate payout prevention is enforced.
- Credit value remains 10 credits per qualifying task.

## Settlement boundaries
- Lower boundary inclusive and upper boundary exclusive.
- Monday 00:00 UTC boundaries are tested.

## UTC/timezone handling
- UTC conversion is validated for local-time edge cases.
- Timezone assumptions are documented in the assessment.

## Duplicate payout protection
- Unique task ID and idempotent retry behaviour are enforced.
- Regression suite covers partial failure and retry.

## Retry/recovery
- The run supports safe retry without duplicate payouts.
- Partial failure leaves earlier successful payouts intact.

## Database integrity
- SQLite tables enforce uniqueness and persistent records.
- Each payout is tied to a task ID and a settlement run ID.

## Notification behaviour
- Notification failures are logged and do not reverse payouts.

## Regression results
- Faulty implementation reproduces the defect.
- Corrected implementation passes the suite.

## Logging and observability
- The scripts print real execution outcomes and errors.
- Logs are stored in [../evidence/logs](../evidence/logs).

## Known limitations
- This is a fictional assessment project, not a real financial system.
- External integrations are simulated, not connected to production APIs.
- Configuration effective-time and account ownership behavior are assessment assumptions requiring product-owner confirmation.
- Explicit atomicity across payout and settlement-run status updates has not been implemented or verified.
- Local test success is not production-readiness evidence.

## Approval and release decision
- Safe for review and publication as a QA assessment repository.
- Release to a live financial environment would require operational, security and compliance review beyond this assessment scope.
