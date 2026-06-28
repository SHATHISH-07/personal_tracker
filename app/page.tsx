"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Heatmap from "@/components/Heatmap";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface HeatmapItem {
  date: string;
  count: number;
  level?: number;
}

interface AnalyticsData {
  totalHoursLogged: number;
  currentStreak: number;
  activePlansCount: number;
  totalSessions: number;
  heatmapData: HeatmapItem[];
  topicStats: { completed: number; pending: number };
  dailyHours: { date: string; hours: number }[];
}

interface ExpenseData {
  totalAllTime: number;
  totalThisMonth: number;
  avgDailySpend: number;
  transactionCount: number;
  categoryBreakdown: { name: string; value: number }[];
  dailySpend: { date: string; amount: number }[];
  topCategories: { name: string; total: number; avgTransaction: number }[];
  largestTransaction: { amount: number; date: string; category: string } | null;
}

interface TimesheetData {
  totalEntries: number;
  thisMonthEntries: number;
  mostActiveDay: string;
  dailyEntries: { date: string; count: number }[];
}

const COLORS = ["#1e1e1e", "#a1a1aa", "#40c463", "#f59e0b", "#3b82f6", "#8b5cf6"];
const EXPENSE_COLORS = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316", "#84cc16", "#6366f1", "#14b8a6", "#eab308", "#d946ef", "#0ea5e9"];

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [dashboardView, setDashboardView] = useState("upskill");

  // Data states
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [rawExpenses, setRawExpenses] = useState<{ amount: number; date: string; category: string }[]>([]);
  const [expenseMonth, setExpenseMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [timesheets, setTimesheets] = useState<TimesheetData | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [analyticsRes, expensesRes, timesheetsRes, logsRes, plansRes] = await Promise.all([
          fetch("/api/analytics"),
          fetch("/api/expenses"),
          fetch("/api/timesheet"),
          fetch("/api/logs"),
          fetch("/api/plans")
        ]);

        const analyticsJson = await analyticsRes.json();
        const expensesJson = await expensesRes.json();
        const timesheetsJson = await timesheetsRes.json();
        const logsJson = await logsRes.json();
        const plansJson = await plansRes.json();

        // --- Process Upskill Data ---
        let totalSessions = 0;
        const dailyHoursMap: Record<string, number> = {};
        
        if (logsJson.success) {
          logsJson.data.forEach((log: { date: string; sessions?: unknown[]; actualMinutes?: number }) => {
            if (log.sessions && log.sessions.length > 0) {
              totalSessions += log.sessions.length;
            } else if ((log.actualMinutes ?? 0) > 0) {
              totalSessions += 1;
            }
            dailyHoursMap[log.date] = (dailyHoursMap[log.date] || 0) + (log.actualMinutes || 0) / 60;
          });
        }
        
        let completedTopics = 0;
        let pendingTopics = 0;
        if (plansJson.success) {
          plansJson.data.forEach((plan: { status: string; topics?: { completed: boolean }[] }) => {
            if (plan.status === "active") {
              plan.topics?.forEach((t) => {
                if (t.completed) completedTopics++;
                else pendingTopics++;
              });
            }
          });
        }

        const recentDays = Array.from({length: 14}, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (13 - i));
          return d.toISOString().split("T")[0];
        });
        const dailyHours = recentDays.map(d => ({ date: d.substring(5), hours: Math.round((dailyHoursMap[d] || 0) * 10) / 10 }));

        if (analyticsJson.success) {
          setAnalytics({
            ...analyticsJson.data,
            totalSessions,
            topicStats: { completed: completedTopics, pending: pendingTopics },
            dailyHours
          });
        }

        // --- Process Expense Data ---
        if (expensesJson.success) {
          setRawExpenses(expensesJson.data);
        }

        // --- Process Timesheet Data ---
        if (timesheetsJson.success) {
          const ts = timesheetsJson.data;
          let thisMonthEntries = 0;
          const currentMonth = new Date().toISOString().substring(0, 7);
          const dailyMap: Record<string, number> = {};
          
          ts.forEach((e: { date: string }) => {
            if (e.date.startsWith(currentMonth)) {
              thisMonthEntries++;
              dailyMap[e.date] = (dailyMap[e.date] || 0) + 1;
            }
          });

          let maxCount = 0;
          let mostActiveDay = "-";
          Object.entries(dailyMap).forEach(([date, count]) => {
            if (count > maxCount) {
              maxCount = count;
              mostActiveDay = date;
            }
          });

          const dailyEntries = Object.entries(dailyMap).sort().map(([date, count]) => ({ date: date.substring(8), count }));

          setTimesheets({
            totalEntries: ts.length,
            thisMonthEntries,
            mostActiveDay,
            dailyEntries
          });
        }

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);

  const expenses = useMemo<ExpenseData | null>(() => {
    if (!rawExpenses || rawExpenses.length === 0) return null;
    
    let totalAllTime = 0;
    let totalThisMonth = 0;
    const catMap: Record<string, number> = {};
    const catCountMap: Record<string, number> = {};
    const dailySpendMap: Record<string, number> = {};
    const currentMonth = expenseMonth.toISOString().substring(0, 7);
    let largestTransaction: { amount: number; date: string; category: string } | null = null;
    
    rawExpenses.forEach((e) => {
      totalAllTime += e.amount;
      if (e.date.startsWith(currentMonth)) {
        totalThisMonth += e.amount;
        dailySpendMap[e.date] = (dailySpendMap[e.date] || 0) + e.amount;
        catMap[e.category] = (catMap[e.category] || 0) + e.amount;
        catCountMap[e.category] = (catCountMap[e.category] || 0) + 1;
        
        if (!largestTransaction || e.amount > largestTransaction.amount) {
            largestTransaction = e;
        }
      }
    });

    const categoryBreakdown = Object.entries(catMap).map(([name, value]) => ({ name, value }));
    const topCategories = categoryBreakdown
      .sort((a, b) => b.value - a.value)
      .slice(0, 3)
      .map(cat => ({
        name: cat.name,
        total: cat.value,
        avgTransaction: cat.value / (catCountMap[cat.name] || 1)
      }));

    const activeDays = Object.keys(dailySpendMap).length;
    const avgDailySpend = activeDays > 0 ? totalThisMonth / activeDays : 0;
    const dailySpend = Object.entries(dailySpendMap).sort().map(([date, amount]) => ({ date: date.substring(8), amount }));

    return {
      totalAllTime,
      totalThisMonth,
      avgDailySpend,
      transactionCount: rawExpenses.filter(e => e.date.startsWith(currentMonth)).length,
      categoryBreakdown,
      dailySpend,
      topCategories,
      largestTransaction
    };
  }, [rawExpenses, expenseMonth]);

  if (loading) {
    return <LoadingSpinner message="Loading dashboards..." />;
  }

  const renderUpskillDashboard = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white shadow-2xs border-[#e4e4e7]">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold text-[#71717a]">Total Hours Learned</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-extrabold">{analytics?.totalHoursLogged} <span className="text-sm font-normal text-[#71717a]">hrs</span></div></CardContent>
        </Card>
        <Card className="bg-white shadow-2xs border-[#e4e4e7]">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold text-[#71717a]">Learning Streak</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-extrabold">{analytics?.currentStreak} <span className="text-sm font-normal text-[#71717a]">days</span></div></CardContent>
        </Card>
        <Card className="bg-white shadow-2xs border-[#e4e4e7]">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold text-[#71717a]">Active Roadmaps</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-extrabold">{analytics?.activePlansCount}</div></CardContent>
        </Card>
        <Card className="bg-white shadow-2xs border-[#e4e4e7]">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold text-[#71717a]">Total Sessions</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-extrabold">{analytics?.totalSessions}</div></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-6 bg-white border-[#e4e4e7] shadow-2xs">
          <h3 className="text-sm font-bold mb-4">Study Hours (Last 14 Days)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.dailyHours}>
                <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip cursor={{fill: '#f4f4f5'}} contentStyle={{ borderRadius: '8px', border: '1px solid #e4e4e7', fontWeight: 'bold' }} />
                <Bar dataKey="hours" fill="#1e1e1e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 bg-white border-[#e4e4e7] shadow-2xs">
          <h3 className="text-sm font-bold mb-4">Active Plan Topic Mastery</h3>
          <div className="h-64 flex items-center justify-center">
            {analytics?.topicStats.completed === 0 && analytics?.topicStats.pending === 0 ? (
              <p className="text-[#71717a] text-sm">No topics found in active plans.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: "Completed", value: analytics?.topicStats.completed || 0 },
                      { name: "Pending", value: analytics?.topicStats.pending || 0 }
                    ]}
                    cx="50%" cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    <Cell fill="#40c463" />
                    <Cell fill="#a1a1aa" />
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e4e4e7', fontWeight: 'bold' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="flex justify-center gap-6 mt-2 text-sm font-bold">
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#40c463]"></span> Completed ({analytics?.topicStats.completed})</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#a1a1aa]"></span> Pending ({analytics?.topicStats.pending})</div>
          </div>
        </Card>
      </div>

      <Heatmap data={analytics?.heatmapData || []} />
    </div>
  );

  const renderExpenseDashboard = () => {
    const formattedMonth = expenseMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
    const formattedShortMonth = expenseMonth.toLocaleString('default', { month: 'short' });
    return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center bg-white p-3 rounded-xl shadow-2xs border border-[#e4e4e7]">
        <h2 className="text-lg font-bold text-[#1e1e1e]">Expense Tracker</h2>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              const newDate = new Date(expenseMonth);
              newDate.setMonth(newDate.getMonth() - 1);
              setExpenseMonth(newDate);
            }}
            className="p-1 hover:bg-gray-100 rounded-md cursor-pointer text-[#1e1e1e]"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="font-semibold text-sm w-32 text-center text-[#1e1e1e]">{formattedMonth}</span>
          <button 
            onClick={() => {
              const newDate = new Date(expenseMonth);
              newDate.setMonth(newDate.getMonth() + 1);
              setExpenseMonth(newDate);
            }}
            className="p-1 hover:bg-gray-100 rounded-md cursor-pointer text-[#1e1e1e]"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-white shadow-2xs border-[#e4e4e7]">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold text-[#71717a]">Total Expenses (All Time)</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-extrabold">₹ {expenses?.totalAllTime.toLocaleString() || 0}</div></CardContent>
        </Card>
        <Card className="bg-white shadow-2xs border-[#e4e4e7]">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold text-[#71717a]">{formattedShortMonth} Total</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-extrabold">₹ {expenses?.totalThisMonth.toLocaleString() || 0}</div></CardContent>
        </Card>
        <Card className="bg-white shadow-2xs border-[#e4e4e7]">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold text-[#71717a]">Avg Daily Spend ({formattedShortMonth})</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-extrabold">₹ {Math.round(expenses?.avgDailySpend || 0).toLocaleString()}</div></CardContent>
        </Card>
        <Card className="bg-white shadow-2xs border-[#e4e4e7]">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold text-[#71717a]">{formattedShortMonth} Transactions</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-extrabold">{expenses?.transactionCount || 0}</div></CardContent>
        </Card>
        <Card className="bg-white shadow-2xs border-[#e4e4e7]">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold text-[#71717a]">Largest Transaction ({formattedShortMonth})</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold">₹ {expenses?.largestTransaction?.amount.toLocaleString() || 0}</div>
            <div className="text-xs text-[#71717a] mt-1 truncate">{expenses?.largestTransaction?.category || "N/A"}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-6 bg-white border-[#e4e4e7] shadow-2xs">
          <h3 className="text-sm font-bold mb-4">Category Breakdown ({formattedMonth})</h3>
          <div className="h-64">
            {expenses?.categoryBreakdown.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[#71717a] text-sm">No expenses found.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenses?.categoryBreakdown}
                    cx="50%" cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {expenses?.categoryBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={EXPENSE_COLORS[index % EXPENSE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: string | number | readonly (string | number)[] | undefined) => `₹ ${val}`} contentStyle={{ borderRadius: '8px', border: '1px solid #e4e4e7', fontWeight: 'bold' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-2 text-xs font-bold">
            {expenses?.categoryBreakdown.map((entry, index) => (
              <div key={index} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: EXPENSE_COLORS[index % EXPENSE_COLORS.length]}}></span>
                {entry.name}
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 bg-white border-[#e4e4e7] shadow-2xs overflow-auto">
          <h3 className="text-sm font-bold mb-4">Top 3 Categories ({formattedMonth})</h3>
          <div className="flex flex-col gap-3">
            {expenses?.topCategories?.length === 0 ? (
               <div className="h-full flex items-center justify-center text-[#71717a] text-sm">No expenses found.</div>
            ) : expenses?.topCategories?.map((cat, i) => (
              <div key={i} className="flex flex-col p-3 rounded-lg border border-[#e4e4e7] bg-[#fafafa]">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-[#1e1e1e] flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#e4e4e7] flex items-center justify-center text-xs">{i + 1}</span>
                    {cat.name}
                  </span>
                  <span className="font-bold text-[#3b82f6]">₹ {cat.total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs text-[#71717a]">
                  <span>Avg per transaction:</span>
                  <span>₹ {Math.round(cat.avgTransaction).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 bg-white border-[#e4e4e7] shadow-2xs lg:col-span-2">
          <h3 className="text-sm font-bold mb-4">Daily Spend ({formattedMonth})</h3>
          <div className="h-64">
            {expenses?.dailySpend.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[#71717a] text-sm">No spend this month.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={expenses?.dailySpend}>
                  <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(val: string | number | readonly (string | number)[] | undefined) => `₹ ${val}`} cursor={{fill: '#f4f4f5'}} contentStyle={{ borderRadius: '8px', border: '1px solid #e4e4e7', fontWeight: 'bold' }} />
                  <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>
    </div>
    );
  };

  const renderTimesheetDashboard = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-white shadow-2xs border-[#e4e4e7]">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold text-[#71717a]">Total Entries (All Time)</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-extrabold">{timesheets?.totalEntries}</div></CardContent>
        </Card>
        <Card className="bg-white shadow-2xs border-[#e4e4e7]">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold text-[#71717a]">Entries This Month</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-extrabold">{timesheets?.thisMonthEntries}</div></CardContent>
        </Card>
        <Card className="bg-white shadow-2xs border-[#e4e4e7]">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold text-[#71717a]">Most Active Day</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-extrabold mt-1">{timesheets?.mostActiveDay}</div></CardContent>
        </Card>
      </div>

      <Card className="p-6 bg-white border-[#e4e4e7] shadow-2xs">
        <h3 className="text-sm font-bold mb-4">Timesheet Logs (This Month)</h3>
        <div className="h-80">
          {timesheets?.dailyEntries.length === 0 ? (
            <div className="h-full flex items-center justify-center text-[#71717a] text-sm">No timesheets logged this month.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timesheets?.dailyEntries}>
                <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip cursor={{fill: '#f4f4f5'}} contentStyle={{ borderRadius: '8px', border: '1px solid #e4e4e7', fontWeight: 'bold' }} />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  );

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-8 space-y-4 pb-12 font-sans animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-[#e4e4e7] px-6 py-4 rounded-xl shadow-2xs">
        <div>
          <h1 className="text-2xl font-black text-[#1e1e1e] tracking-tight">Dashboard</h1>
        </div>

        <div className="w-full md:w-64">
          <Select value={dashboardView} onChange={(e) => setDashboardView(e.target.value)}>
            <option value="upskill">Upskill Dashboard</option>
            <option value="expense">Expense Dashboard</option>
            <option value="timesheet">Timesheet Dashboard</option>
          </Select>
        </div>
      </div>

      {dashboardView === "upskill" && renderUpskillDashboard()}
      {dashboardView === "expense" && renderExpenseDashboard()}
      {dashboardView === "timesheet" && renderTimesheetDashboard()}
    </div>
  );
}
