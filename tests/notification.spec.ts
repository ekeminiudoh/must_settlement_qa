import { test, expect } from '@playwright/test';
import { createDatabase, resetDatabase } from '../src/database.js';
import { getEffectiveConfigurationAt, runSettlement, setConfiguration } from '../src/settlement.js';
import { sendNotification } from '../src/notification.js';
import type { SettlementTask } from '../src/types.js';

function buildTasks(): SettlementTask[] {
  return [
    { id: 'notification-01', accountId: 'acct-1', completedAt: '2024-01-08T09:00:00.000Z' },
    { id: 'notification-02', accountId: 'acct-2', completedAt: '2024-01-10T09:00:00.000Z' },
  ];
}

test('TC08: notification failure does not roll back a successful payout', () => {
  const db = createDatabase(':memory:');
  resetDatabase(db);
  const tasks = buildTasks();
  const result = runSettlement({ db, tasks, referenceDate: new Date('2024-01-16T09:00:00.000Z') });

  expect(result.totalSuccessful).toBe(2);
  const payout = db.prepare(`SELECT * FROM payouts WHERE task_id = ?`).get('notification-01') as { id: number; status: string; notification_sent: number };
  const outcome = sendNotification(db, payout.id, true);
  expect(outcome.status).toBe('failed');

  const persisted = db.prepare(`SELECT status FROM payouts WHERE id = ?`).get(payout.id) as { status: string };
  expect(persisted.status).toBe('successful');
});

test('TC09: settlement uses the latest configuration effective at its run time', () => {
  const db = createDatabase(':memory:');
  resetDatabase(db);
  setConfiguration(db, 15, '2024-01-10T00:00:00.000Z');
  setConfiguration(db, 20, '2024-01-20T00:00:00.000Z');

  const runDate = new Date('2024-01-16T09:00:00.000Z');
  expect(getEffectiveConfigurationAt(db, runDate)).toEqual({
    creditValue: 15,
    effectiveFrom: '2024-01-10T00:00:00.000Z',
  });

  const result = runSettlement({
    db,
    tasks: [{ id: 'config-effective', accountId: 'acct-config', completedAt: '2024-01-08T09:00:00.000Z' }],
    referenceDate: runDate,
    settlementId: 'config-effective-run',
  });
  const payout = db.prepare(`SELECT amount FROM payouts WHERE task_id = ?`).get('config-effective') as { amount: number };
  expect(result.totalValue).toBe(15);
  expect(payout.amount).toBe(15);

  const nextRun = runSettlement({
    db,
    tasks: [{ id: 'config-next', accountId: 'acct-config', completedAt: '2024-01-15T09:00:00.000Z' }],
    referenceDate: new Date('2024-01-23T09:00:00.000Z'),
    settlementId: 'config-next-run',
  });
  const nextPayout = db.prepare(`SELECT amount FROM payouts WHERE task_id = ?`).get('config-next') as { amount: number };
  expect(nextRun.totalValue).toBe(20);
  expect(nextPayout.amount).toBe(20);
});

test('TC10: payout uses the account ID captured in the settlement task snapshot', () => {
  const tasks: SettlementTask[] = [{ id: 'owner-test', accountId: 'acct-9', completedAt: '2024-01-08T12:00:00.000Z' }];
  const db = createDatabase(':memory:');
  resetDatabase(db);
  const result = runSettlement({ db, tasks, referenceDate: new Date('2024-01-16T09:00:00.000Z') });
  const payout = db.prepare(`SELECT account_id AS accountId FROM payouts WHERE task_id = ?`).get('owner-test') as { accountId: string };

  expect(result.successfulTaskIds).toEqual(['owner-test']);
  expect(payout.accountId).toBe('acct-9');
});
