import { DatabaseSync } from 'node:sqlite';

export interface NotificationOutcome {
  payoutId: number;
  status: 'sent' | 'failed';
  error: string | null;
  sentAt: string | null;
}

export function sendNotification(db: DatabaseSync, payoutId: number, shouldFail = false): NotificationOutcome {
  const payoutRow = db.prepare(`SELECT * FROM payouts WHERE id = ?`).get(payoutId) as { id: number; status: string } | undefined;
  if (!payoutRow) {
    throw new Error(`Payout ${payoutId} not found`);
  }

  if (shouldFail) {
    const sentAt = new Date().toISOString();
    db.prepare(`INSERT INTO notifications (payout_id, status, sent_at, error) VALUES (?, 'failed', ?, ?)`).run(payoutId, sentAt, 'Simulated external provider failure');
    return { payoutId, status: 'failed', error: 'Simulated external provider failure', sentAt };
  }

  const sentAt = new Date().toISOString();
  db.prepare(`INSERT INTO notifications (payout_id, status, sent_at, error) VALUES (?, 'sent', ?, NULL)`).run(payoutId, sentAt);
  db.prepare(`UPDATE payouts SET notification_sent = 1 WHERE id = ?`).run(payoutId);
  return { payoutId, status: 'sent', error: null, sentAt };
}
