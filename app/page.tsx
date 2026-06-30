"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import Heatmap from "@/components/Heatmap";
import LoadingSpinner from "@/components/LoadingSpinner";
import { IndianRupee, Goal } from "lucide-react";
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
  planStats: { completed: number; active: number };
  dailyHours: { date: string; hours: number }[];
}

interface ExpenseData {
  totalAllTime: number;
  totalThisMonth: number;
  avgDailySpend: number;
  transactionCount: number;
  categoryBreakdown: { name: string; value: number }[];
  dailySpend: { date: string; amount: number }[];
  periodLabel: string;
  periodShortLabel: string;
  topCategories: { name: string; total: number; avgTransaction: number }[];
  largestTransaction: { amount: number; date: string; category: string } | null;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const EXPENSE_CATEGORY_COLORS: Record<string, string> = {
  "Food & Dining": "#dc2626",
  Transportation: "#2563eb",
  "Housing & Utilities": "#16a34a",
  Shopping: "#f97316",
  Entertainment: "#7c3aed",
  "Health & Fitness": "#0891b2",
  "Savings & Investments": "#ca8a04",
  Miscellaneous: "#475569",
};
const EXPENSE_FALLBACK_COLORS = [
  "#be123c",
  "#1d4ed8",
  "#15803d",
  "#c2410c",
  "#6d28d9",
  "#0e7490",
  "#a16207",
  "#334155",
  "#be185d",
  "#047857",
  "#4338ca",
  "#b45309",
];

const getExpenseCategoryColor = (category: string, index: number) =>
  EXPENSE_CATEGORY_COLORS[category] ||
  EXPENSE_FALLBACK_COLORS[index % EXPENSE_FALLBACK_COLORS.length];

const formatDateKey = (date: Date) =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [dashboardView, setDashboardView] = useState("expense");

  // Data states
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [rawExpenses, setRawExpenses] = useState<
    { amount: number; date: string; category: string }[]
  >([]);
  const [expenseViewMode, setExpenseViewMode] = useState<"monthly" | "yearly">(
    "monthly",
  );
  const [expenseMonth, setExpenseMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [analyticsRes, expensesRes, logsRes, plansRes] =
          await Promise.all([
            fetch("/api/analytics"),
            fetch("/api/expenses"),
            fetch("/api/logs"),
            fetch("/api/plans"),
          ]);

        const analyticsJson = await analyticsRes.json();
        const expensesJson = await expensesRes.json();
        const logsJson = await logsRes.json();
        const plansJson = await plansRes.json();

        // --- Process Upskill Data ---
        let totalSessions = 0;
        const dailyHoursMap: Record<string, number> = {};

        if (logsJson.success) {
          logsJson.data.forEach(
            (log: {
              date: string;
              sessions?: unknown[];
              actualMinutes?: number;
            }) => {
              if (log.sessions && log.sessions.length > 0) {
                totalSessions += log.sessions.length;
              } else if ((log.actualMinutes ?? 0) > 0) {
                totalSessions += 1;
              }
              dailyHoursMap[log.date] =
                (dailyHoursMap[log.date] || 0) + (log.actualMinutes || 0) / 60;
            },
          );
        }

        let completedPlans = 0;
        let activePlans = 0;
        if (plansJson.success) {
          plansJson.data.forEach((plan: { status: string }) => {
            if (plan.status === "completed") completedPlans++;
            if (plan.status === "active") activePlans++;
          });
        }

        const centeredDays = Array.from({ length: 15 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() + (i - 7));
          return formatDateKey(d);
        });
        const dailyHours = centeredDays.map((d) => ({
          date: d.substring(5),
          hours: Math.round((dailyHoursMap[d] || 0) * 10) / 10,
        }));

        if (analyticsJson.success) {
          setAnalytics({
            ...analyticsJson.data,
            totalSessions,
            planStats: { completed: completedPlans, active: activePlans },
            dailyHours,
          });
        }

        // --- Process Expense Data ---
        if (expensesJson.success) {
          setRawExpenses(expensesJson.data);
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
    const activeDateSet = new Set<string>();
    const selectedYear = expenseMonth.getFullYear();
    const selectedMonth = expenseMonth.getMonth();
    const currentMonth = [
      selectedYear,
      String(selectedMonth + 1).padStart(2, "0"),
    ].join("-");
    const currentYear = String(selectedYear);
    const periodLabel =
      expenseViewMode === "yearly"
        ? String(selectedYear)
        : MONTH_NAMES[selectedMonth] + " " + selectedYear;
    const periodShortLabel =
      expenseViewMode === "yearly"
        ? String(selectedYear)
        : MONTH_NAMES[selectedMonth].slice(0, 3);
    let largestTransaction: {
      amount: number;
      date: string;
      category: string;
    } | null = null;

    rawExpenses.forEach((e) => {
      totalAllTime += e.amount;
      const isInPeriod =
        expenseViewMode === "yearly"
          ? e.date.startsWith(currentYear)
          : e.date.startsWith(currentMonth);

      if (isInPeriod) {
        totalThisMonth += e.amount;
        const bucket =
          expenseViewMode === "yearly"
            ? MONTH_NAMES[Number(e.date.substring(5, 7)) - 1].slice(0, 3)
            : e.date.substring(8);
        dailySpendMap[bucket] = (dailySpendMap[bucket] || 0) + e.amount;
        activeDateSet.add(e.date);
        catMap[e.category] = (catMap[e.category] || 0) + e.amount;
        catCountMap[e.category] = (catCountMap[e.category] || 0) + 1;

        if (!largestTransaction || e.amount > largestTransaction.amount) {
          largestTransaction = e;
        }
      }
    });

    const categoryBreakdown = Object.entries(catMap).map(([name, value]) => ({
      name,
      value,
    }));
    const topCategories = [...categoryBreakdown]
      .sort((a, b) => b.value - a.value)
      .slice(0, 3)
      .map((cat) => ({
        name: cat.name,
        total: cat.value,
        avgTransaction: cat.value / (catCountMap[cat.name] || 1),
      }));

    const activeDays = activeDateSet.size;
    const avgDailySpend = activeDays > 0 ? totalThisMonth / activeDays : 0;
    const dailySpend = Object.entries(dailySpendMap)
      .sort()
      .map(([date, amount]) => ({ date, amount }));

    return {
      totalAllTime,
      totalThisMonth,
      avgDailySpend,
      transactionCount: rawExpenses.filter((e) =>
        expenseViewMode === "yearly"
          ? e.date.startsWith(String(expenseMonth.getFullYear()))
          : e.date.startsWith(currentMonth),
      ).length,
      categoryBreakdown,
      dailySpend,
      topCategories,
      largestTransaction,
      periodLabel,
      periodShortLabel,
    };
  }, [rawExpenses, expenseMonth, expenseViewMode]);

  if (loading) {
    return <LoadingSpinner message="Loading dashboards..." />;
  }

  const renderUpskillDashboard = () => {
    const hasUpskillData = analytics && (analytics.totalSessions > 0 || analytics.planStats.active > 0 || analytics.planStats.completed > 0 || analytics.totalHoursLogged > 0);

    if (!hasUpskillData) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] w-full pb-20">
          <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center animate-in fade-in zoom-in-95 duration-300 max-w-md w-full">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-5 border border-[#e4e4e7] shadow-sm">
              <Goal className="w-8 h-8 text-[#a1a1aa] stroke-2" />
            </div>
            <h3 className="text-xl font-black text-[#1e1e1e] tracking-tight">No Upskill Records</h3>
            <p className="text-[0.875rem] text-[#71717a] mt-2.5 font-medium leading-relaxed">
              Add upskill records to show analytics and track your learning progress.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6 animate-in fade-in duration-300 w-full box-border mt-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        <Card className="bg-white shadow-2xs border-[#e4e4e7]">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-[#71717a]">
              Total Hours Learned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-extrabold truncate">
              {analytics?.totalHoursLogged}{" "}
              <span className="text-sm font-normal text-[#71717a]">hrs</span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-2xs border-[#e4e4e7]">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-[#71717a]">
              Learning Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-extrabold truncate">
              {analytics?.currentStreak}{" "}
              <span className="text-sm font-normal text-[#71717a]">days</span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-2xs border-[#e4e4e7]">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-[#71717a]">
              Active Roadmaps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-extrabold truncate">
              {analytics?.activePlansCount}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-2xs border-[#e4e4e7]">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-[#71717a]">
              Total Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-extrabold truncate">
              {analytics?.totalSessions}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
        <Card className="p-4 sm:p-6 bg-white border-[#e4e4e7] shadow-2xs w-full min-w-0">
          <h3 className="text-sm font-bold mb-4">
            Study Hours (Today Centered)
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.dailyHours}>
                <XAxis
                  dataKey="date"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: "#f4f4f5" }}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e4e4e7",
                    fontWeight: "bold",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="hours" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4 sm:p-6 bg-white border-[#e4e4e7] shadow-2xs w-full min-w-0">
          <h3 className="text-sm font-bold mb-4">Roadmap Status</h3>
          <div className="h-64 flex items-center justify-center w-full">
            {analytics?.planStats.completed === 0 &&
            analytics?.planStats.active === 0 ? (
              <p className="text-[#71717a] text-sm">
                No active or completed roadmaps found.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      {
                        name: "Completed",
                        value: analytics?.planStats.completed || 0,
                      },
                      {
                        name: "Active",
                        value: analytics?.planStats.active || 0,
                      },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    <Cell fill="#40c463" />
                    <Cell fill="#2563eb" />
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e4e4e7",
                      fontWeight: "bold",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 mt-2 text-xs sm:text-sm font-bold">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#40c463]"></span>{" "}
              Completed ({analytics?.planStats.completed})
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#2563eb]"></span> Active
              ({analytics?.planStats.active})
            </div>
          </div>
        </Card>
      </div>

      <div className="w-full overflow-x-auto">
        <Heatmap data={analytics?.heatmapData || []} />
      </div>
    </div>
    );
  };

  const renderExpenseDashboard = () => {
    if (!rawExpenses || rawExpenses.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] w-full pb-20">
          <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center animate-in fade-in zoom-in-95 duration-300 max-w-md w-full">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-5 border border-[#e4e4e7] shadow-sm">
              <IndianRupee className="w-8 h-8 text-[#a1a1aa] stroke-2" />
            </div>
            <h3 className="text-xl font-black text-[#1e1e1e] tracking-tight">No Expense Records</h3>
            <p className="text-[0.875rem] text-[#71717a] mt-2.5 font-medium leading-relaxed">
              Add expense records to show analytics and track your spending.
            </p>
          </div>
        </div>
      );
    }

    const selectedExpenseYear = expenseMonth.getFullYear();
    const selectedExpenseMonth = expenseMonth.getMonth();
    const formattedMonth = expenses?.periodLabel || String(selectedExpenseYear);
    const formattedShortMonth =
      expenses?.periodShortLabel || String(selectedExpenseYear);

    return (
      <div className="space-y-6 animate-in fade-in duration-300 w-full box-border mt-4">
        {/* Fixed Filters Bar Container */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-2xs border border-[#e4e4e7] w-full min-w-0">
          <h2 className="text-base sm:text-lg font-bold text-[#1e1e1e]">
            Expense Tracker
          </h2>

          {/* Controls Container Stacked on Mobile, Auto Flex on Desktop */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
            <select
              value={expenseViewMode}
              onChange={(e) =>
                setExpenseViewMode(e.target.value as "monthly" | "yearly")
              }
              className="h-9 w-full sm:w-40 rounded-lg bg-[#f4f4f5] border border-[#e4e4e7] px-3 text-xs font-black text-[#1e1e1e] focus:outline-none cursor-pointer"
            >
              <option value="monthly">Monthly View</option>
              <option value="yearly">Yearly View</option>
            </select>

            <div className="flex flex-row items-center gap-2 w-full sm:w-auto">
              <select
                value={selectedExpenseYear}
                onChange={(e) =>
                  setExpenseMonth(
                    new Date(Number(e.target.value), selectedExpenseMonth, 1),
                  )
                }
                className="h-9 flex-1 sm:flex-none sm:w-28 rounded-lg bg-[#f4f4f5] border border-[#e4e4e7] px-3 text-xs font-black text-[#1e1e1e] focus:outline-none cursor-pointer"
              >
                {Array.from(
                  { length: 11 },
                  (_, index) => new Date().getFullYear() - index,
                ).map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>

              {expenseViewMode === "monthly" && (
                <select
                  value={selectedExpenseMonth}
                  onChange={(e) =>
                    setExpenseMonth(
                      new Date(selectedExpenseYear, Number(e.target.value), 1),
                    )
                  }
                  className="h-9 flex-1 sm:flex-none sm:w-32 rounded-lg bg-[#f4f4f5] border border-[#e4e4e7] px-3 text-xs font-black text-[#1e1e1e] focus:outline-none cursor-pointer"
                >
                  {MONTH_NAMES.map((name, index) => (
                    <option key={name} value={index}>
                      {name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Responsive Grid for Financial Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 w-full">
          <Card className="bg-white shadow-2xs border-[#e4e4e7]">
            <CardHeader className="pb-1 sm:pb-2">
              <CardTitle className="text-xs font-semibold text-[#71717a]">
                Total Expenses (All Time)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-extrabold truncate">
                ₹ {expenses?.totalAllTime.toLocaleString() || 0}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white shadow-2xs border-[#e4e4e7]">
            <CardHeader className="pb-1 sm:pb-2">
              <CardTitle className="text-xs font-semibold text-[#71717a]">
                {formattedShortMonth} Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-extrabold truncate">
                ₹ {expenses?.totalThisMonth.toLocaleString() || 0}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white shadow-2xs border-[#e4e4e7]">
            <CardHeader className="pb-1 sm:pb-2">
              <CardTitle className="text-xs font-semibold text-[#71717a]">
                Avg Spend ({formattedShortMonth})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-extrabold truncate">
                ₹ {Math.round(expenses?.avgDailySpend || 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white shadow-2xs border-[#e4e4e7]">
            <CardHeader className="pb-1 sm:pb-2">
              <CardTitle className="text-xs font-semibold text-[#71717a]">
                {formattedShortMonth} Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-extrabold truncate">
                {expenses?.transactionCount || 0}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white shadow-2xs border-[#e4e4e7] sm:col-span-2 lg:col-span-1">
            <CardHeader className="pb-1 sm:pb-2">
              <CardTitle className="text-xs font-semibold text-[#71717a]">
                Largest Transaction ({formattedShortMonth})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-extrabold truncate">
                ₹ {expenses?.largestTransaction?.amount.toLocaleString() || 0}
              </div>
              <div className="text-[0.6875rem] text-[#71717a] mt-0.5 truncate">
                {expenses?.largestTransaction?.category || "N/A"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts & Analytical Breaks Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
          <Card className="p-4 sm:p-6 bg-white border-[#e4e4e7] shadow-2xs w-full min-w-0">
            <h3 className="text-sm font-bold mb-4">
              Category Breakdown ({formattedMonth})
            </h3>
            <div className="h-64 w-full">
              {expenses?.categoryBreakdown.length === 0 ? (
                <div className="h-full flex items-center justify-center text-[#71717a] text-sm">
                  No expenses found.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenses?.categoryBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {expenses?.categoryBreakdown.map((entry, index) => (
                        <Cell
                          key={`cell-${entry.name}`}
                          fill={getExpenseCategoryColor(entry.name, index)}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: unknown) =>
                        `₹ ${Number(val).toLocaleString()}`
                      }
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid #e4e4e7",
                        fontWeight: "bold",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 mt-3 text-[0.6875rem] sm:text-xs font-bold">
              {expenses?.categoryBreakdown.map((entry, index) => (
                <div key={index} className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: getExpenseCategoryColor(
                        entry.name,
                        index,
                      ),
                    }}
                  ></span>
                  <span className="truncate max-w-[120px]">{entry.name}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4 sm:p-6 bg-white border-[#e4e4e7] shadow-2xs w-full min-w-0 overflow-hidden flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold mb-4">
                Top 3 Categories ({formattedMonth})
              </h3>
              <div className="flex flex-col gap-3">
                {expenses?.topCategories?.length === 0 ? (
                  <div className="py-12 flex items-center justify-center text-[#71717a] text-sm">
                    No expenses found.
                  </div>
                ) : (
                  expenses?.topCategories?.map((cat, i) => (
                    <div
                      key={i}
                      className="flex flex-col p-3 rounded-lg border border-[#e4e4e7] bg-[#fafafa] w-full"
                    >
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="font-bold text-[#1e1e1e] flex items-center gap-2 text-xs sm:text-sm truncate">
                          <span className="w-5 h-5 rounded-full bg-[#e4e4e7] flex items-center justify-center text-[0.625rem] font-bold shrink-0">
                            {i + 1}
                          </span>
                          <span className="truncate">{cat.name}</span>
                        </span>
                        <span className="font-bold text-[#3b82f6] text-xs sm:text-sm whitespace-nowrap">
                          ₹ {cat.total.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-[0.6875rem] text-[#71717a]">
                        <span>Avg per transaction:</span>
                        <span>
                          ₹ {Math.round(cat.avgTransaction).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-6 bg-white border-[#e4e4e7] shadow-2xs lg:col-span-2 w-full min-w-0">
            <h3 className="text-sm font-bold mb-4">
              {expenseViewMode === "yearly" ? "Monthly Spend" : "Daily Spend"} (
              {formattedMonth})
            </h3>
            <div className="h-64 w-full">
              {expenses?.dailySpend.length === 0 ? (
                <div className="h-full flex items-center justify-center text-[#71717a] text-sm">
                  No spend this month.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={expenses?.dailySpend}>
                    <XAxis
                      dataKey="date"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip
                      formatter={(val: unknown) =>
                        `₹ ${Number(val).toLocaleString()}`
                      }
                      cursor={{ fill: "#f4f4f5" }}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid #e4e4e7",
                        fontWeight: "bold",
                        fontSize: "12px",
                      }}
                    />
                    <Bar
                      dataKey="amount"
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 space-y-4 pb-12 font-sans box-border overflow-hidden">
      {/* Primary Global Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#e4e4e7] px-4 sm:px-6 py-4 rounded-xl shadow-2xs w-full min-w-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#1e1e1e] tracking-tight">
            Dashboard
          </h1>
        </div>

        {/* Replaced <Select> component with standard native element for proper <option> scaling */}
        <div className="w-full sm:w-64">
          <select
            value={dashboardView}
            onChange={(e) => setDashboardView(e.target.value)}
            className="h-9 w-full rounded-lg bg-[#f4f4f5] border border-[#e4e4e7] px-3 text-xs font-black text-[#1e1e1e] focus:outline-none cursor-pointer"
          >
            <option value="upskill">Upskill Dashboard</option>
            <option value="expense">Expense Dashboard</option>
          </select>
        </div>
      </div>

      {dashboardView === "upskill" && renderUpskillDashboard()}
      {dashboardView === "expense" && renderExpenseDashboard()}
    </div>
  );
}
