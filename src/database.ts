import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

export type DatabaseConnection = DatabaseSync;

export function ensureDatabaseFile(filePath: string): string {
  const target = path.resolve(filePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  return target;
}

export function createDatabase(filePath: string = './data/must-settlement.db'): DatabaseConnection {
  const resolvedPath = ensureDatabaseFile(filePath);
  const db = new DatabaseSync(resolvedPath);
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
      key TEXT PRIMARY KEY,
      value INTEGER NOT NULL,
      effective_from TEXT NOT NULL
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
      task_id TEXT NOT NULL UNIQUE,
      payout_reference TEXT NOT NULL UNIQUE,
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
      error TEXT,
      FOREIGN KEY (payout_id) REFERENCES payouts(id)
    );
  `);
  return db;
}

export function resetDatabase(db: DatabaseConnection): void {
  db.exec(`
    DELETE FROM notifications;
    DELETE FROM payouts;
    DELETE FROM settlement_runs;
    DELETE FROM tasks;
    DELETE FROM settlement_configs;
  `);
  db.prepare(`INSERT INTO settlement_configs (key, value, effective_from) VALUES ('credit_value', 10, '2024-01-01T00:00:00.000Z')`).run();
}

export function insertTask(db: DatabaseConnection, task: { id: string; accountId: string; completedAt: string; status?: string }): void {
  db.prepare(`INSERT OR REPLACE INTO tasks (id, account_id, completed_at, status) VALUES (?, ?, ?, ?)`).run(
    task.id,
    task.accountId,
    task.completedAt,
    task.status ?? 'completed',
  );
}

export function getCreditValue(db: DatabaseConnection): number {
  const row = db.prepare(`SELECT value FROM settlement_configs ORDER BY effective_from DESC LIMIT 1`).get() as { value: number } | undefined;
  return row?.value ?? 10;
}

export function setEffectiveCreditValue(db: DatabaseConnection, value: number, effectiveFrom: string): void {
  db.prepare(`INSERT INTO settlement_configs (key, value, effective_from) VALUES ('credit_value', ?, ?)`).run(value, effectiveFrom);
}

export function getTaskCount(db: DatabaseConnection): number {
  const result = db.prepare(`SELECT COUNT(*) AS count FROM tasks`).get() as { count: number } | undefined;
  return Number(result?.count ?? 0);
}

export function getPayoutCountByTaskId(db: DatabaseConnection, taskId: string): number {
  const result = db.prepare(`SELECT COUNT(*) AS count FROM payouts WHERE task_id = ?`).get(taskId) as { count: number } | undefined;
  return Number(result?.count ?? 0);
}
