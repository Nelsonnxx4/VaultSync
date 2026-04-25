export type CurrencyCode = "USD" | "EUR" | "GBP" | "NGN";

export type TrendDirection = "up" | "down";

export interface DashboardMetric {
  id: string;
  label: string;
  value: string;
  change: string;
  direction: TrendDirection;
}

export interface CashflowPoint {
  month: string;
  inflow: number;
  outflow: number;
}

export interface TransactionItem {
  id: string;
  merchant: string;
  category: string;
  amount: number;
  currency: CurrencyCode;
  status: "Cleared" | "Pending" | "Flagged";
  date: string;
}

export interface ActivityItem {
  id: string;
  user: string;
  action: string;
  target: string;
  time: string;
}

export interface Collaborator {
  id: string;
  name: string;
  role: string;
  color: string;
  status: "online" | "reviewing" | "idle";
}

export interface DashboardSummary {
  workspaceName: string;
  currency: CurrencyCode;
  metrics: DashboardMetric[];
  cashflow: CashflowPoint[];
  transactions: TransactionItem[];
  activities: ActivityItem[];
  collaborators: Collaborator[];
}

export interface PresenceSnapshot {
  collaborators: Collaborator[];
  activeUsers: number;
}

export interface JoinDashboardPayload {
  name: string;
  role: string;
}

export interface ServerToClientEvents {
  "presence:snapshot": (payload: PresenceSnapshot) => void;
}

export interface ClientToServerEvents {
  "dashboard:join": (payload: JoinDashboardPayload) => void;
}
