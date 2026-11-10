import { createDatabase, resetDatabase } from '../src/database.js';
import { runSettlement } from '../src/settlement.js';

interface PayoutSnapshot extends Record<string, null | number | string | Uint8Array> {
  id: number;
  task_id: string;
  account_id: string;
  payout_reference: string;
  amount: number;
  settlement_run_id: string;
  status: string;
}

const db = createDatabase(':memory:');
resetDatabase(db);
const tasks = Array.from({ length: 100 }, (_, index) => ({
  id: `task-${index + 1}`,
  accountId: `acct-${(index % 5) + 1}`,
  completedAt: new Date(Date.UTC(2024, 0, 8 + (index % 7), (index % 6) + 1, 0)).toISOString(),
  status: 'completed',
}));

try {
  let partialFailureObserved = false;
  try {
    runSettlement({
      db,
      tasks,
      referenceDate: new Date('2024-01-16T09:00:00.000Z'),
      failAfterSuccessfulPayouts: 70,
      failureTaskId: 'task-71',
      settlementId: 'fixed-run-1',
    });
  } catch (error) {
    if (!(error instanceof Error) || error.message !== 'Settlement failed after 70 successful payouts at task task-71') {
      throw error;
    }
    partialFailureObserved = true;
    console.log(`Partial failure reproduced: ${error.message}`);
  }
  if (!partialFailureObserved) {
    throw new Error('Expected partial failure after the first 70 payouts was not observed');
  }

  const originalPayouts = db.prepare(`
    SELECT id, task_id, account_id, payout_reference, amount, settlement_run_id, status
    FROM payouts
    ORDER BY task_id
  `).all() as PayoutSnapshot[];
  if (originalPayouts.length !== 70) {
    throw new Error(`Expected 70 payouts before retry, received ${originalPayouts.length}`);
  }

  const retryResult = runSettlement({
    db,
    tasks,
    referenceDate: new Date('2024-01-16T09:00:00.000Z'),
    settlementId: 'fixed-run-2',
  });

  const payoutCount = Number((db.prepare(`SELECT COUNT(*) AS count FROM payouts`).get() as { count: number } | undefined)?.count ?? 0);
  const uniqueTaskCount = Number((db.prepare(`SELECT COUNT(DISTINCT task_id) AS count FROM payouts`).get() as { count: number } | undefined)?.count ?? 0);
  const duplicateTaskCount = Number((db.prepare(`
    SELECT COUNT(*) AS count
    FROM (SELECT task_id FROM payouts GROUP BY task_id HAVING COUNT(*) > 1)
  `).get() as { count: number } | undefined)?.count ?? 0);
  const totalValue = Number((db.prepare(`SELECT SUM(amount) AS total FROM payouts WHERE status = 'successful'`).get() as { total: number } | undefined)?.total ?? 0);
  const invalidAmountCount = Number((db.prepare(`SELECT COUNT(*) AS count FROM payouts WHERE amount != 10`).get() as { count: number } | undefined)?.count ?? 0);
  const recoveredOriginalPayouts = db.prepare(`
    SELECT id, task_id, account_id, payout_reference, amount, settlement_run_id, status
    FROM payouts
    WHERE CAST(SUBSTR(task_id, 6) AS INTEGER) <= 70
    ORDER BY task_id
  `).all() as PayoutSnapshot[];
  const expectedRemainingTaskIds = tasks.slice(70).map(({ id }) => id);

  console.log(`Retry processed ${retryResult.totalSuccessful} remaining tasks`);
  console.log(`Financial integrity: payoutRecords=${payoutCount}, uniqueTaskIds=${uniqueTaskCount}, successfulCredits=${totalValue}, duplicateTaskIds=${duplicateTaskCount}`);
  console.log(`Original 70 payouts unchanged: ${JSON.stringify(recoveredOriginalPayouts) === JSON.stringify(originalPayouts)}`);

  if (retryResult.successfulTaskIds.join(',') !== expectedRemainingTaskIds.join(',')
    || payoutCount !== 100
    || uniqueTaskCount !== 100
    || totalValue !== 1000
    || duplicateTaskCount !== 0
    || invalidAmountCount !== 0
    || JSON.stringify(recoveredOriginalPayouts) !== JSON.stringify(originalPayouts)) {
    throw new Error('Verification failed: settlement retry did not preserve all expected payout invariants');
  }

  console.log('PASS: corrected retry preserves the original 70 payouts and adds exactly 30 unique payouts (100 payouts, 1,000 credits total)');
} catch (error) {
  console.error('FAIL: corrected implementation did not validate');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
