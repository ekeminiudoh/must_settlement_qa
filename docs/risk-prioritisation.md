# Risk prioritisation

Likelihood ratings below are assessment estimates only. They are not based on MUST incident history or internal company data.

## Rank 1 — A. Duplicate payouts after partial settlement failure
- User/business impact: High. Credits may be over-issued and reconciliation becomes inaccurate.
- Estimated likelihood: Medium. Retry logic without idempotency is a common failure pattern.
- Investigation effort: Low to medium. It is usually visible in payout logs and database state.
- Reason for prioritisation: This is the highest-impact business risk and directly affects fairness and trust.

## Rank 2 — B. Incorrect settlement eligibility due to UTC/timezone boundary errors
- User/business impact: Medium. Tasks may be paid or skipped incorrectly.
- Estimated likelihood: Medium. Time-zone issues are common in distributed systems.
- Investigation effort: Medium. Requires validating timestamps and windows.
- Reason for prioritisation: Important but less directly damaging than duplicate payout creation.

## Rank 3 — C. Notification failure after successful payout
- User/business impact: Medium. Users may not receive notifications despite successful payout.
- Estimated likelihood: High. External integrations fail frequently.
- Investigation effort: Low. Notifications are typically independent from core ledger writes.
- Reason for prioritisation: Must not revert a successful payout, but this is operational rather than core settlement correctness.
