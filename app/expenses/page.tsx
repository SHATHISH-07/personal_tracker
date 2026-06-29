"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { IndianRupee, Download, X, Plus, Trash2 } from "lucide-react";
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
    maximumFractionDigits: 0,
  }).format(amount);

const classNames = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

export default function ExpensesPage() {
  const today = useMemo(() => new Date(), []);

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
    return entries.filter((entry) => entry.date.startsWith(monthPrefix));
  }, [entries, month, year]);

  const selectedDateEntries = entries.filter((e) => e.date === selectedDateStr);

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleDayClick = (dateStr: string) => {
    setSelectedDateStr(dateStr);
    setCategory(EXPENSE_CATEGORIES[0]);
    setDescription("");
    setAmount("");
  };

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDateStr || !category || !description.trim() || amount === "")
      return;

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
    const sortedEntries = [...visibleEntries].sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    const exportData: Array<Record<string, string | number>> =
      sortedEntries.map((entry) => {
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
    ws["!cols"] = [
      { wch: 15 },
      { wch: 15 },
      { wch: 25 },
      { wch: 45 },
      { wch: 12 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Expenses");
    const suffix = MONTH_NAMES[month] + "_" + year;
    XLSX.writeFile(wb, "expenses_" + suffix + ".xlsx");
  };

  const formatReadableDate = (dateStr: string) => {
    const parts = dateStr.split("-").map(Number);
    const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
    return dateObj.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 space-y-4 pb-12 font-sans antialiased text-[#1e1e1e]">
      {/* Top Header Panel */}
      <div className="bg-white border border-[#e4e4e7] px-4 sm:px-6 py-4 rounded-xl shadow-2xs flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-center justify-between xl:justify-start gap-2.5 w-full xl:w-auto">
          <div className="flex items-center gap-2.5">
            <div className="bg-[#f4f4f5] p-2 rounded-lg">
              <IndianRupee className="w-5 h-5 sm:w-6 sm:h-6 text-[#1e1e1e]" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[#1e1e1e] tracking-tight">
              Expense Tracker
            </h1>
          </div>
          <Badge className="bg-[#f4f4f5] text-[#1e1e1e] border-[#e4e4e7] font-extrabold text-xs px-2 sm:px-3 py-1">
            {entries.length} records
          </Badge>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 w-full xl:w-auto">
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center w-full sm:w-auto order-first sm:order-0">
            <select
              value={year}
              onChange={(e) =>
                setCurrentDate(new Date(Number(e.target.value), month, 1))
              }
              className="h-9 rounded-lg bg-[#f4f4f5] border border-[#e4e4e7] px-3 text-xs font-black focus:outline-none focus:ring-1 focus:ring-[#1e1e1e] cursor-pointer w-full"
            >
              {yearOptions.map((optionYear) => (
                <option key={optionYear} value={optionYear}>
                  {optionYear}
                </option>
              ))}
            </select>
            <select
              value={month}
              onChange={(e) =>
                setCurrentDate(new Date(year, Number(e.target.value), 1))
              }
              className="h-9 rounded-lg bg-[#f4f4f5] border border-[#e4e4e7] px-3 text-xs font-black focus:outline-none focus:ring-1 focus:ring-[#1e1e1e] cursor-pointer w-full"
            >
              {MONTH_NAMES.map((name, index) => (
                <option key={name} value={index}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center w-full sm:w-auto">
            <button
              onClick={handleDownloadExcel}
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-white border border-[#e4e4e7] hover:bg-[#f4f4f5] font-bold text-xs transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
            <button
              onClick={handleToday}
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-[#1e1e1e] hover:bg-[#2c2c2c] text-white font-bold text-xs transition-colors cursor-pointer shadow-xs flex items-center justify-center"
            >
              Today
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <Card className="p-2 sm:p-4 bg-white border border-[#e4e4e7] rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="h-64 sm:h-96 flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#1e1e1e] border-t-transparent mx-auto" />
              <p className="text-xs font-bold text-[#71717a]">
                Loading expense records...
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {WEEKDAY_LABELS.map((day) => (
                <div
                  key={day}
                  className="text-center font-black text-[10px] sm:text-xs uppercase tracking-wider text-[#71717a] py-1"
                >
                  <span>{day}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {calendarCells.map((cell, idx) => {
                if (cell.isEmpty || !cell.dateStr) {
                  return (
                    <div
                      key={idx}
                      className="min-h-[70px] sm:min-h-[100px] lg:min-h-[140px] p-1 sm:p-2 rounded-lg sm:rounded-xl bg-[#fafafa]/30 border border-[#f4f4f5] opacity-20 pointer-events-none"
                    />
                  );
                }

                const dayEntries = entries.filter(
                  (e) => e.date === cell.dateStr,
                );
                const isToday = cell.dateStr === todayStr;
                const isSelected = cell.dateStr === selectedDateStr;
                const hasLogs = dayEntries.length > 0;
                const dayTotal = dayEntries.reduce(
                  (acc, curr) => acc + curr.amount,
                  0,
                );

                return (
                  <div
                    key={idx}
                    onClick={() => cell.dateStr && handleDayClick(cell.dateStr)}
                    className={classNames(
                      "min-h-[70px] sm:min-h-[100px] lg:min-h-[140px] p-1.5 sm:p-2 rounded-lg sm:rounded-xl border transition-all cursor-pointer flex flex-col group",
                      isSelected &&
                        "bg-[#1e1e1e]/10 border-[#1e1e1e] ring-2 ring-[#1e1e1e] shadow-md z-10",
                      !isSelected &&
                        isToday &&
                        "bg-[#1e1e1e]/5 border-[#1e1e1e]/40 ring-1 ring-[#1e1e1e]/40 shadow-xs",
                      !isSelected &&
                        !isToday &&
                        hasLogs &&
                        "bg-white border-[#d4d4d8] hover:border-[#1e1e1e] shadow-2xs hover:shadow-md",
                      !isSelected &&
                        !isToday &&
                        !hasLogs &&
                        "bg-white border-[#e4e4e7] hover:border-[#1e1e1e] hover:bg-[#f4f4f5]/40",
                    )}
                  >
                    {/* Top Bar: Day Number & Indicator */}
                    <div className="flex flex-col xl:flex-row items-center xl:items-start justify-between gap-1 xl:gap-0 w-full">
                      <span
                        className={classNames(
                          "text-xs sm:text-sm font-black w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-colors shrink-0",
                          (isSelected || isToday) && "bg-[#1e1e1e] text-white",
                          !isSelected &&
                            !isToday &&
                            "text-[#1e1e1e] group-hover:bg-[#1e1e1e] group-hover:text-white",
                        )}
                      >
                        {cell.dayNum}
                      </span>

                      {hasLogs && (
                        <>
                          {/* Desktop Badge */}
                          <span className="hidden xl:flex items-center text-[10px] font-black bg-rose-50 text-rose-800 border border-rose-300 px-2 py-0.5 rounded-full shadow-2xs truncate max-w-full">
                            {formatCurrency(dayTotal)}
                          </span>
                          {/* Mobile/Tablet Dot Indicator */}
                          <span className="flex xl:hidden w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-rose-500 shadow-sm mt-0.5 xl:mt-0" />
                        </>
                      )}
                    </div>

                    {/* Middle / Bottom: Log Snippets (Hidden on mobile) */}
                    <div className="mt-2 space-y-1 overflow-hidden flex-1 hidden md:block w-full">
                      {dayEntries.slice(0, 3).map((entry) => (
                        <div
                          key={entry._id}
                          className="text-[11px] font-bold px-2 py-1 rounded bg-[#f4f4f5] border border-[#e4e4e7] text-[#1e1e1e] truncate flex items-center gap-1.5 group-hover:bg-white transition-colors"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                          <span className="truncate">{entry.description}</span>
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

      {/* Modal Dialog for Expense Logging & Details */}
      {selectedDateStr && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs sm:p-4 animate-in fade-in duration-300"
          onClick={() => setSelectedDateStr(null)}
        >
          <div
            className="bg-white border border-[#e4e4e7] rounded-t-3xl sm:rounded-3xl max-w-4xl w-full max-h-[calc(100dvh-2rem)] flex flex-col shadow-2xl overflow-hidden animate-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-6 md:p-8 bg-[#f4f4f5] border-b border-[#e4e4e7] flex items-center justify-between sticky top-0 z-10">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <Badge className="bg-[#1e1e1e] text-white border-[#1e1e1e] font-mono text-[10px] sm:text-xs px-2.5 py-1 shadow-xs w-fit">
                  {selectedDateStr}
                </Badge>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-[#1e1e1e]">
                  {formatReadableDate(selectedDateStr)}
                </h2>
              </div>
              <button
                onClick={() => setSelectedDateStr(null)}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white border border-[#e4e4e7] hover:bg-[#1e1e1e] hover:text-white transition-colors cursor-pointer text-[#1e1e1e] flex items-center justify-center shrink-0 self-start sm:self-auto"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Container */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
              {/* Add Expense Entry Form */}
              <form
                onSubmit={handleSaveEntry}
                className="bg-[#fafafa] p-4 rounded-xl border border-[#e4e4e7] space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-[#71717a] uppercase tracking-wider">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      required
                      className="w-full bg-white border border-[#e4e4e7] focus:outline-none focus:border-[#1e1e1e] font-medium text-sm px-3 py-2 rounded-lg transition-colors cursor-pointer h-10"
                    >
                      {EXPENSE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-[#71717a] uppercase tracking-wider">
                      Amount
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <IndianRupee className="w-3.5 h-3.5 text-[#71717a]" />
                      </div>
                      <Input
                        type="number"
                        placeholder="0"
                        value={amount}
                        onChange={(e) =>
                          setAmount(
                            e.target.value ? Number(e.target.value) : "",
                          )
                        }
                        step="0.01"
                        min="0"
                        required
                        className="bg-white border-[#e4e4e7] focus-visible:ring-1 focus-visible:ring-[#1e1e1e] font-bold text-sm pl-8 pr-3 h-10 rounded-lg w-full shadow-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-[#71717a] uppercase tracking-wider">
                    Description
                  </label>
                  <Input
                    type="text"
                    placeholder="Groceries, food, travel, etc."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    className="bg-white border-[#e4e4e7] focus-visible:ring-1 focus-visible:ring-[#1e1e1e] font-medium text-sm px-3 h-10 rounded-lg w-full shadow-none"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={saving || !description.trim() || amount === ""}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-[#1e1e1e] hover:bg-[#2c2c2c] disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {saving ? "Saving..." : "Save Expense"}
                  </button>
                </div>
              </form>

              {/* Logged List Panel */}
              {selectedDateEntries.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-[#e4e4e7] pb-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#71717a]">
                      Entries ({selectedDateEntries.length})
                    </h3>
                    <div className="text-xs font-black text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded">
                      Total:{" "}
                      {formatCurrency(
                        selectedDateEntries.reduce(
                          (acc, curr) => acc + curr.amount,
                          0,
                        ),
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                    {selectedDateEntries.map((entry) => (
                      <div
                        key={entry._id}
                        className="p-3 rounded-lg bg-white border border-[#e4e4e7] hover:border-[#1e1e1e] flex items-center justify-between gap-3 transition-colors group"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className="bg-rose-50 text-rose-700 border-rose-100 font-bold text-[10px] px-2 py-0 shadow-none hover:bg-rose-50">
                              {entry.category}
                            </Badge>
                            <span className="text-sm font-black text-[#1e1e1e]">
                              {formatCurrency(entry.amount)}
                            </span>
                          </div>
                          <p className="text-xs font-medium text-[#71717a] truncate">
                            {entry.description}
                          </p>
                        </div>

                        <button
                          onClick={() => handleDeleteEntry(entry._id)}
                          className="p-2 rounded-lg text-[#a1a1aa] hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                          title="Delete entry"
                        >
                          <Trash2 className="w-4 h-4" />
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
