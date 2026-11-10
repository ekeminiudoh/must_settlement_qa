import type { SettlementTask } from '../../src/types.js';

export function buildTaskBatch(count: number, startDate: Date): SettlementTask[] {
  return Array.from({ length: count }, (_, index) => {
    const dayOffset = index % 7;
    const completedAt = new Date(startDate.getTime() + dayOffset * 24 * 60 * 60 * 1000 + index * 60 * 1000);
    return {
      id: `task-${index + 1}`,
      accountId: `acct-${(index % 10) + 1}`,
      completedAt: completedAt.toISOString(),
      status: 'completed',
    };
  });
}

export function buildEligibleTaskList(): SettlementTask[] {
  return [
    { id: 'task-01', accountId: 'acct-1', completedAt: '2024-01-08T10:00:00.000Z', status: 'completed' },
    { id: 'task-02', accountId: 'acct-2', completedAt: '2024-01-09T12:00:00.000Z', status: 'completed' },
    { id: 'task-03', accountId: 'acct-3', completedAt: '2024-01-14T13:00:00.000Z', status: 'completed' },
  ];
}
