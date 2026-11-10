# Assumptions requiring product-owner confirmation

## TC09 — Admin settlement configuration changes

This assessment assumes a settlement uses the latest configuration whose `effective_from` timestamp is at or before the settlement run time. Later-effective configuration rows do not apply to that run. This is an assessment assumption, not an established policy. Product owners should confirm whether effective time is based on run start, the scheduled time, or the settlement window.

## TC10 — Account ownership during settlement

This assessment assumes account ownership comes from the task/account snapshot supplied to the settlement run and is persisted with the payout. Product owners should confirm whether an account change during a run should redirect a pending payout, wait for the next run, or be blocked. The local test verifies persistence of the supplied account ID; it does not simulate concurrent account changes.
