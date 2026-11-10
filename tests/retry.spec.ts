import { test, expect } from '@playwright/test';
import { createDatabase, resetDatabase } from '../src/database.js';
import { runSettlement } from '../src/settlement.js';
import { createFaultyDatabase, runFaultySettlement } from '../faulty/faulty-settlement.js';
import type { SettlementTask } from '../src/types.js';

interface PayoutSnapshot extends Record<string, null | number | string | Uint8Array> {
  id: number;
  task_id: string;
  account_id: string;
  payout_reference: string;
  amount: number;
  settlement_run_id: string;
  status: string;
}

function makeEligibleTasks(): SettlementTask[] {
  return Array.from({ length: 100 }, (_, index) => {
    const taskDate = new Date(Date.UTC(2024, 0, 8 + (index % 7), (index % 6) + 1, 0));
    return {
      id: `task-${index + 1}`,
      accountId: `acct-${(index % 5) + 1}`,
      completedAt: taskDate.toISOString(),
      status: 'completed',
    };
  });
}

test('TC06: settlement fails after 70 successful payouts and preserves those payouts', () => {
  const db = createDatabase(':memory:');
  resetDatabase(db);

  const tasks = makeEligibleTasks();
  expect(() => runSettlement({ db, tasks, referenceDate: new Date('2024-01-16T09:00:00.000Z'), failAfterSuccessfulPayouts: 70, failureTaskId: 'task-71', settlementId: 'run-70' })).toThrow(/Settlement failed after 70 successful payouts/);

  const payoutCount = Number((db.prepare(`SELECT COUNT(*) AS count FROM payouts`).get() as { count: number } | undefined)?.count ?? 0);
  const uniqueTaskCount = Number((db.prepare(`SELECT COUNT(DISTINCT task_id) AS count FROM payouts`).get() as { count: number } | undefined)?.count ?? 0);
  const totalValue = Number((db.prepare(`SELECT SUM(amount) AS total FROM payouts WHERE status = 'successful'`).get() as { total: number } | undefined)?.total ?? 0);
  const originalTaskIds = (db.prepare(`SELECT task_id FROM payouts ORDER BY task_id`).all() as { task_id: string }[]).map(({ task_id }) => task_id);

  expect(payoutCount).toBe(70);
  expect(uniqueTaskCount).toBe(70);
  expect(totalValue).toBe(700);
  expect(originalTaskIds).toEqual(tasks.slice(0, 70).map(({ id }) => id).sort());
});

test('TC07: retrying settlement does not duplicate the first 70 payouts', () => {
  const db = createDatabase(':memory:');
  resetDatabase(db);

  const tasks = makeEligibleTasks();

  expect(() => runSettlement({ db, tasks, referenceDate: new Date('2024-01-16T09:00:00.000Z'), failAfterSuccessfulPayouts: 70, failureTaskId: 'task-71', settlementId: 'retry-1' })).toThrow(/Settlement failed after 70 successful payouts/);

  const originalPayouts = db.prepare(`
    SELECT id, task_id, account_id, payout_reference, amount, settlement_run_id, status
    FROM payouts
    ORDER BY task_id
  `).all() as PayoutSnapshot[];

  const retryResult = runSettlement({ db, tasks, referenceDate: new Date('2024-01-16T09:00:00.000Z'), settlementId: 'retry-2' });
  expect(retryResult.totalSuccessful).toBe(30);
  expect(retryResult.successfulTaskIds).toEqual(tasks.slice(70).map(({ id }) => id));

  const payoutCount = Number((db.prepare(`SELECT COUNT(*) AS count FROM payouts`).get() as { count: number } | undefined)?.count ?? 0);
  const uniqueTaskCount = Number((db.prepare(`SELECT COUNT(DISTINCT task_id) AS count FROM payouts`).get() as { count: number } | undefined)?.count ?? 0);
  const totalValue = Number((db.prepare(`SELECT SUM(amount) AS total FROM payouts WHERE status = 'successful'`).get() as { total: number } | undefined)?.total ?? 0);
  const duplicateTaskCount = Number((db.prepare(`
    SELECT COUNT(*) AS count
    FROM (SELECT task_id FROM payouts GROUP BY task_id HAVING COUNT(*) > 1)
  `).get() as { count: number } | undefined)?.count ?? 0);
  const invalidAmountCount = Number((db.prepare(`SELECT COUNT(*) AS count FROM payouts WHERE amount != 10`).get() as { count: number } | undefined)?.count ?? 0);
  const recoveredOriginalPayouts = db.prepare(`
    SELECT id, task_id, account_id, payout_reference, amount, settlement_run_id, status
    FROM payouts
    WHERE CAST(SUBSTR(task_id, 6) AS INTEGER) <= 70
    ORDER BY task_id
  `).all() as PayoutSnapshot[];

  expect(payoutCount).toBe(100);
  expect(uniqueTaskCount).toBe(100);
  expect(totalValue).toBe(1000);
  expect(duplicateTaskCount).toBe(0);
  expect(invalidAmountCount).toBe(0);
  expect(recoveredOriginalPayouts).toEqual(originalPayouts);
});

test('faulty implementation produces duplicate payouts during retry', () => {
  const db = createFaultyDatabase(':memory:');
  const tasks = makeEligibleTasks();

  expect(() => runFaultySettlement({ db, tasks, referenceDate: new Date('2024-01-16T09:00:00.000Z'), failAfterSuccessfulPayouts: 70, failureTaskId: 'task-71', settlementId: 'faulty-1' })).toThrow(/Settlement failed after 70 successful payouts/);

  const retryResult = runFaultySettlement({ db, tasks, referenceDate: new Date('2024-01-16T09:00:00.000Z'), settlementId: 'faulty-2' });
  expect(retryResult.totalSuccessful).toBe(100);
  const duplicates = Number((db.prepare(`SELECT COUNT(*) as count FROM payouts WHERE task_id IN (SELECT task_id FROM payouts GROUP BY task_id HAVING COUNT(task_id) > 1)`).get() as { count: number } | undefined)?.count ?? 0);
  expect(duplicates).toBeGreaterThan(0);
});
