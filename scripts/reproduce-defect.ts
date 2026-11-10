import { createFaultyDatabase, runFaultySettlement } from '../faulty/faulty-settlement.js';

const db = createFaultyDatabase(':memory:');
const tasks = Array.from({ length: 100 }, (_, index) => ({
  id: `task-${index + 1}`,
  accountId: `acct-${(index % 5) + 1}`,
  completedAt: new Date(Date.UTC(2024, 0, 8 + (index % 7), (index % 6) + 1, 0)).toISOString(),
  status: 'completed',
}));

try {
  let partialFailureObserved = false;
  try {
    runFaultySettlement({
      db,
      tasks,
      referenceDate: new Date('2024-01-16T09:00:00.000Z'),
      failAfterSuccessfulPayouts: 70,
      failureTaskId: 'task-71',
      settlementId: 'faulty-run-1',
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

  const retryResult = runFaultySettlement({
    db,
    tasks,
    referenceDate: new Date('2024-01-16T09:00:00.000Z'),
    settlementId: 'faulty-run-2',
  });
  const payoutCount = Number((db.prepare(`SELECT COUNT(*) AS count FROM payouts`).get() as { count: number } | undefined)?.count ?? 0);
  const uniqueTaskCount = Number((db.prepare(`SELECT COUNT(DISTINCT task_id) AS count FROM payouts`).get() as { count: number } | undefined)?.count ?? 0);
  const duplicateTaskCount = Number((db.prepare(`
    SELECT COUNT(*) AS count
    FROM (SELECT task_id FROM payouts GROUP BY task_id HAVING COUNT(*) > 1)
  `).get() as { count: number } | undefined)?.count ?? 0);
  const totalValue = Number((db.prepare(`SELECT SUM(amount) AS total FROM payouts WHERE status = 'successful'`).get() as { total: number } | undefined)?.total ?? 0);

  console.log(`Faulty retry processed ${retryResult.totalSuccessful} tasks that included already-paid tasks`);
  console.log(`Observed after retry: payoutRecords=${payoutCount}, uniqueTaskIds=${uniqueTaskCount}, duplicateTaskIds=${duplicateTaskCount}, successfulCredits=${totalValue}`);
  console.error('FAIL (expected defect): safe settlement requires 100 payout records and 1,000 credits; faulty retry produced duplicates.');

  if (payoutCount !== 170 || uniqueTaskCount !== 100 || duplicateTaskCount !== 70 || totalValue !== 1700) {
    throw new Error('The faulty retry did not produce the expected duplicate-payout defect');
  }
  process.exitCode = 1;
} catch (error) {
  console.error('Defect reproduction failed unexpectedly:', error instanceof Error ? error.message : String(error));
  process.exit(1);
}
