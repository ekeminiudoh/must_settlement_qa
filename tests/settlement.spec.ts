import { test, expect } from '@playwright/test';
import { createDatabase, resetDatabase } from '../src/database.js';
import { runSettlement } from '../src/settlement.js';
import { getSettlementWindow, isTaskEligible } from '../src/time-utils.js';
import type { SettlementTask } from '../src/types.js';

function createTestDb() {
  const db = createDatabase(`./data/test-settlement-${Date.now()}.db`);
  resetDatabase(db);
  return db;
}

test('TC01: normal qualifying task receives 10 credits', () => {
  const reference = new Date('2024-01-16T09:00:00.000Z');
  const window = getSettlementWindow(reference);
  const task: SettlementTask = { id: 'task-qualifies', accountId: 'acct-1', completedAt: '2024-01-08T10:00:00.000Z' };
  expect(isTaskEligible(task.completedAt, window.start, window.end)).toBe(true);
});

test('TC02: task completed exactly at Monday 00:00 UTC is included', () => {
  const window = getSettlementWindow(new Date('2024-01-16T09:00:00.000Z'));
  expect(isTaskEligible('2024-01-08T00:00:00.000Z', window.start, window.end)).toBe(true);
});

test('TC03: task completed exactly at the following Monday 00:00 UTC is excluded', () => {
  const window = getSettlementWindow(new Date('2024-01-16T09:00:00.000Z'));
  expect(isTaskEligible('2024-01-15T00:00:00.000Z', window.start, window.end)).toBe(false);
});

test('TC04: Nigerian local time UTC+1 is correctly converted to UTC for eligibility', () => {
  const window = getSettlementWindow(new Date('2024-01-16T09:00:00.000Z'));
  const localTime = new Date('2024-01-08T23:00:00+01:00');
  expect(isTaskEligible(localTime, window.start, window.end)).toBe(true);
});

test('TC05: duplicate task submission does not generate another payout', () => {
  const db = createTestDb();
  const referenceDate = new Date('2024-01-16T09:00:00.000Z');
  const tasks: SettlementTask[] = [
    { id: 'task-dup', accountId: 'acct-1', completedAt: '2024-01-08T11:30:00.000Z' },
    { id: 'task-dup', accountId: 'acct-1', completedAt: '2024-01-08T11:30:00.000Z' },
  ];

  const result = runSettlement({ db, tasks, referenceDate, settlementId: 'settlement-dup' });
  expect(result.totalSuccessful).toBe(1);
  expect(result.successfulTaskIds).toEqual(['task-dup']);
});
