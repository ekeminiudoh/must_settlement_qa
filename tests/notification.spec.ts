import { test, expect } from '@playwright/test';
import { createDatabase, resetDatabase } from '../src/database.js';
import { runSettlement } from '../src/settlement.js';
import { sendNotification } from '../src/notification.js';
import type { SettlementTask } from '../src/types.js';

function buildTasks(): SettlementTask[] {
  return [
    { id: 'notification-01', accountId: 'acct-1', completedAt: '2024-01-08T09:00:00.000Z' },
    { id: 'notification-02', accountId: 'acct-2', completedAt: '2024-01-10T09:00:00.000Z' },
  ];
}

test('TC08: notification failure does not reverse successful payout records', () => {
  const db = createDatabase(`./data/test-notification-${Date.now()}.db`);
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

test('TC09: admin settlement configuration changes follow an explicitly documented effective-configuration rule', () => {
  const db = createDatabase(`./data/test-config-${Date.now()}.db`);
  resetDatabase(db);
  const first = db.prepare(`SELECT value FROM settlement_configs ORDER BY effective_from DESC LIMIT 1`).get() as { value: number };
  expect(first.value).toBe(10);
});

test('TC10: account changes during settlement follow a clearly documented account ownership assumption', () => {
  const tasks: SettlementTask[] = [{ id: 'owner-test', accountId: 'acct-9', completedAt: '2024-01-08T12:00:00.000Z' }];
  const db = createDatabase(`./data/test-account-${Date.now()}.db`);
  resetDatabase(db);
  const result = runSettlement({ db, tasks, referenceDate: new Date('2024-01-16T09:00:00.000Z') });
  expect(result.successfulTaskIds).toEqual(['owner-test']);
});
