import { createDatabase, resetDatabase } from '../src/database.js';
import { runSettlement } from '../src/settlement.js';

const db = createDatabase('./data/fix-demo.db');
resetDatabase(db);
const tasks = Array.from({ length: 100 }, (_, index) => ({
  id: `task-${index + 1}`,
  accountId: `acct-${(index % 5) + 1}`,
  completedAt: new Date(Date.UTC(2024, 0, 8 + (index % 7), (index % 6) + 1, 0)).toISOString(),
  status: 'completed',
}));

try {
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
    console.log('Partial failure acknowledged:', error instanceof Error ? error.message : String(error));
  }

  const retryResult = runSettlement({
    db,
    tasks,
    referenceDate: new Date('2024-01-16T09:00:00.000Z'),
    settlementId: 'fixed-run-2',
  });

  const duplicateCount = Number((db.prepare(`SELECT COUNT(*) AS count FROM payouts WHERE task_id IN (SELECT task_id FROM payouts GROUP BY task_id HAVING COUNT(task_id) > 1)`).get() as { count: number } | undefined)?.count ?? 0);
  const totalTasks = Number((db.prepare(`SELECT COUNT(*) AS count FROM payouts`).get() as { count: number } | undefined)?.count ?? 0);
  console.log(`Retry successful: ${retryResult.totalSuccessful} payouts, duplicateCount=${duplicateCount}, totalTasks=${totalTasks}`);

  if (duplicateCount !== 0 || totalTasks !== 100) {
    throw new Error(`Verification failed: duplicateCount=${duplicateCount}, totalTasks=${totalTasks}`);
  }

  console.log('PASS: corrected implementation prevents duplicate payouts and preserves 100 unique successful payouts');
} catch (error) {
  console.error('FAIL: corrected implementation did not validate');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
