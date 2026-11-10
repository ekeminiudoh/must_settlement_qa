import { test, expect } from '@playwright/test';
import { createDatabase, resetDatabase } from '../src/database.js';
import { runSettlement } from '../src/settlement.js';
import { createFaultyDatabase, runFaultySettlement } from '../faulty/faulty-settlement.js';
import type { SettlementTask } from '../src/types.js';

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
  const db = createDatabase(`./data/test-fail-70-${Date.now()}.db`);
  resetDatabase(db);

  const tasks = makeEligibleTasks();
  expect(() => runSettlement({ db, tasks, referenceDate: new Date('2024-01-16T09:00:00.000Z'), failAfterSuccessfulPayouts: 70, failureTaskId: 'task-71', settlementId: 'run-70' })).toThrow(/Settlement failed after 70 successful payouts/);

  const payoutCount = Number((db.prepare(`SELECT COUNT(*) as count FROM payouts`).get() as { count: number } | undefined)?.count ?? 0);
  expect(payoutCount).toBe(70);
});

test('TC07: retrying settlement does not duplicate the first 70 payouts', () => {
  const db = createDatabase(`./data/test-retry-${Date.now()}.db`);
  resetDatabase(db);

  const tasks = makeEligibleTasks();

  expect(() => runSettlement({ db, tasks, referenceDate: new Date('2024-01-16T09:00:00.000Z'), failAfterSuccessfulPayouts: 70, failureTaskId: 'task-71', settlementId: 'retry-1' })).toThrow(/Settlement failed after 70 successful payouts/);

  const retryResult = runSettlement({ db, tasks, referenceDate: new Date('2024-01-16T09:00:00.000Z'), settlementId: 'retry-2' });
  expect(retryResult.totalSuccessful).toBe(30);
  expect(retryResult.successfulTaskIds).toHaveLength(30);

  const payoutCount = Number((db.prepare(`SELECT COUNT(*) AS count FROM payouts`).get() as { count: number } | undefined)?.count ?? 0);
  expect(payoutCount).toBe(100);
});

test('faulty implementation produces duplicate payouts during retry', () => {
  const db = createFaultyDatabase(`./data/test-faulty-${Date.now()}.db`);
  const tasks = makeEligibleTasks();

  expect(() => runFaultySettlement({ db, tasks, referenceDate: new Date('2024-01-16T09:00:00.000Z'), failAfterSuccessfulPayouts: 70, failureTaskId: 'task-71', settlementId: 'faulty-1' })).toThrow(/Settlement failed after 70 successful payouts/);

  const retryResult = runFaultySettlement({ db, tasks, referenceDate: new Date('2024-01-16T09:00:00.000Z'), settlementId: 'faulty-2' });
  expect(retryResult.totalSuccessful).toBe(100);
  const duplicates = Number((db.prepare(`SELECT COUNT(*) as count FROM payouts WHERE task_id IN (SELECT task_id FROM payouts GROUP BY task_id HAVING COUNT(task_id) > 1)`).get() as { count: number } | undefined)?.count ?? 0);
  expect(duplicates).toBeGreaterThan(0);
});
