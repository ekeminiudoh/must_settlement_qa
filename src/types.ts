export type CreditAmount = number;

export interface SettlementTask {
  id: string;
  accountId: string;
  completedAt: string | Date;
  status?: string;
}

export interface PayoutRecord {
  id: number;
  taskId: string;
  payoutReference: string;
  amount: number;
  settlementRunId: string;
  status: 'successful' | 'failed';
  createdAt: string;
  notificationSent: number;
}

export interface SettlementRun {
  id: string;
  settlementKey: string;
  status: 'in_progress' | 'completed' | 'failed';
  startedAt: string;
  completedAt: string | null;
  totalSuccessful: number;
  totalValue: number;
  failureTaskId: string | null;
}

export interface SettlementConfig {
  creditValue: number;
  effectiveFrom: string;
}

export interface NotificationRecord {
  id: number;
  payoutId: number;
  status: 'sent' | 'failed';
  sentAt: string | null;
  error: string | null;
}
