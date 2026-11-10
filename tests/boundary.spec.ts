import { test, expect } from '@playwright/test';
import { createDatabase, resetDatabase } from '../src/database.js';
import { runSettlement } from '../src/settlement.js';
import { getSettlementWindow, isTaskEligible } from '../src/time-utils.js';
import type { SettlementTask } from '../src/types.js';

function getTaskSet(): SettlementTask[] {
  return [
    { id: 'boundary-start', accountId: 'acct-1', completedAt: '2024-01-08T00:00:00.000Z' },
    { id: 'boundary-end', accountId: 'acct-2', completedAt: '2024-01-15T00:00:00.000Z' },
    { id: 'inside-window', accountId: 'acct-3', completedAt: '2024-01-10T12:30:00.000Z' },
  ];
}

test('TC02 and TC03 boundary behaviour', () => {
  const window = getSettlementWindow(new Date('2024-01-16T09:00:00.000Z'));
  expect(isTaskEligible('2024-01-08T00:00:00.000Z', window.start, window.end)).toBe(true);
  expect(isTaskEligible('2024-01-15T00:00:00.000Z', window.start, window.end)).toBe(false);
});

test('TC04 Nigerian timezone conversion boundary', () => {
  const window = getSettlementWindow(new Date('2024-01-16T09:00:00.000Z'));
  expect(isTaskEligible(new Date('2024-01-08T23:00:00+01:00'), window.start, window.end)).toBe(true);
});

test('accounts outside window are not paid', () => {
  const db = createDatabase(`./data/test-boundary-${Date.now()}.db`);
  resetDatabase(db);
  const tasks = getTaskSet();
  const result = runSettlement({ db, tasks, referenceDate: new Date('2024-01-16T09:00:00.000Z') });
  expect(result.successfulTaskIds).toEqual(['boundary-start', 'inside-window']);
});
