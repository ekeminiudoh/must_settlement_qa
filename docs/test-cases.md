# Test cases

## TC01 — Normal qualifying task receives 10 credits
- Input: task completed on 2024-01-08 within eligible window.
- Preconditions: settlement run with valid UTC window.
- Expected result: exactly one successful payout record with an amount of 10 credits.

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
- Expected result: exactly 70 successful payout records for tasks 1–70 remain committed, worth 700 credits.

## TC07 — Retrying settlement does not duplicate the first 70 payouts
- Input: re-run same settlement after partial failure.
- Preconditions: first 70 tasks already paid.
- Expected result: retry pays only tasks 71–100; there are exactly 100 payout records for 100 unique task IDs, no duplicate task payouts, and 1,000 successful credits total. The original 70 payout records remain unchanged and the retry creates exactly 30 records.

## TC08 — Notification failure does not roll back a successful payout
- Input: payout succeeds, notification provider fails.
- Preconditions: notification is simulated as failing.
- Expected result: the already committed payout remains successful; only notification delivery is recorded as failed.

## TC09 — Settlement uses the latest configuration effective at its run time
- Input: credit value 15 effective from 2024-01-10 and value 20 effective from 2024-01-20; settlement runs on 2024-01-16.
- Preconditions: both updates are stored in `settlement_configs`; a 10-credit default applies from 2024-01-01.
- Expected result: the settlement uses the 15-credit value. Updates effective after the run time do not apply. This is an assessment assumption requiring product-owner confirmation.

## TC10 — Payout uses the account ID captured in the settlement task snapshot
- Input: eligible task carries account ID `acct-9`.
- Preconditions: the settlement input is the task/account snapshot selected for that run.
- Expected result: the payout persists `acct-9` as its account owner. Whether ownership changes during a run should redirect a payout is an assumption requiring product-owner confirmation; this local test does not simulate concurrent account mutation.

## Additional checks
- Duplicate detection on reprocessing same settlement task IDs.
- Notification success path still records and marks successful delivery.
- Boundary scenarios with tasks before and after Monday boundaries.
