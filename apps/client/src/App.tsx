import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { io, type Socket } from "socket.io-client";

import type {
  ClientToServerEvents,
  DashboardSummary,
  PresenceSnapshot,
  ServerToClientEvents,
} from "../../../shared/types";

const demoDashboard: DashboardSummary = {
  workspaceName: "VaultSync Capital",
  currency: "USD",
  metrics: [
    { id: "1", label: "Cash Position", value: "$4.82M", change: "+8.4%", direction: "up" },
    { id: "2", label: "Monthly Burn", value: "$418K", change: "-3.1%", direction: "up" },
    { id: "3", label: "Approval Queue", value: "18", change: "+4 today", direction: "down" },
    { id: "4", label: "Runway", value: "19 months", change: "+2 months", direction: "up" },
  ],
  cashflow: [
    { month: "Jan", inflow: 420000, outflow: 280000 },
    { month: "Feb", inflow: 455000, outflow: 310000 },
    { month: "Mar", inflow: 498000, outflow: 330000 },
    { month: "Apr", inflow: 530000, outflow: 355000 },
    { month: "May", inflow: 575000, outflow: 369000 },
    { month: "Jun", inflow: 610000, outflow: 402000 },
  ],
  transactions: [
    {
      id: "txn-1",
      merchant: "Mercury Payroll",
      category: "Payroll",
      amount: 128400,
      currency: "USD",
      status: "Pending",
      date: "2026-04-23",
    },
    {
      id: "txn-2",
      merchant: "AWS",
      category: "Infrastructure",
      amount: 18650,
      currency: "USD",
      status: "Cleared",
      date: "2026-04-24",
    },
    {
      id: "txn-3",
      merchant: "Travel Reimbursement",
      category: "Ops",
      amount: 2410,
      currency: "USD",
      status: "Flagged",
      date: "2026-04-22",
    },
    {
      id: "txn-4",
      merchant: "Stripe Fees",
      category: "Processing",
      amount: 9320,
      currency: "USD",
      status: "Cleared",
      date: "2026-04-22",
    },
  ],
  activities: [
    { id: "a-1", user: "Ada", action: "updated", target: "Treasury forecast", time: "2m ago" },
    { id: "a-2", user: "Noah", action: "commented on", target: "Payroll variance", time: "8m ago" },
    { id: "a-3", user: "Mia", action: "flagged", target: "Travel reimbursement", time: "18m ago" },
  ],
  collaborators: [
    { id: "c-1", name: "Ada", role: "Finance Lead", color: "#0f766e", status: "online" },
    { id: "c-2", name: "Noah", role: "Ops Analyst", color: "#d97706", status: "reviewing" },
  ],
};

const currentUser = {
  name: "You",
  role: "Backend Builder",
};

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function statusBadgeClasses(status: "connecting" | "live" | "demo") {
  if (status === "live") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "demo") {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-blue-100 text-blue-700";
}

function metricTrendClasses(direction: "up" | "down") {
  return direction === "up"
    ? "bg-emerald-100 text-emerald-700"
    : "bg-amber-100 text-amber-700";
}

function transactionStatusClasses(status: "Cleared" | "Pending" | "Flagged") {
  if (status === "Cleared") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "Pending") {
    return "bg-blue-100 text-blue-700";
  }

  return "bg-rose-100 text-rose-700";
}

function App() {
  const [dashboard, setDashboard] = useState<DashboardSummary>(demoDashboard);
  const [presence, setPresence] = useState<PresenceSnapshot>({
    collaborators: demoDashboard.collaborators,
    activeUsers: demoDashboard.collaborators.length,
  });
  const [loading, setLoading] = useState(true);
  const [serverStatus, setServerStatus] = useState<"connecting" | "live" | "demo">("connecting");

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      try {
        const response = await axios.get<DashboardSummary>("/api/dashboard/summary");
        if (!mounted) {
          return;
        }

        setDashboard(response.data);
        setPresence({
          collaborators: response.data.collaborators,
          activeUsers: response.data.collaborators.length,
        });
        setServerStatus("live");
      } catch {
        if (mounted) {
          setServerStatus("demo");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io("/", {
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      setServerStatus("live");
      socket.emit("dashboard:join", currentUser);
    });

    socket.on("presence:snapshot", (snapshot) => {
      setPresence(snapshot);
    });

    socket.on("connect_error", () => {
      setServerStatus((previous) => (previous === "live" ? previous : "demo"));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const netFlow = useMemo(() => {
    return dashboard.cashflow.reduce((total, month) => total + month.inflow - month.outflow, 0);
  }, [dashboard.cashflow]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(37,99,235,0.16),transparent_24%),linear-gradient(180deg,#f7fbfc_0%,#eef4f7_100%)] px-4 py-6 text-slate-900 sm:px-6 sm:py-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(280px,0.9fr)]">
          <div className="self-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-teal-700">
              Real-time Collab Fintech Dashboard
            </p>
            <h1 className="max-w-[10ch] font-serif text-5xl leading-none sm:text-6xl lg:text-7xl">
              {dashboard.workspaceName}
            </h1>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
              A clean first slice for learning backend TypeScript: REST for the dashboard snapshot,
              Socket.IO for live presence, and shared contracts between both apps.
            </p>
          </div>

          <div className="flex flex-col justify-between gap-6 rounded-[28px] border border-slate-900/10 bg-white/80 p-6 shadow-[0_18px_48px_rgba(16,33,43,0.08)] backdrop-blur">
            <span className={`inline-flex w-fit rounded-full px-3 py-2 text-sm font-bold ${statusBadgeClasses(serverStatus)}`}>
              {serverStatus === "live" ? "Server live" : serverStatus === "demo" ? "Demo mode" : "Connecting"}
            </span>

            <div className="space-y-1">
              <strong className="block text-3xl">{presence.activeUsers}</strong>
              <span className="text-sm text-slate-600">active collaborators</span>
            </div>

            <div className="space-y-1">
              <strong className="block text-3xl">{formatMoney(netFlow, dashboard.currency)}</strong>
              <span className="text-sm text-slate-600">6 month net flow</span>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {dashboard.metrics.map((metric) => (
            <article
              className="rounded-[24px] border border-slate-900/10 bg-white/80 p-5 shadow-[0_18px_48px_rgba(16,33,43,0.08)] backdrop-blur"
              key={metric.id}
            >
              <span className="mb-3 block text-sm text-slate-600">{metric.label}</span>
              <strong className="block text-3xl leading-none">{metric.value}</strong>
              <span
                className={`mt-4 inline-flex rounded-full px-3 py-1.5 text-sm font-bold ${metricTrendClasses(metric.direction)}`}
              >
                {metric.change}
              </span>
            </article>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.9fr)]">
          <article className="rounded-[24px] border border-slate-900/10 bg-white/80 p-5 shadow-[0_18px_48px_rgba(16,33,43,0.08)] backdrop-blur sm:p-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-teal-700">Cashflow</p>
                <h2 className="font-serif text-3xl">Inflow vs outflow</h2>
              </div>
              <span className="text-sm text-slate-600">{loading ? "Refreshing..." : "Updated now"}</span>
            </div>

            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dashboard.cashflow}>
                  <defs>
                    <linearGradient id="inflowFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0f766e" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#0f766e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="outflowFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#d6dee6" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `$${value / 1000}k`} />
                  <Tooltip
                    formatter={(value: number | string | undefined) =>
                      formatMoney(typeof value === "number" ? value : 0, dashboard.currency)
                    }
                  />
                  <Area type="monotone" dataKey="inflow" stroke="#0f766e" fill="url(#inflowFill)" strokeWidth={3} />
                  <Area type="monotone" dataKey="outflow" stroke="#2563eb" fill="url(#outflowFill)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="rounded-[24px] border border-slate-900/10 bg-white/80 p-5 shadow-[0_18px_48px_rgba(16,33,43,0.08)] backdrop-blur sm:p-6">
            <div className="mb-5">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-teal-700">Presence</p>
              <h2 className="font-serif text-3xl">Who is in the room</h2>
            </div>

            <div className="space-y-4">
              {presence.collaborators.map((collaborator) => (
                <div
                  className="flex items-start gap-3 border-t border-slate-900/10 pt-4 first:border-t-0 first:pt-0"
                  key={collaborator.id}
                >
                  <div
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
                    style={{ backgroundColor: collaborator.color }}
                  >
                    {collaborator.name.slice(0, 1)}
                  </div>

                  <div>
                    <strong className="block">{collaborator.name}</strong>
                    <p className="text-sm text-slate-600">
                      {collaborator.role} • {collaborator.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[24px] border border-slate-900/10 bg-white/80 p-5 shadow-[0_18px_48px_rgba(16,33,43,0.08)] backdrop-blur sm:p-6">
            <div className="mb-5">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-teal-700">Transactions</p>
              <h2 className="font-serif text-3xl">Recent movement</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border-b border-slate-900/10 pb-3 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                      Merchant
                    </th>
                    <th className="border-b border-slate-900/10 pb-3 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                      Category
                    </th>
                    <th className="border-b border-slate-900/10 pb-3 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                      Amount
                    </th>
                    <th className="border-b border-slate-900/10 pb-3 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td className="border-b border-slate-900/10 py-4">{transaction.merchant}</td>
                      <td className="border-b border-slate-900/10 py-4 text-slate-600">{transaction.category}</td>
                      <td className="border-b border-slate-900/10 py-4">
                        {formatMoney(transaction.amount, transaction.currency)}
                      </td>
                      <td className="border-b border-slate-900/10 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1.5 text-sm font-bold ${transactionStatusClasses(transaction.status)}`}
                        >
                          {transaction.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="rounded-[24px] border border-slate-900/10 bg-white/80 p-5 shadow-[0_18px_48px_rgba(16,33,43,0.08)] backdrop-blur sm:p-6">
            <div className="mb-5">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-teal-700">Activity</p>
              <h2 className="font-serif text-3xl">Team actions</h2>
            </div>

            <div className="space-y-4">
              {dashboard.activities.map((activity) => (
                <div
                  className="border-t border-slate-900/10 pt-4 first:border-t-0 first:pt-0"
                  key={activity.id}
                >
                  <strong className="block">{activity.user}</strong>
                  <p className="mt-1 text-sm text-slate-600">
                    {activity.action} <span className="font-bold text-slate-900">{activity.target}</span>
                  </p>
                  <small className="mt-2 block text-xs text-slate-500">{activity.time}</small>
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}

export default App;
