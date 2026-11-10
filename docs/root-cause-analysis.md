# Root-cause analysis

## Why the duplicate payout occurs

The faulty implementation attempted to insert a payout row for every eligible task without checking for an existing payout record. When the settlement was retried, the same task IDs were reprocessed and inserted again.

## Why retry processing is unsafe

Retry logic is unsafe when it assumes the previous run did not partially succeed. Without idempotent guards, the second run can double-count work that already reached a durable state.

## Why checking only application-level status may be insufficient

Application status fields can be out of sync or absent after a process crash. Database constraints and explicit uniqueness checks protect the ledger even when the application state is incomplete or stale.

## How database-level uniqueness and idempotency help

A unique index on `payouts.task_id` turns a duplicate insert into a deterministic failure, while application-level checks allow the settlement engine to skip already-paid tasks safely during retries.

## How transaction boundaries affect recovery

Each task can be committed in a small transaction so successful writes survive partial failure without rolling back the whole run. This preserves the first 70 successful payouts while still allowing the queue to continue on retry.

## What happens if payout succeeds but notification fails

A successful payout must remain committed. Notification delivery is a separate concern and should be logged as failed without reversing the successful payout record.
