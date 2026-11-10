# Root-cause analysis

## Why the duplicate payout occurs

The faulty implementation attempted to insert a payout row for every eligible task without checking for an existing payout record. When the settlement was retried, the same task IDs were reprocessed and inserted again.

## Why retry processing is unsafe

Retry logic is unsafe when it assumes the previous run did not partially succeed. Without idempotent guards, the second run can double-count work that already reached a durable state.

## Why checking only application-level status may be insufficient

Application status fields can be out of sync or absent after a process crash. Database constraints and explicit uniqueness checks protect the ledger even when the application state is incomplete or stale.

## How database-level uniqueness and idempotency help

A unique index on `payouts.task_id` turns a duplicate insert into a deterministic failure, while application-level checks allow the settlement engine to skip already-paid tasks safely during retries.

## How transaction handling affects recovery

Each payout insert is an individual SQLite statement in autocommit mode; the assessment does not wrap payout insertion and run-status updates in a larger explicit transaction. Consequently, successful payout rows survive a later simulated failure. On retry, the unique task constraint and idempotency check skip those rows and process the remainder. A production design would need to define and test how payout writes and run status updates recover if a process crashes between those operations.

## What happens if payout succeeds but notification fails

A successful payout must remain committed. Notification delivery is a separate concern and should be logged as failed without rolling back or reversing the successful payout record.
