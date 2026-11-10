import { createFaultyDatabase, runFaultySettlement } from '../faulty/faulty-settlement.js';

const db = createFaultyDatabase('./data/faulty-demo.db');
const tasks = Array.from({ length: 100 }, (_, index) => ({
  id: `task-${index + 1}`,
  accountId: `acct-${(index % 5) + 1}`,
  completedAt: new Date(Date.UTC(2024, 0, 8 + (index % 7), (index % 6) + 1, 0)).toISOString(),
  status: 'completed',
}));

try {
  runFaultySettlement({
    db,
    tasks,
    referenceDate: new Date('2024-01-16T09:00:00.000Z'),
    failAfterSuccessfulPayouts: 70,
    failureTaskId: 'task-71',
    settlementId: 'faulty-run',
  });
  const duplicates = Number((db.prepare(`SELECT COUNT(*) as count FROM payouts WHERE task_id IN (SELECT task_id FROM payouts GROUP BY task_id HAVING COUNT(task_id) > 1)`).get() as { count: number } | undefined)?.count ?? 0);
  if (duplicates > 0) {
    throw new Error(`Faulty implementation should have failed without duplicates but produced ${duplicates} duplicate entries`);
  }
  console.log('Unexpected: no duplicate payouts detected');
  process.exit(1);
} catch (error) {
  console.error('FAILED: duplicate payout defect reproduced');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
