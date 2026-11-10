import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { getCreditValue } from '../src/database.js';
import { getSettlementWindow, isTaskEligible } from '../src/time-utils.js';
import type { SettlementTask, SettlementRun } from '../src/types.js';

export function createFaultyDatabase(filePath = './data/faulty-settlement.db'): DatabaseSync {
  const resolved = filePath === ':memory:' ? filePath : path.resolve(filePath);
  if (resolved !== ':memory:') {
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
  }
  const db = new DatabaseSync(resolved);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      completed_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'completed'
    );

    CREATE TABLE IF NOT EXISTS settlement_configs (
      key TEXT NOT NULL,
      value INTEGER NOT NULL,
      effective_from TEXT NOT NULL,
      PRIMARY KEY (key, effective_from)
    );

    CREATE TABLE IF NOT EXISTS settlement_runs (
      id TEXT PRIMARY KEY,
      settlement_key TEXT NOT NULL,
      status TEXT NOT NULL,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      total_successful INTEGER NOT NULL DEFAULT 0,
      total_value INTEGER NOT NULL DEFAULT 0,
      failure_task_id TEXT
    );

    CREATE TABLE IF NOT EXISTS payouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id TEXT NOT NULL,
      account_id TEXT NOT NULL,
      payout_reference TEXT NOT NULL,
      amount INTEGER NOT NULL,
      settlement_run_id TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      notification_sent INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payout_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      sent_at TEXT,
      error TEXT
    );
  `);
  resetFaultyDatabase(db);
  return db;
}

export function resetFaultyDatabase(db: DatabaseSync): void {
  db.exec(`
    DELETE FROM notifications;
    DELETE FROM payouts;
    DELETE FROM settlement_runs;
    DELETE FROM tasks;
    DELETE FROM settlement_configs;
  `);
  db.prepare(`INSERT INTO settlement_configs (key, value, effective_from) VALUES ('credit_value', 10, '2024-01-01T00:00:00.000Z')`).run();
}

export interface FaultySettlementOptions {
  db: DatabaseSync;
  tasks: SettlementTask[];
  referenceDate: Date;
  failAfterSuccessfulPayouts?: number;
  failureTaskId?: string;
  settlementId?: string;
}

export interface FaultySettlementResult {
  settlementRun: SettlementRun;
  successfulTaskIds: string[];
  skippedTaskIds: string[];
  totalSuccessful: number;
  totalValue: number;
}

export function runFaultySettlement(options: FaultySettlementOptions): FaultySettlementResult {
  const db = options.db;
  const referenceDate = new Date(options.referenceDate);
  const settlementId = options.settlementId ?? randomUUID();
  const window = getSettlementWindow(referenceDate);
  const settlementKey = window.key;
  const creditValue = getCreditValue(db, referenceDate);
  const now = new Date().toISOString();

  db.prepare(`INSERT INTO settlement_runs (id, settlement_key, status, started_at, completed_at, total_successful, total_value, failure_task_id)
    VALUES (?, ?, 'in_progress', ?, NULL, 0, 0, NULL)`).run(settlementId, settlementKey, now);

  const successfulTaskIds: string[] = [];
  const skippedTaskIds: string[] = [];
  let totalSuccessful = 0;
  let totalValue = 0;

  for (const task of options.tasks) {
    const isEligible = isTaskEligible(task.completedAt, window.start, window.end);
    if (!isEligible) {
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
    db.prepare(`INSERT INTO payouts (task_id, account_id, payout_reference, amount, settlement_run_id, status, created_at, notification_sent)
      VALUES (?, ?, ?, ?, ?, 'successful', ?, 0)`).run(task.id, task.accountId, payoutReference, creditValue, settlementId, new Date().toISOString());

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
