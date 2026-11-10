# Defect report

- Defect ID: MUST-SETTLEMENT-004
- Title: Duplicate payout records are created when settlement is retried after a partial failure
- Severity: Critical
- Priority: P1
- Business context: The fictional rewards settlement engine must pay each qualifying task once. Overpayment creates inaccurate rewards balances and increases reconciliation work.
- Preconditions: A settlement run processes 100 eligible tasks; the first 70 payouts succeed; task 71 fails; the settlement is retried without idempotency protection.
- Reproduction steps:
  1. Seed 100 eligible tasks.
  2. Run settlement with a simulated failure after 70 successful payouts.
  3. Retry the same settlement run.
  4. Observe duplicate payouts on previously successful tasks.
- Expected result: Exactly 100 unique successful payouts and no task receives more than one payout.
- Actual result: The faulty implementation creates duplicates after retry.
- Evidence: See [../scripts/reproduce-defect.ts](../scripts/reproduce-defect.ts) and the captured output in [../evidence/logs](../evidence/logs).
- Root cause: The faulty implementation performed insert operations without checking whether the task already had a payout record.
- Proposed fix: Add database-level uniqueness on `task_id` and an application-level idempotency check before insert. The local SQLite statement commits independently; broader transaction/recovery semantics remain a production design concern.
- Regression coverage: Covered in [../tests/retry.spec.ts](../tests/retry.spec.ts).
- Release-blocking rationale: The issue directly affects rewards correctness and should block release until the idempotency issue is fixed.

This defect is intentionally simulated and separate from any actual production incident.
