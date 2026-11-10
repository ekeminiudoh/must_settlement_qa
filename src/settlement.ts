import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { getCreditValue, setEffectiveCreditValue } from './database.js';
import { getSettlementWindow, isTaskEligible } from './time-utils.js';
import type { SettlementTask, SettlementRun } from './types.js';

export interface SettlementOptions {
  db: DatabaseSync;
  tasks: SettlementTask[];
  referenceDate: Date;
  failAfterSuccessfulPayouts?: number;
  failureTaskId?: string;
  settlementId?: string;
}

export interface SettlementResult {
  settlementRun: SettlementRun;
  successfulTaskIds: string[];
  skippedTaskIds: string[];
  totalSuccessful: number;
  totalValue: number;
}

export function getEffectiveConfiguration(db: DatabaseSync): { creditValue: number; effectiveFrom: string } {
  const row = db.prepare(`SELECT value, effective_from AS effectiveFrom FROM settlement_configs ORDER BY effective_from DESC LIMIT 1`).get() as { value: number; effectiveFrom: string } | undefined;
  const creditValue = row?.value ?? 10;
  return { creditValue, effectiveFrom: row?.effectiveFrom ?? '2024-01-01T00:00:00.000Z' };
}

export function setConfiguration(db: DatabaseSync, value: number, effectiveFrom: string): void {
  setEffectiveCreditValue(db, value, effectiveFrom);
}

export function runSettlement(options: SettlementOptions): SettlementResult {
  const db = options.db;
  const referenceDate = new Date(options.referenceDate);
  const settlementId = options.settlementId ?? randomUUID();
  const window = getSettlementWindow(referenceDate);
  const settlementKey = window.key;
  const creditValue = getCreditValue(db);
  const now = new Date().toISOString();

  db.prepare(`INSERT INTO settlement_runs (id, settlement_key, status, started_at, completed_at, total_successful, total_value, failure_task_id)
    VALUES (?, ?, 'in_progress', ?, NULL, 0, 0, NULL)`).run(settlementId, settlementKey, now);

  const successfulTaskIds: string[] = [];
  const skippedTaskIds: string[] = [];
  let totalSuccessful = 0;
  let totalValue = 0;

  for (const task of options.tasks) {
    const completedAt = task.completedAt;
    const isEligible = isTaskEligible(completedAt, window.start, window.end);
    if (!isEligible) {
      skippedTaskIds.push(task.id);
      continue;
    }

    const existing = db.prepare(`SELECT id FROM payouts WHERE task_id = ?`).get(task.id) as { id: number } | undefined;
    if (existing) {
      skippedTaskIds.push(task.id);
      continue;
    }

    const shouldFailHere = typeof options.failAfterSuccessfulPayouts === 'number'
      && options.failureTaskId === task.id
      && totalSuccessful >= options.failAfterSuccessfulPayouts;

    if (shouldFailHere) {
      db.prepare(`UPDATE settlement_runs SET status = 'failed', completed_at = ?, total_successful = ?, total_value = ?, failure_task_id = ? WHERE id = ?`)
        .run(new Date().toISOString(), totalSuccessful, totalValue, task.id, settlementId);
      throw new Error(`Settlement failed after ${totalSuccessful} successful payouts at task ${task.id}`);
    }

    const payoutReference = `${settlementId}:${task.id}`;
    db.prepare(`INSERT INTO payouts (task_id, payout_reference, amount, settlement_run_id, status, created_at, notification_sent)
      VALUES (?, ?, ?, ?, 'successful', ?, 0)`).run(task.id, payoutReference, creditValue, settlementId, new Date().toISOString());

    successfulTaskIds.push(task.id);
    totalSuccessful += 1;
    totalValue += creditValue;
  }

  db.prepare(`UPDATE settlement_runs SET status = 'completed', completed_at = ?, total_successful = ?, total_value = ? WHERE id = ?`)
    .run(new Date().toISOString(), totalSuccessful, totalValue, settlementId);

  return {
    settlementRun: {
      id: settlementId,
      settlementKey,
      status: 'completed',
      startedAt: now,
      completedAt: new Date().toISOString(),
      totalSuccessful,
      totalValue,
      failureTaskId: null,
    },
    successfulTaskIds,
    skippedTaskIds,
    totalSuccessful,
    totalValue,
  };
}
