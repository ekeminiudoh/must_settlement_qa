# Test cases

## TC01 — Normal qualifying task receives 10 credits
- Input: task completed on 2024-01-08 within eligible window.
- Preconditions: settlement run with valid UTC window.
- Expected result: one payout of 10 credits.

## TC02 — Task completed exactly at Monday 00:00 UTC is included
- Input: completion timestamp exactly at the lower boundary.
- Preconditions: window start equals Monday 00:00 UTC.
- Expected result: eligible and paid.

## TC03 — Task completed exactly at the following Monday 00:00 UTC is excluded
- Input: completion timestamp equals the exclusive upper boundary.
- Preconditions: boundary is enforced as `< end`.
- Expected result: excluded from settlement.

## TC04 — Nigerian local time UTC+1 is correctly converted to UTC for eligibility
- Input: task timestamp in local time with +01:00 offset.
- Preconditions: reference run is in UTC.
- Expected result: converted timestamp remains eligible when it falls inside the settlement window.

## TC05 — Duplicate task submission does not generate another payout
- Input: same task ID appears more than once.
- Preconditions: unique task ID.
- Expected result: only one successful payout record exists.

## TC06 — Settlement fails after 70 successful payouts and preserves those payouts
- Input: 100 eligible tasks, failure at task 71.
- Preconditions: synthetic failure after 70 records.
- Expected result: exactly 70 successful payouts remain committed.

## TC07 — Retrying settlement does not duplicate the first 70 payouts
- Input: re-run same settlement after partial failure.
- Preconditions: first 70 tasks already paid.
- Expected result: retry completes pending tasks without duplicating existing payouts.

## TC08 — Notification failure does not reverse successful payout records
- Input: payout succeeds, notification provider fails.
- Preconditions: notification is simulated as failing.
- Expected result: payout remains successful and migration is not rolled back.

## TC09 — Admin settlement configuration changes follow an explicit effective-configuration rule
- Input: configuration update with effectiveFrom timestamp.
- Preconditions: admin config is stored in settlement_configs.
- Expected result: the effective configuration is the latest row by effective_from.

## TC10 — Account changes during settlement follow a clearly documented ownership assumption
- Input: account status changes during settlement processing.
- Preconditions: settlement logic assumes the original account holder remains authoritative during the run.
- Expected result: the run completes against that captured ownership assumption, which should be confirmed by product owners.

## Additional checks
- Duplicate detection on reprocessing same settlement task IDs.
- Notification success path still records and marks successful delivery.
- Boundary scenarios with tasks before and after Monday boundaries.
