"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Clock8,
  CheckCircle2,
  Download,
  Share2,
} from "lucide-react";
import { exportCsv } from "@/lib/exportFile";
import { Share } from "@capacitor/share";

interface TimesheetEntry {
  _id: string;
  date: string; // YYYY-MM-DD
  projectTitle: string;
  description: string;
  hours: number;
  category: string;
}

export default function TimesheetPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [projectTitle, setProjectTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [exportSuccessDetails, setExportSuccessDetails] = useState<{ uri: string; filename: string; type: string } | null>(null);

  // Helper to format date string YYYY-MM-DD
  const formatDateStr = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const todayStr = formatDateStr(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    let isMounted = true;
    async function loadEntries() {
      try {
        setLoading(true);
        const res = await fetch("/api/timesheet");
        const data = await res.json();
        if (isMounted && data.success) {
          setEntries(data.data || []);
        }
      } catch (e) {
        console.error("Failed to fetch timesheet entries:", e);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadEntries();
    return () => {
      isMounted = false;
    };
  }, [year, month]);

  // Calendar generation logic
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  interface CalendarCell {
    isEmpty?: boolean;
    dateStr?: string;
    dayNum?: number | string;
    isCurrentMonth?: boolean;
  }

  const calendarCells: CalendarCell[] = [];

  // Empty placeholder cells for previous month leading days
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarCells.push({ isEmpty: true });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const currMonthDate = new Date(year, month, i);
    calendarCells.push({
      isEmpty: false,
      dateStr: formatDateStr(currMonthDate),
      dayNum: i,
      isCurrentMonth: true,
    });
  }

  // Empty placeholder cells to finish the last week row (if needed)
  const remainingCells = (7 - (calendarCells.length % 7)) % 7;
  for (let i = 0; i < remainingCells; i++) {
    calendarCells.push({ isEmpty: true });
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleDayClick = (dateStr: string) => {
    setSelectedDateStr(dateStr);
    setProjectTitle("");
    setDescription("");
  };

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDateStr || !projectTitle.trim() || !description.trim()) return;

    setSaving(true);
    try {
      const res = await fetch("/api/timesheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDateStr,
          projectTitle: projectTitle.trim(),
          description: description.trim(),
          hours: 0,
          category: "Work",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEntries((prev) => [data.data, ...prev]);
        setProjectTitle("");
        setDescription("");
      }
    } catch (e) {
      console.error("Error saving timesheet entry:", e);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    setEntries((prev) => prev.filter((item) => item._id !== id));
    try {
      await fetch(`/api/timesheet/${id}`, { method: "DELETE" });
    } catch (e) {
      console.error("Error deleting entry:", e);
    }
  };

  // Filter entries for selected modal date
  const selectedDateEntries = entries.filter((e) => e.date === selectedDateStr);
  const enteredDaysCount = new Set(entries.map((entry) => entry.date)).size;

  const monthNames = [
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

  const formatReadableDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleDownloadExcel = async () => {
    const header = ["Month", "Date", "Project Title", "Description"];
    const csvRows = [header.join(",")];

    const sortedEntries = [...entries].sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    sortedEntries.forEach((entry) => {
      const [y, m, d] = entry.date.split("-").map(Number);
      const dateObj = new Date(y, m - 1, d);
      const monthStr = dateObj.toLocaleDateString("en-US", { month: "long" });

      const escapeCsv = (str: string) => `"${str.replace(/"/g, '""')}"`;

      csvRows.push(
        [
          escapeCsv(monthStr),
          escapeCsv(entry.date),
          escapeCsv(entry.projectTitle),
          escapeCsv(entry.description),
        ].join(","),
      );
    });

    const csvString = csvRows.join("\n");
    const filename = `timesheet_${monthNames[month]}_${year}.csv`;
    const uri = await exportCsv(csvString, filename);

    if (uri) {
      setExportSuccessDetails({ uri, filename, type: "CSV" });
    }
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 space-y-4 pb-12 font-sans">
      {/* Header (Responsive Wrap) */}
      <div className="bg-white border border-[#e4e4e7] px-4 sm:px-6 py-4 rounded-xl shadow-2xs flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-center justify-between xl:justify-start gap-2.5 w-full xl:w-auto">
          <div className="flex items-center gap-2.5">
            <Clock8 className="w-5 h-5 sm:w-6 sm:h-6 text-[#1e1e1e]" />
            <h1 className="text-xl sm:text-2xl font-black text-[#1e1e1e] tracking-tight">
              Timesheet
            </h1>
          </div>
          <Badge className="bg-[#f4f4f5] text-[#1e1e1e] border-[#e4e4e7] font-extrabold text-xs px-2 sm:px-3 py-1">
            {enteredDaysCount} records
          </Badge>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 w-full xl:w-auto">
          {/* Month Navigator - Orders first on mobile */}
          <div className="flex items-center justify-between bg-[#f4f4f5] border border-[#e4e4e7] rounded-lg overflow-hidden w-full sm:w-auto order-first sm:order-0">
            <button
              onClick={handlePrevMonth}
              className="p-2.5 hover:bg-[#1e1e1e] hover:text-white text-[#1e1e1e] transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <span className="px-2 sm:px-3 font-black text-xs sm:text-sm min-w-[110px] sm:min-w-[130px] text-center text-[#1e1e1e]">
              {monthNames[month]} {year}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-2.5 hover:bg-[#1e1e1e] hover:text-white text-[#1e1e1e] transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex w-full sm:w-auto gap-2">
            <button
              onClick={handleDownloadExcel}
              className="flex-1 sm:flex-none justify-center px-4 py-2.5 rounded-lg bg-white border border-[#e4e4e7] hover:bg-[#f4f4f5] text-[#1e1e1e] font-extrabold text-xs transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
            <button
              onClick={handleToday}
              className="flex-1 sm:flex-none justify-center px-4 py-2.5 rounded-lg bg-[#1e1e1e] hover:bg-[#2c2c2c] text-white font-extrabold text-xs transition-all cursor-pointer shadow-xs"
            >
              Today
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid View */}
      <Card className="p-3 sm:p-4 md:p-5 bg-white border border-[#e4e4e7] rounded-xl sm:rounded-2xl shadow-2xs overflow-hidden">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="text-center font-black text-[10px] sm:text-xs uppercase tracking-wider text-[#71717a] py-1"
            >
              <span className="hidden sm:inline">{day}</span>
              <span className="sm:hidden">{day.charAt(0)}</span>
            </div>
          ))}
        </div>

        {/* Days Grid */}
        {loading ? (
          <div className="h-64 sm:h-96 flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="loading-spinner mx-auto" />
              <p className="text-sm font-bold text-[#71717a]">
                Loading records...
              </p>
            </div>
          </div>
        ) : (
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

              const dayEntries = entries.filter((e) => e.date === cell.dateStr);
              const isToday = cell.dateStr === todayStr;
              const isSelected = cell.dateStr === selectedDateStr;
              const hasLogs = dayEntries.length > 0;

              return (
                <div
                  key={idx}
                  onClick={() => cell.dateStr && handleDayClick(cell.dateStr)}
                  className={`min-h-[70px] sm:min-h-[100px] lg:min-h-[140px] p-1.5 sm:p-2 rounded-lg sm:rounded-xl border transition-all cursor-pointer flex flex-col group ${
                    isSelected
                      ? "bg-[#1e1e1e]/10 border-[#1e1e1e] ring-2 ring-[#1e1e1e] shadow-md z-10"
                      : !cell.isCurrentMonth
                        ? "bg-[#fafafa] border-[#f4f4f5] opacity-60 hover:opacity-90"
                        : isToday
                          ? "bg-[#1e1e1e]/5 border-[#1e1e1e]/40 ring-1 ring-[#1e1e1e]/40 shadow-xs"
                          : hasLogs
                            ? "bg-white border-[#d4d4d8] hover:border-[#1e1e1e] shadow-2xs hover:shadow-md"
                            : "bg-white border-[#e4e4e7] hover:border-[#1e1e1e] hover:bg-[#f4f4f5]/40"
                  }`}
                >
                  {/* Top Bar: Day Number & Indicator */}
                  <div className="flex flex-col xl:flex-row items-center xl:items-start justify-between gap-1 xl:gap-0">
                    <span
                      className={`text-xs sm:text-sm font-black w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-colors ${
                        isSelected || isToday
                          ? "bg-[#1e1e1e] text-white"
                          : cell.isCurrentMonth
                            ? "text-[#1e1e1e] group-hover:bg-[#1e1e1e] group-hover:text-white"
                            : "text-[#a1a1aa]"
                      }`}
                    >
                      {cell.dayNum}
                    </span>

                    {hasLogs && (
                      <>
                        {/* Desktop Badge */}
                        <span className="hidden xl:flex items-center gap-1 text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full shadow-2xs">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          {dayEntries.length} log
                          {dayEntries.length > 1 ? "s" : ""}
                        </span>
                        {/* Mobile/Tablet Dot Indicator */}
                        <span className="flex xl:hidden w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 shadow-sm mt-0.5 xl:mt-0" />
                      </>
                    )}
                  </div>

                  {/* Middle / Bottom: Log Snippets (Hidden on mobile) */}
                  <div className="mt-2 space-y-1 overflow-hidden flex-1 hidden md:block">
                    {dayEntries.slice(0, 3).map((entry) => (
                      <div
                        key={entry._id}
                        className="text-[11px] font-bold px-2 py-1 rounded bg-[#f4f4f5] border border-[#e4e4e7] text-[#1e1e1e] truncate flex items-center gap-1.5 group-hover:bg-white transition-colors"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                        <span className="truncate">{entry.projectTitle}</span>
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
        )}
      </Card>

      {/* Interactive Log Modal */}
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
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white border border-[#e4e4e7] hover:bg-[#1e1e1e] hover:text-white transition-colors cursor-pointer text-[#1e1e1e] font-black text-base sm:text-lg flex items-center justify-center shrink-0 self-start sm:self-auto"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-6 md:p-8 overflow-y-auto space-y-6 sm:space-y-8 flex-1">
              {/* Form to Add New Work Log */}
              <form
                onSubmit={handleSaveEntry}
                className="bg-[#f4f4f5]/70 p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl border border-[#e4e4e7] space-y-4 sm:space-y-6 shadow-2xs"
              >
                <div className="flex items-center justify-between sm:justify-end border-b border-[#e4e4e7] pb-3">
                  <span className="text-[10px] sm:text-xs font-bold text-[#71717a] uppercase sm:normal-case">
                    Logging for {formatReadableDate(selectedDateStr)}
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] sm:text-xs font-bold text-[#1e1e1e] uppercase tracking-wider">
                    Project Title <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. Client Portal Redesign..."
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                    required
                    className="bg-white border-[#e4e4e7] focus:border-[#1e1e1e] font-bold text-sm sm:text-base px-3 sm:px-4 py-5 sm:py-6 rounded-lg sm:rounded-xl w-full"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] sm:text-xs font-bold text-[#1e1e1e] uppercase tracking-wider">
                    Detailed Work Description{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={5}
                    placeholder="Describe specific achievements or tasks completed..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    className="w-full bg-white border border-[#e4e4e7] focus:outline-none focus:border-[#1e1e1e] font-medium text-xs sm:text-sm px-3 sm:px-4 py-3 rounded-lg sm:rounded-xl leading-relaxed resize-none transition-colors"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={
                      saving || !projectTitle.trim() || !description.trim()
                    }
                    className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3.5 rounded-lg sm:rounded-xl bg-[#1e1e1e] hover:bg-[#2c2c2c] disabled:opacity-40 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                  >
                    {saving ? "Saving..." : "+ Save Timesheet"}
                  </button>
                </div>
              </form>

              {/* Existing Entries List for Selected Date */}
              {selectedDateEntries.length > 0 && (
                <div className="space-y-3 sm:space-y-4">
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#71717a]">
                    Logged Activities ({selectedDateEntries.length})
                  </h3>

                  <div className="space-y-3">
                    {selectedDateEntries.map((entry) => (
                      <div
                        key={entry._id}
                        className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-[#e4e4e7] hover:border-[#1e1e1e] shadow-2xs transition-all space-y-3 relative group"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <Badge className="bg-blue-50 text-blue-800 border-blue-200 font-extrabold text-[10px] sm:text-xs px-2.5 sm:px-3 py-1">
                              {entry.projectTitle}
                            </Badge>
                          </div>

                          <button
                            onClick={() => handleDeleteEntry(entry._id)}
                            className="self-end sm:self-auto px-2.5 py-1 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-bold text-[#a1a1aa] hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Delete entry"
                          >
                            Delete
                          </button>
                        </div>

                        <p className="text-xs sm:text-sm font-medium text-[#1e1e1e] whitespace-pre-wrap leading-relaxed">
                          {entry.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Export Success Dialog */}
      {exportSuccessDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-300">
          <div className="bg-white border border-[#e4e4e7] rounded-3xl max-w-sm w-full p-6 sm:p-8 flex flex-col shadow-2xl animate-modal text-center items-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
              <Download className="w-6 h-6 text-emerald-600" />
            </div>
            <h2 className="text-xl font-black text-[#1e1e1e] mb-2">
              {exportSuccessDetails.type} exported successfully
            </h2>
            <p className="text-sm font-medium text-[#71717a] mb-6">
              Saved to:<br />
              <span className="font-bold text-[#1e1e1e]">Documents/{exportSuccessDetails.filename}</span>
            </p>
            <div className="flex flex-col sm:flex-row w-full gap-3">
              <button
                onClick={() => setExportSuccessDetails(null)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#f4f4f5] hover:bg-[#e4e4e7] text-[#1e1e1e] font-bold text-sm transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={async () => {
                  const details = exportSuccessDetails;
                  setExportSuccessDetails(null);
                  try {
                    await Share.share({
                      title: details.filename,
                      url: details.uri,
                    });
                  } catch (e) {
                    console.error("Error sharing file", e);
                  }
                }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#1e1e1e] hover:bg-[#2c2c2c] text-white font-bold text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                Share File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
