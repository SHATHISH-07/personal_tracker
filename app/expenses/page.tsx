"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { IndianRupee, Download } from "lucide-react";
import * as XLSX from "xlsx";

interface ExpenseEntry {
  _id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
}

interface CalendarCell {
  isEmpty?: boolean;
  dateStr?: string;
  dayNum?: number;
  isCurrentMonth?: boolean;
}

const EXPENSE_CATEGORIES = [
  "Food & Dining",
  "Transportation",
  "Housing & Utilities",
  "Shopping",
  "Entertainment",
  "Health & Fitness",
  "Savings & Investments",
  "Miscellaneous",
];

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

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const formatDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return [y, m, day].join("-");
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount);

const classNames = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

export default function ExpensesPage() {
  const today = useMemo(() => new Date(), []);
  const [viewMode, setViewMode] = useState<"monthly" | "yearly">("monthly");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [entries, setEntries] = useState<ExpenseEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [saving, setSaving] = useState(false);

  const todayStr = formatDateStr(today);
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    let isMounted = true;
    async function loadEntries() {
      try {
        setLoading(true);
        const res = await fetch("/api/expenses");
        const data = await res.json();
        if (isMounted && data.success) {
          setEntries(data.data || []);
        }
      } catch (e) {
        console.error("Failed to fetch expense entries:", e);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadEntries();
    return () => {
      isMounted = false;
    };
  }, []);

  const yearOptions = useMemo(() => {
    const years = new Set<number>([today.getFullYear(), year]);
    for (let y = today.getFullYear() - 10; y <= today.getFullYear(); y++) {
      years.add(y);
    }
    entries.forEach((entry) => {
      const parsedYear = Number(entry.date.slice(0, 4));
      if (!Number.isNaN(parsedYear)) years.add(parsedYear);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [entries, today, year]);

  const calendarCells = useMemo<CalendarCell[]>(() => {
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: CalendarCell[] = [];

    for (let i = 0; i < firstDayOfMonth; i++) {
      cells.push({ isEmpty: true });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const currMonthDate = new Date(year, month, i);
      cells.push({
        isEmpty: false,
        dateStr: formatDateStr(currMonthDate),
        dayNum: i,
        isCurrentMonth: true,
      });
    }

    const remainingCells = (7 - (cells.length % 7)) % 7;
    for (let i = 0; i < remainingCells; i++) {
      cells.push({ isEmpty: true });
    }

    return cells;
  }, [month, year]);

  const visibleEntries = useMemo(() => {
    const yearPrefix = String(year);
    const monthPrefix = yearPrefix + "-" + String(month + 1).padStart(2, "0");
    return entries.filter((entry) =>
      viewMode === "yearly"
        ? entry.date.startsWith(yearPrefix)
        : entry.date.startsWith(monthPrefix),
    );
  }, [entries, month, viewMode, year]);

  const yearlySummaries = useMemo(() => {
    return MONTH_NAMES.map((name, index) => {
      const prefix = String(year) + "-" + String(index + 1).padStart(2, "0");
      const monthEntries = entries.filter((entry) => entry.date.startsWith(prefix));
      const total = monthEntries.reduce((sum, entry) => sum + entry.amount, 0);
      const categories = new Set(monthEntries.map((entry) => entry.category)).size;
      return {
        name,
        index,
        total,
        transactions: monthEntries.length,
        categories,
      };
    });
  }, [entries, year]);

  const periodStats = useMemo(() => {
    const total = visibleEntries.reduce((sum, entry) => sum + entry.amount, 0);
    const transactionCount = visibleEntries.length;
    const activeDays = new Set(visibleEntries.map((entry) => entry.date)).size;
    const largest = visibleEntries.reduce<ExpenseEntry | null>(
      (current, entry) => (!current || entry.amount > current.amount ? entry : current),
      null,
    );
    return {
      total,
      transactionCount,
      activeDays,
      largest,
      averageDailySpend: activeDays > 0 ? total / activeDays : 0,
    };
  }, [visibleEntries]);

  const selectedDateEntries = entries.filter((e) => e.date === selectedDateStr);

  const handleToday = () => {
    setCurrentDate(new Date());
    setViewMode("monthly");
  };

  const handleDayClick = (dateStr: string) => {
    setSelectedDateStr(dateStr);
    setCategory(EXPENSE_CATEGORIES[0]);
    setDescription("");
    setAmount("");
  };

  const handleMonthSummaryClick = (monthIndex: number) => {
    setCurrentDate(new Date(year, monthIndex, 1));
    setViewMode("monthly");
  };

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDateStr || !category || !description.trim() || amount === "") return;

    setSaving(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDateStr,
          category,
          description: description.trim(),
          amount: Number(amount),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEntries((prev) => [data.data, ...prev]);
        setDescription("");
        setAmount("");
      }
    } catch (e) {
      console.error("Error saving expense entry:", e);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    setEntries((prev) => prev.filter((item) => item._id !== id));
    try {
      await fetch("/api/expenses/" + id, { method: "DELETE" });
    } catch (e) {
      console.error("Error deleting entry:", e);
    }
  };

  const handleDownloadExcel = () => {
    const sortedEntries = [...visibleEntries].sort((a, b) => a.date.localeCompare(b.date));
    const exportData: Array<Record<string, string | number>> = sortedEntries.map((entry) => {
      const parts = entry.date.split("-").map(Number);
      const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
      return {
        Month: dateObj.toLocaleDateString("en-US", { month: "long" }),
        Date: entry.date,
        Category: entry.category,
        Description: entry.description,
        Amount: entry.amount,
      };
    });

    if (exportData.length === 0) {
      exportData.push({
        Month: "",
        Date: "",
        Category: "",
        Description: "No expenses recorded.",
        Amount: 0,
      });
    }

    const ws = XLSX.utils.json_to_sheet(exportData);
    ws["!cols"] = [{ wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 45 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Expenses");
    const suffix = viewMode === "yearly" ? String(year) : MONTH_NAMES[month] + "_" + year;
    XLSX.writeFile(wb, "expenses_" + suffix + ".xlsx");
  };

  const formatReadableDate = (dateStr: string) => {
    const parts = dateStr.split("-").map(Number);
    const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
    return dateObj.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-8 space-y-4 pb-12 font-sans">
      <div className="bg-white border border-[#e4e4e7] px-6 py-4 rounded-xl shadow-2xs flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <IndianRupee className="w-6 h-6 text-[#1e1e1e]" />
          <h1 className="text-2xl font-black text-[#1e1e1e] tracking-tight">
            Expense Tracker
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start xl:self-auto">
          <button
            onClick={handleDownloadExcel}
            className="px-3.5 py-2 rounded-lg bg-white border border-[#e4e4e7] hover:bg-[#f4f4f5] text-[#1e1e1e] font-extrabold text-xs transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
            title="Export as Excel"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
          <button
            onClick={handleToday}
            className="px-3.5 py-2 rounded-lg bg-[#1e1e1e] hover:bg-[#2c2c2c] text-white font-extrabold text-xs transition-all cursor-pointer shadow-xs"
          >
            Today
          </button>
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as "monthly" | "yearly")}
            className="h-9 rounded-lg bg-[#f4f4f5] border border-[#e4e4e7] px-3 text-xs font-black text-[#1e1e1e] focus:outline-none"
          >
            <option value="monthly">Monthly View</option>
            <option value="yearly">Yearly View</option>
          </select>
          <select
            value={year}
            onChange={(e) => setCurrentDate(new Date(Number(e.target.value), month, 1))}
            className="h-9 rounded-lg bg-[#f4f4f5] border border-[#e4e4e7] px-3 text-xs font-black text-[#1e1e1e] focus:outline-none"
          >
            {yearOptions.map((optionYear) => (
              <option key={optionYear} value={optionYear}>
                {optionYear}
              </option>
            ))}
          </select>
          {viewMode === "monthly" && (
            <select
              value={month}
              onChange={(e) => setCurrentDate(new Date(year, Number(e.target.value), 1))}
              className="h-9 rounded-lg bg-[#f4f4f5] border border-[#e4e4e7] px-3 text-xs font-black text-[#1e1e1e] focus:outline-none"
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


      <Card className="p-4 md:p-5 bg-white border border-[#e4e4e7] rounded-2xl shadow-2xs overflow-hidden">
        {loading ? (
          <div className="h-96 flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="loading-spinner mx-auto" />
              <p className="text-sm font-bold text-[#71717a]">Loading expense records...</p>
            </div>
          </div>
        ) : viewMode === "yearly" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {yearlySummaries.map((summary) => (
              <button
                key={summary.name}
                onClick={() => handleMonthSummaryClick(summary.index)}
                className="text-left p-4 rounded-xl border border-[#e4e4e7] bg-white hover:border-[#1e1e1e] hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-black text-[#1e1e1e]">{summary.name}</div>
                    <div className="text-xs font-bold text-[#71717a] mt-1">
                      {summary.transactions} transactions
                    </div>
                  </div>
                  <Badge className="bg-[#f4f4f5] text-[#1e1e1e] border-[#e4e4e7] font-black text-[10px]">
                    {summary.categories} cats
                  </Badge>
                </div>
                <div className="text-2xl font-extrabold text-[#1e1e1e] mt-5">
                  {formatCurrency(summary.total)}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-7 gap-2 mb-2">
              {WEEKDAY_LABELS.map((day) => (
                <div
                  key={day}
                  className="text-center font-black text-xs uppercase tracking-wider text-[#71717a] py-1"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {calendarCells.map((cell, idx) => {
                if (cell.isEmpty || !cell.dateStr) {
                  return (
                    <div
                      key={idx}
                      className="min-h-[140px] p-2 rounded-xl bg-[#fafafa]/30 border border-[#f4f4f5] opacity-20 pointer-events-none"
                    />
                  );
                }

                const dayEntries = entries.filter((e) => e.date === cell.dateStr);
                const isToday = cell.dateStr === todayStr;
                const isSelected = cell.dateStr === selectedDateStr;
                const hasLogs = dayEntries.length > 0;
                const dayTotal = dayEntries.reduce((acc, curr) => acc + curr.amount, 0);

                return (
                  <div
                    key={idx}
                    onClick={() => cell.dateStr && handleDayClick(cell.dateStr)}
                    className={classNames(
                      "min-h-[140px] p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between group",
                      isSelected && "bg-[#1e1e1e]/10 border-[#1e1e1e] ring-2 ring-[#1e1e1e] shadow-md",
                      !isSelected && isToday && "bg-[#1e1e1e]/5 border-[#1e1e1e]/40 ring-1 ring-[#1e1e1e]/40 shadow-xs",
                      !isSelected && !isToday && hasLogs && "bg-white border-[#d4d4d8] hover:border-[#1e1e1e] shadow-2xs hover:shadow-md",
                      !isSelected && !isToday && !hasLogs && "bg-white border-[#e4e4e7] hover:border-[#1e1e1e] hover:bg-[#f4f4f5]/40",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={classNames(
                          "text-sm font-black w-7 h-7 rounded-full flex items-center justify-center transition-colors",
                          (isSelected || isToday) && "bg-[#1e1e1e] text-white",
                          !isSelected && !isToday && "text-[#1e1e1e] group-hover:bg-[#1e1e1e] group-hover:text-white",
                        )}
                      >
                        {cell.dayNum}
                      </span>

                      {hasLogs && (
                        <span className="flex items-center gap-1 text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded-full shadow-2xs">
                          {formatCurrency(dayTotal)}
                        </span>
                      )}
                    </div>

                    <div className="mt-2 space-y-1 overflow-hidden flex-1">
                      {dayEntries.slice(0, 3).map((entry) => (
                        <div
                          key={entry._id}
                          className="text-[11px] font-bold px-2 py-1 rounded bg-[#f4f4f5] border border-[#e4e4e7] text-[#1e1e1e] truncate flex items-center justify-between gap-1.5 group-hover:bg-white transition-colors"
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                            <span className="truncate">{entry.description}</span>
                          </div>
                        </div>
                      ))}
                      {dayEntries.length > 3 && (
                        <div className="text-[10px] font-extrabold text-[#71717a] text-center pt-0.5">
                          +{dayEntries.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>

      {selectedDateStr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div
            className="bg-white border border-[#e4e4e7] rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 md:p-8 bg-[#f4f4f5] border-b border-[#e4e4e7] flex items-center justify-between">
              <div className="flex items-center gap-3 flex-wrap">
                <Badge className="bg-[#1e1e1e] text-white border-[#1e1e1e] font-mono text-xs px-3 py-1.5 shadow-xs">
                  {selectedDateStr}
                </Badge>
                <h2 className="text-2xl md:text-3xl font-black text-[#1e1e1e]">
                  {formatReadableDate(selectedDateStr)}
                </h2>
              </div>
              <button
                onClick={() => setSelectedDateStr(null)}
                className="w-9 h-9 rounded-full bg-white border border-[#e4e4e7] hover:bg-[#1e1e1e] hover:text-white transition-colors cursor-pointer text-[#1e1e1e] font-black text-lg flex items-center justify-center shrink-0"
              >
                x
              </button>
            </div>

            <div className="p-6 md:p-8 overflow-y-auto space-y-8 flex-1">
              <form
                onSubmit={handleSaveEntry}
                className="bg-[#f4f4f5]/70 p-6 md:p-8 rounded-2xl border border-[#e4e4e7] space-y-6 shadow-2xs"
              >
                <div className="flex items-center justify-end border-b border-[#e4e4e7] pb-3">
                  <span className="text-xs font-bold text-[#71717a]">
                    Logging expense for {formatReadableDate(selectedDateStr)}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#1e1e1e] uppercase tracking-wider">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      required
                      className="w-full bg-white border border-[#e4e4e7] focus:outline-none focus:border-[#1e1e1e] font-medium text-sm px-4 py-3 rounded-xl transition-colors"
                    >
                      {EXPENSE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#1e1e1e] uppercase tracking-wider">
                      Amount <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <IndianRupee className="w-4 h-4 text-[#71717a]" />
                      </div>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : "")}
                        step="0.01"
                        min="0"
                        required
                        className="bg-white border-[#e4e4e7] focus:border-[#1e1e1e] font-bold text-base pl-8 pr-4 py-6 rounded-xl w-full"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#1e1e1e] uppercase tracking-wider">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. Groceries, Uber to work, Monthly internet bill..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    className="bg-white border-[#e4e4e7] focus:border-[#1e1e1e] font-bold text-base px-4 py-6 rounded-xl w-full"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={saving || !description.trim() || amount === ""}
                    className="px-8 py-3.5 rounded-xl bg-[#1e1e1e] hover:bg-[#2c2c2c] disabled:opacity-40 text-white font-extrabold text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                  >
                    {saving ? "Saving..." : "+ Save Expense"}
                  </button>
                </div>
              </form>

              {selectedDateEntries.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-[#e4e4e7] pb-2">
                    <h3 className="text-sm font-black uppercase tracking-wider text-[#71717a]">
                      Logged Expenses ({selectedDateEntries.length})
                    </h3>
                    <div className="text-sm font-black text-rose-600">
                      Total: {formatCurrency(selectedDateEntries.reduce((acc, curr) => acc + curr.amount, 0))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {selectedDateEntries.map((entry) => (
                      <div
                        key={entry._id}
                        className="p-5 rounded-2xl bg-white border border-[#e4e4e7] hover:border-[#1e1e1e] shadow-2xs transition-all flex items-center justify-between group"
                      >
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <Badge className="bg-rose-50 text-rose-800 border-rose-200 font-extrabold text-xs px-3 py-1">
                              {entry.category}
                            </Badge>
                            <span className="text-lg font-black text-[#1e1e1e]">
                              {formatCurrency(entry.amount)}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-[#71717a]">{entry.description}</p>
                        </div>

                        <button
                          onClick={() => handleDeleteEntry(entry._id)}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold text-[#a1a1aa] hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          title="Delete entry"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
